const {DOMParser} = require('linkedom')
/**
 * @description преобразовать имя внутреннего файла в ссылку для media-db
 * @param {String} fileName 
 * @param {Array.<{name: String, id: Number}>} attachments массив имен и id присоединенных файлов
 * @returns {String} путь к файлу по id в media-db
 */
const fileName2Link = function(fileName, attachments) {
	const fileRec = attachments.find(file => file.name === fileName)

	return `api/media/resources/${fileRec ? fileRec.id : null}`
}
/**
 * @description преобразовать теги разметки конфлюэнса в сетку на флексах/гридах
 * @param {*} root 
 * @param {*} layout 
 */
const layout2grid = function(root, layout) {
	const grid = root.createElement('div')
	grid.setAttribute('class', 'grid')
	
	const rows = layout.querySelectorAll('layout-section')
	const nRows = rows.length
	
	for(let i = 0; i < nRows; i++) {
		const row = rows[i]
		const rowBlock = root.createElement('div')
		rowBlock.setAttribute('class', 'grid-row')
		row.childNodes.forEach(rowChild => {
			if(rowChild.tagName !== 'layout-cell') {
				rowBlock.appendChild(rowChild)
			} else {
				const cell = root.createElement('div')
				cell.setAttribute('class', 'grid-cell')
				rowChild.childNodes.forEach(cellContent => { cell.appendChild(cellContent) })
				rowBlock.appendChild(cell)
			}			
		})

		grid.appendChild(rowBlock)
	}

	root.replaceChild(grid, layout)
}
/**
 * @description преобразовать внутреннюю ссылку конфлюэнса по имени страницы в ссылку по id
 * @param {*} root 
 * @param {*} linkNode 
 * @param {*} pagename2ids 
 */
const createLink = function(root, linkNode, pagename2ids, userList, attachments) {
	const result = root.createElement('a')
	
	const pagePtr = linkNode.querySelector('page')
	const userPtr = linkNode.querySelector('user')
	const filePtr = linkNode.querySelector('attachment')
	const linkContent = linkNode.querySelector('plain-text-link-body')

	if(pagePtr) {
		const pageName = pagePtr.getAttribute('content-title')
		const pageId = pagename2ids[pageName]

		const linkTxt = root.createTextNode(linkContent ? linkContent.textContent : pageName)
		result.appendChild(linkTxt)

		result.setAttribute('class', 'link-internal lnk-page')
				
		result.setAttribute('href', `/block-page/${pageId}`)		
	} else if(userPtr) {
		const userKey = userPtr.getAttribute('userkey')
		const userName = userList.find(user => user.key === userKey).login

		const linkTxt = root.createTextNode(linkContent ? linkContent.textContent : userName)

		result.setAttribute('class', 'link-internal lnk-user')
		
		result.setAttribute('href', `/knoba-user/${userName}`)
		result.appendChild(linkTxt)
	} else if(filePtr) {
		const fileName = filePtr.getAttribute('filename')
		const linkTxt = root.createTextNode(fileName)

		result.setAttribute('class', 'link-internal lnk-file')

		result.setAttribute('href', fileName2Link(fileName, attachments))
		result.appendChild(linkTxt)
	}

	linkNode.parentNode.replaceChild(result, linkNode)	
}
/**
 * @description превратить нестандартный тег image в img
 */
const createImg = function(root, image, attachments) {
	const result = root.createElement('img')
	const outerPath = image.querySelector('url')
	
	const imgWidth = image.getAttribute('width')
	const imgHeight = image.getAttribute('height')
	const imgAlt = image.getAttribute('alt')

	result.width = imgWidth ? `${imgWidth}px` : 'auto'
	result.height = imgHeight ? `${imgHeight}px` : 'auto'

	if(outerPath) {
		result.setAttribute('src', outerPath.getAttribute('value'))
		result.setAttribute('class', 'image-outer')
	} else {
		const innerPath = image.querySelector('attachment')

		result.setAttribute('src', fileName2Link(innerPath.getAttribute('filename'), attachments))
		result.setAttribute('class', 'image-inner')
	}

	if(image.alt) {
		result.setAttribute('alt', imgAlt) 
	}

	image.parentNode.replaceChild(result, image)
}
/**
 * @description создать контейнер для блока, в который помещается подкат с текстом и раскрывающий заголовок-спойлер
 * @param {*} root 
 * @param {*} macros 
 * @returns 
 */
