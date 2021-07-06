const fs = require('fs')
const {DOMParser} = require('linkedom')
const {performance} = require('perf_hooks')
/**
 * @description путь для сохранения временного файла xml->json(удаляется после перемывки)
 */
const TEMP_PATH = 'export_entities2json.json'
/**
 * @description умолчательное название файла результата
 */
const DEFAULT_RESULT_NAME = 'confluence_export2sql'
/**
 * @description умолчательный путь к исходникам, полученным из Конфлюэнса
 */
const DEFAULT_INPUT = './src_xml'
/**
* @async 
* @description получить по заданному пути xml и вернуть готовый к парсингу объект
*/
const getXML = function(path) { return new Promise((resolve, reject) => {
	fs.readFile(
		path, 'utf8',
		(err, data) => {
			if(err) {
				reject(err)
			} else {
				const docXML = (new DOMParser()).parseFromString(data, {contentType: 'text/xml'})
				resolve(docXML)
			}
		}
	)
})}
/**
 * @async
 * @description получить список исходников, готовых к перемывке
 * @param {String} path 
 * @returns {Promise}
 */
 const getSrcList = function(path) {
	return new Promise((resolve, reject) => {
		fs.readdir(path, (err, content) => {
			if(err) {
				console.log(`error occured while retrieveing src list\n${err}`)
				reject(err)
			} else {
				const xmlSrc = content.filter(item => /[\-+_а-я\w\d\s\.]\.xml$/.test(item))
				console.log(`src list acquired:\n${xmlSrc.map(item => '\t -' + item).join(';\n')}\n============================\n`)
				resolve(xmlSrc)
			}
		})
	})
}
/**
 * @async
 * @description  по списку адресов xml-исходников извлечь содержимое каждого из них, преобразовать и вернуть дерево элементов 
 * @param {Array.<String>} xmlList массив с именами исходников-xml 
 * @returns {Object} набор точек входа для xml-деревьев
 */
const asyncXmlCombiner = async function*(xmlList) {
	const nItems = xmlList.length
	console.log(`total: ${nItems} source XMLs;\n`, )
	for(let i = 0; i < nItems; i++) {
		const srcItem = xmlList[i]
		const xmlItem = await getXML(`./src_xml/${srcItem}`)
		yield xmlItem
	}
	console.log('data acquisition finished;\n============================\n')
	return true
}

const extractEntities = function(root) {
	const {
		selectSpace,
		selectPages,
		selectBlogs,
		selectUsers,
		selectTags,
		selectTags2Content,
		selectComments,
		selectAtachedFiles
	} = require('./modules/extraction.js')

	const Page = require('./modules/page.js')
	const Comment = require('./modules/comments.js')

	const spaceTrees = root.querySelectorAll('hibernate-generic')
	const nSpaces = spaceTrees.length
	const userList = selectUsers(root)
	const tags = selectTags(root)
	const contentList = root.querySelectorAll('object[class="BodyContent"]')

	const parsedPages = []
	const pagename2ids = {}
	const spaceList = []
	const attachments = []

	for(let i = 0; i < nSpaces; i++) {
		const currentSpace = spaceTrees[i]
		const spaceId = i + 1
		const pages = selectPages(currentSpace)
		const blogs = selectBlogs(currentSpace)
		attachments.push(selectAtachedFiles(currentSpace)) 
		spaceList.push({...selectSpace(currentSpace), id: spaceId})

		const nPages = pages.length
		const nBlogs = blogs.length
		const nPagesTotal = nPages + nBlogs

		for(let j = 0; j < nPagesTotal; j++) {
			const pageStruct = j < nPages ?
				Page.TreePage(contentList, userList, pages[j], spaceId) :
				Page.BlogPage(contentList, userList, blogs[j - nPages], spaceId)

			pagename2ids[pageStruct.name] = pageStruct.id	
			parsedPages.push(pageStruct)
		}

		pages.length = 0
		blogs.length = 0
		console.log(`\t-pages extracted from space ${spaceId}; ${nPagesTotal} pages total;\n`)
	}
	
	const tags2Content = selectTags2Content(tags, root)
		.filter(tag2content => parsedPages.some(page => page.id === tag2content.page_id ))

	const comments = selectComments(root)

	const parsedTags = tags.map(tag => ({id: tag.id, name: tag.name}))
	const parsedComments = comments.map(comment => Comment.createComment(userList, contentList, comment))

	root = null

	return {
		parsedPages,
		parsedComments,
		parsedTags,
		tags2Content,
		pagename2ids,
		userList,
		attachments,
		spaceList
	}
}
/**
 * @async
 * @descrption по списку исходников считать xml-файлы и объединить их в общее дерево
 * @param {Array.<String>} xmlList массив с именами исходников-xml 
 * @returns {Node} корневой узел, содержащий в себе все узлы из загруженных пространств
 */
const combineSrcXml = async function(xmlList) {
	let memDist = process.memoryUsage()
	console.log(`memtotal: ${memDist.heapTotal}\nmemused: ${memDist.heapUsed}`)

	const xmlCollection = []
	const testTau = performance.now()
	for await( let xmlItem of asyncXmlCombiner(xmlList)){
		xmlCollection.push(xmlItem)
	}
	const dT = performance.now() - testTau
	console.log(`time passed: ${dT.toFixed(1)}ms;\n`)
	
	const tempDoc = (new DOMParser()).parseFromString('<confluence-data></confluence-data>', {contentType: 'text/xml'})
	const rootNode = tempDoc.querySelector('confluence-data')

	xmlCollection.forEach(chunk => {
		const chunkTree = chunk.querySelector('hibernate-generic')
		rootNode.appendChild(chunkTree)
	})

	xmlCollection.length = 0

	memDist = process.memoryUsage()
	console.log(`memtotal: ${memDist.heapTotal}\nmemused: ${memDist.heapUsed}`)

	return extractEntities(rootNode)
}
/**
* @descrption мастер-функция
*/
getSrcList(DEFAULT_INPUT)
.then( srcList => combineSrcXml(srcList))
.then( parseResults => {
	const {getComArgs, comArgs2Str} = require('./modules/common_utils.js')
	const {exec} = require('child_process')

	const args = getComArgs()
	
	const result_name = args ? args.result_name : DEFAULT_RESULT_NAME
	const wipe_output = args ? !!args.wipe_output : false
	const preset_block_id = args ? Number(args.preset_block_id) : DEFAULT_BLOCK_ID
	
	if(wipe_output) {
		console.log('removing previous exported confluence data;')
		exec(`rm -f ./output/*.sql`)
	}

	fs.writeFile(`./temp/${TEMP_PATH}`, JSON.stringify(parseResults), (err, success) => {
		if(err) {
			console.log('error while writing results')
		} else {
			console.log(`temporary parse results saved in ${TEMP_PATH}`)			
			exec(`node json2sql.js temp_path=${TEMP_PATH} ${comArgs2Str({result_name, preset_block_id})}`, (err, stdout, stderr) => {
				if(err) {
					console.log(`an error occured:\n\t${err}`)
				} else if (stderr){
					console.log(`an error occured:\n\t${stderr}`)
				} else {
					console.log(`\n\t${stdout}`)
				}
			})			
		}
	})
})
.catch( err => { console.log(`Something went wrong\n\n${err}`) })