const processExpand = function(root, macros) {
	const result = root.createElement('div')
	result.setAttribute('class', 'conf-expand')
	result.dataset.ctype = 'macro'

	const expandSpoiler = macros.querySelector('parameter[name="title"]')
	const expandContent = macros.querySelector('rich-text-body')

	const header = root.createElement('div')
	header.setAttribute('class', 'conf-expand__header')
	const headerTxt = root.createTextNode(expandSpoiler ? expandSpoiler.textContent : 'Нажмите для раскрытия&hellip;')
	header.appendChild(headerTxt)

	const content = root.createElement('div')
	content.setAttribute('class', 'conf-expand__content')
	expandContent.childNodes.forEach(contentNode => { content.appendChild(contentNode) })

	result.appendChild(header)
	result.appendChild(content)

	return result
}
/**
 * @description преобразовать блок с исходным кодом
 */
const processCode = function(root, macros) {
	const codeLanguage = macros.querySelector('parameter[name="language"]')
	const title = macros.querySelector('parameter[name="title"]')
	const toggleable = macros.querySelector('parameter[name="collapse"]')
	const content = macros.querySelector('plain-text-body').textContent

	const result = root.createElement('div')
	result.setAttribute('class', `conf-codeblock${toggleable ? ' conf-expand' : ''}`)
	result.dataset.ctype = "macro"
	result.dataset.lang = codeLanguage ? codeLanguage.textContent : ''
	
	if(title || toggleable) {
		const codeHeader = root.createElement('h3')
		codeHeader.setAttribute('class', `conf-codeblock__header${toggleable ? ' conf-expand-header' : ''}`)
		codeHeader.textContent = title ? title.textContent : 'Нажмите для раскрытия&hellip;'
		result.appendChild(codeHeader)
	}

	const codeLines = content.split('\n')
	const nLines = codeLines.length
	const codeWrap = root.createElement('ol')
	codeWrap.setAttribute('class', `conf-codeblock__code${toggleable ? 'expand-content': ''}`)

	for(let i = 0; i < nLines; i++) {
		const codeLine = root.createElement('li')
		codeLine.setAttribute('class', 'conf-codeblock__line')
		codeLine.textContent = codeLines[i]
		codeWrap.appendChild(codeLine)
	}

	result.appendChild(codeWrap)

	return result
}
/**
 * @description фрагмент преформатированного текста 
 */
const processNoFormat = function(root, macros) {
	const content = macros.querySelector('plain-text-body').textContent
	const result = root.createElement('div')
	
	result.setAttribute('class', 'conf-noformat')
	result.dataset.ctype = 'macro'

	const preBlock = root.createElement('pre')
	preBlock.textContent = content

	result.appendChild(preBlock)

	return result
}
/**
 * @description превратить стилизованную панель конфлюэнса в обычный div-блок
 */
const processPanel = function(root, macros) {
	const panelContent = macros.querySelector('rich-text-body')
	const result = root.createElement('div')
	result.setAttribute('class', 'conf-panel')
	result.dataset.ctype = 'macro'

	const panelHeader = macros.querySelector('parameter[name="title"]')
	if(panelHeader) {
		const headerWrap = root.createElement('h3')
		headerWrap.setAttribute('class', 'conf-panel__header')
		headerWrap.textContent = panelHeader.textContent

		result.appendChild(headerWrap)
	}

	const panelBody = root.createElement('div')
	panelBody.setAttribute('class', 'conf-panel__body')

	panelContent.childNodes.forEach(panelChild => { panelBody.appendChild(panelChild) })

	result.appendChild(panelContent)

	return result
}
/**
 * @description обработка информационных сообщений конфлюэнса (tip/note/...)
 * @param {*} root 
 * @param {*} macros 
 * @returns 
 */
const processInfoMacros = function(root, macros, macrosName) {
	const result = root.createElement('div')
	result.setAttribute('class', `conf-${macrosName.toLowerCase()}`)
	result.dataset.ctype = 'macro'

	const infoHeader = macros.querySelector('parameter[name="title"]')

	if(infoHeader) {
		const header = root.createElement('h3')
		header.setAttribute('class', `conf-${macrosName.toLowerCase()}__header`)
		header.textContent = infoHeader.textContent

		result.appendChild(infoHeader)
	}

	const tipContent = macros.querySelector('rich-text-body')

	tipContent.childNodes.forEach(tipChild => { result.appendChild(tipChild) })

	const tipIcon = root.createElement('svg')
	tipIcon.setAttribute('class', 'svg-icon info')

	const sprite = root.createElement('use')
	sprite.setAttribute('xlink:href', `/st/img/svg/wiki-sprite.svg#info-${macrosName}`)

	tipIcon.appendChild(sprite)
	result.appendChild(tipIcon)

	return result	
}
/**
* @description блок статуса 
*/
const processStatus = function(root, macros) {
	const result = root.createElement('span')
	result.dataset.ctype = 'macro'

	const colorScheme = macros.querySelector('parameter[name="colour"]')
	const txt = macros.querySelector('parameter[name="title"]')

	result.setAttribute('class', `conf-status scheme__${colorScheme ? colorScheme.textContent.toLowerCase() : 'default'}`)
	result.textContent = txt ? txt.textContent : ''

	return result
}

const processLink2Board = function(root, macros) {
	const result = root.createElement('span')
	result.setAttribute('class', 'conf-task')
		
	const taskKey = macros.querySelector('parameter[name="key"]')
	const taskServer = macros.querySelector('parameter[name="serverId"]')

	result.dataset.ctype = 'macro',
	result.dataset.taskProviderType = 'jira',
	result.dataset.taskKey = taskKey ? taskKey.textContent : '',
	result.dataset.taskServer =  taskServer ? taskServer.textContent : 'default'

	return result
}
/**
* @description обработать вложенный файл
*/
const processLink2File = function(root, macros, attachments) {
	const result = root.createElement('div')
	result.setAttribute('class', 'conf-file')
	
	const fileHeader = root.createElement('h3')
	fileHeader.setAttribute('class', 'conf-file__header')

	const fileFrame = root.createElement('iframe')
	fileFrame.setAttribute('class', 'conf-file__frame')
	
	const height = macros.querySelector('parameter[name="height"]')
	const width = macros.querySelector('parameter[name="width"]')

	if(height) {
		fileFrame.setAttribute('height', `${height.textContent}px`)
	}

	if(width) {
		fileFrame.setAttribute('width', `${width.textContent}px`)
	}

	const fileNameNode = macros.querySelector('parameter[name="name"]')
	if(fileNameNode) {
		const attachmentNode = fileNameNode.querySelector('attachment')
		const fileName = attachmentNode ? attachmentNode.getAttribute('filename') : 'файл'

		fileHeader.textContent = fileName
		fileFrame.setAttribute('src', fileName2Link(fileName, attachments))
	}

	result.appendChild(fileHeader)
	result.appendChild(fileFrame)

	return result
}
/**
 * @description создать блок для монтирования создаваемых в runtime элементов
 * @param {*} root 
 * @param {*} macrosName 
 * @returns 
 */
const setMacrosSocket = function(root, macrosName) {
	const result = root.createElement('div')
	result.setAttribute('class', `conf-${macrosName.toLowerCase()}`)
	result.dataset.ctype = 'macro'

	return result
}

const processUML = function(root, macros, isMarkup = false) {
	const result = root.createElement('div')
	result.setAttribute('class', 'conf-uml')
	result.dataset.ctype = 'macro'

	const titleNode = macros.querySelector('property[name="title"]')

	if(titleNode) {
		const diaHeader = root.createElement('h3')
		diaHeader.setAttribute('class', 'conf-uml__header')
		diaHeader.textContent = titleNode.textContent
	}

	const UML_parsed_src = []
	if(isMarkup) {
		const UML_blocks = macros.querySelectorAll('rich-text-body p')
		const nBlocks = UML_blocks.length
	
		for(let i = 0; i < nBlocks; i++) {
			const block = UML_blocks[i]
			block.childNodes.forEach(elt => {
				if(elt.nodeType === 3) {
					UML_parsed_src.push(elt.nodeValue.trim())
				}
			})
		}
	} else {
		const codeLines = macros.querySelector('plain-text-body').textContent
			.replace(/(\@startuml)|(\@enduml)/gi, '')
			.split('\n')
		const nLines = codeLines.length
		for(let i = 0; i < nLines; i++) {
			const trimmedCodeLine = codeLines[i]
			if(!!trimmedCodeLine.trim()) {
				UML_parsed_src.push(trimmedCodeLine)
			}
		}
	}

	result.dataset.umlSrc = `${UML_parsed_src.join(';;').replace(/\'/g, '&apos;')}`

	return result	
}
/**
 * @description преобразовать макрос-заметку
 * @param {*} root 
 * @param {*} macros 
 * @returns 
 */
const processDetails = function(root, macros) {
	const result = root.createElement('div')
	result.setAttribute('class', 'conf-details')
	result.dataset.ctype = 'macro'

	const detailsContent = macros.querySelector('rich-text-body')

	detailsContent.childNodes.forEach(detailsChild => { result.appendChild(detailsChild) })

	return result
}
/**
 * @description роутер преобразований макросов конфлюэнса в обычную разметку
 */
const macros2html = function(root, macros, attachments) {
	const macrosType = macros.getAttribute('name')

	switch(macrosType) {
		case 'details': return processDetails(root, macros);
		case 'plantuml': 
		case 'plantumlrender': return processUML(root, macros, macrosType === 'plantumlrender');
		case 'view-file': return processLink2File(root, macros, attachments);
		case 'jira': return processLink2Board(root, macros);
		case 'code': return processCode(root, macros);
		case 'expand': return processExpand(root, macros);
		case 'noformat': return processNoFormat(root, macros);
		case 'status': return processStatus(root, macros);
		case 'toc': return setMacrosSocket(root, 'toc');
		case 'pagetree':
		case 'children': return setMacrosSocket(root, 'children');
		case 'panel': return processPanel(root, macros);
		case 'note':
		case 'info':
		case 'warning':
		case 'tip': return processInfoMacros(root, macros, macrosType);
		default: return null;
	}
}
module.exports = {
	/**
	* @description преобразовать узлы property в ассоциативный массив
	*/
	getNodeProps: function(node) {
		const props = node.querySelectorAll('property')
		const result = {}
		props.forEach( prop => {
			const propName = prop.getAttribute('name')
			result[propName] = prop
		})

		return result
	},
	/**
	 * @description Получить аргументы командной строки в виде списка "ключ-значение" (если значение не указано, считать равным true)
	 * @returns {Object}
	 */
	getComArgs: function() {
		const customArgs = process.argv.slice(2)
		
		const result = {}

		customArgs.forEach(arg => {
			const eqIndex = arg.indexOf('=')
			if(eqIndex !== -1) {
				const [argName, argVal] = arg.split('=')
				result[argName] = argVal
			} else {
				result[arg] = true
			}
		})

		return result
	},
	/**
	 * @description свернуть аргументы командной строки в текст
	 * @returns {String}
	 */
	comArgs2Str: function(argObj) {
		const result = []
		for(let key in argObj) {
			const val = argObj[key]
			if(typeof val === 'boolean') {
				result.push('key')
			} else {
				result.push(`${key}=${val}`)
			}
		}

		return result.join(' ')
	},
	/**
	* @description найти контент страницы
	*/
	getContentById: function(contentList, id) {
		const nItems = contentList.length
		let result = ''
		
		for(let i = 0; i < nItems; i++) {
			const item = contentList[i]
			const contentOwnerId = +item.querySelector('property[name="content"] id[name="id"]').textContent
			if(contentOwnerId === id) {
				result = item.querySelector('property[name="body"]').textContent
					.replace(/\'/g, "&apos;")
					.replace(/\№/g, '&#8470;')
					.replace(/(\<\!\[CDATA\[)|(\]\]\s*\>)/g, '')
				break;
			}
		}
		
		return result
	},
	/**
	 * @description превратить спецтеги в обычные хтмл-теги
	 */
	confluence2base: function(content, pagename2ids, userList, attachments) {
		const cleanupStr = content.replace(/(ac|ri)\:/g, "")
		const parsedContent = (new DOMParser()).parseFromString(cleanupStr, {contentType: 'text/xml'})

		const layouts = parsedContent.querySelectorAll('layout')
		const nLayout = layouts.length
		for(let i = 0; i < nLayout; i++) {
			layout2grid(parsedContent, layouts[i])
		}

		const interLinks = parsedContent.querySelectorAll('link')
		const nLinks = interLinks.length
		for(let i = 0; i < nLinks; i++) {
			createLink(parsedContent, interLinks[i], pagename2ids, userList, attachments)
		}

		const images = parsedContent.querySelectorAll('image')
		const nImages = images.length
		for(let i = 0; i < nImages; i++) {
			createImg(parsedContent, images[i], attachments)
		}

		const macroses = parsedContent.querySelectorAll('structured-macro')
		const nMacros = macroses.length
		for(let i = 0; i < nMacros; i++) {
			const macros = macroses[i]
			const processedMacros = macros2html(parsedContent, macros, attachments)
			processedMacros ?
				macros.parentNode.replaceChild(processedMacros, macros) :
				macros.parentNode.removeChild(macros)
		}

		const result = parsedContent.toString().replace('<?xml version="1.0" encoding="utf-8"?>', '')

		return result
	}
}