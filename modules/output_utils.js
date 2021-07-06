// заголовок для сохранения страниц
const pages2SQL_header = 'INSERT INTO wiki.block_page(id, space_id, parent_id, name, author, layout_json, sys_date_create, is_chrono ) VALUES'
// заголовок для сохранения комментариев
const comments2SQL_header = 'INSERT INTO wiki.comment(id, page_id, parent_id, author, content, date) VALUES'
// заголовок для тегов
const tag2SQL_header = 'INSERT INTO wiki.tags(id, name) VALUES'
// заголовок связки теги <-> страницы
const tagToContent2SQL_header = 'INSERT INTO wiki.block_pages2tags(tag_id, block_page_id) VALUES'
/**
 * @description перевести тег в элемент sql-скрипта
 * @param {Object} tag 
 * @returns {String}
 */
const tag2SQL = function(tag) {
	return `(${tag.id}, '${tag.name}')`
}
/**
 * @description перевести связку страница <-> тег в элемент sql-скрипта
 * @param {Object} tag2content 
 * @returns {String}
 */
const tagToContent2SQL = function(tag2content) {
	return `(${tag2content.tag_id}, ${tag2content.page_id})`
}
/**
 * @description создать запись о пространстве, при конфликте обновить
 * @param {*} space 
 * @returns 
 */
const space2SQL = function(space) {
    const spaceTuple = `(${space.id}, '${space.name}')`
    return  `INSERT INTO wiki.spaces (id, name) VALUES ${spaceTuple} ON CONFLICT(id) DO UPDATE SET (id, name) = ${spaceTuple};`
}
/**
 * @description задать дефолтную страницу для пространства
 * @param {*} space 
 * @returns 
 */
const setDefaultPage = function(space) {
    const {id, defaultPageId} = space
    return `UPDATE wiki.spaces SET default_page_id=${defaultPageId} WHERE id=${id};\n`
}

module.exports = {
    /**
     * @description сохранить результаты работы в sql-скрипт по заданному адресу
     * @param {Array.<Page>} pages - массив готовых к обработке страниц
     * @param {Array.<Comment>} comments - массив комментариев
     * @param {Array.<Object>} tags - массив тегов
     * @param {Array.<Object>} tags2content - массив связок тег <-> страница
     * @param {String} name - имя файла-результата
     * @returns {void}
     */
    save2SQL: function(pages, comments, tags, tags2content, pagename2ids, userList, spaceList, attachments, presetBlockId, name , fs) {
        const {performance} = require('perf_hooks')
        const Page = require('./page.js')
        const Comment = require('./comments.js')
        
        console.log('ready to JSON -> SQL transform;\n')
        
        const tau0 = performance.now()

        const savePath = `./output/${name}.sql`
        let data2sql = ''

        const nLastComment = comments.length - 1
        const nLastTag = tags.length - 1
        const nLastTag2Content = tags2content.length - 1

        data2sql += spaceList.map(space => space2SQL(space)).join('\n')
        console.log('\t-spaces transformed to SQL')
        
        if(tags.length > 0) {
            data2sql += tag2SQL_header
            for(let j = 0; j < nLastTag; j++) {
                data2sql += tag2SQL(tags[j]) + ', '
            }
            data2sql += (tag2SQL(tags[nLastTag]) + ' ON CONFLICT(id) DO NOTHING;\n')
            console.log('\t-tags transformed to SQL')
            tags.length = 0
        } else {
            console.log('no tags to include in SQL script\n')
        }
        
        data2sql += pages2SQL_header
        while(pages.length > 1) {
            const pageData = pages.pop()
            const pageObj = Page.Obj2Page(pageData)
            data2sql += (pageObj.serialize2SQL(pagename2ids, userList, attachments, presetBlockId) + ', ')
        }

        const pageData = pages.pop()
        const pageObj = Page.Obj2Page(pageData)

        data2sql += (pageObj.serialize2SQL(pagename2ids, userList, attachments, presetBlockId) + ';\n')
        console.log('\t-pages transformed to SQL')

        if(tags2content.length > 0) {
            data2sql += tagToContent2SQL_header
            for(let j = 0; j < nLastTag2Content; j++) {
                data2sql += tagToContent2SQL(tags2content[j]) + ', '
            }
            data2sql += (tagToContent2SQL(tags2content[nLastTag2Content]) + ';\n')
            console.log('\t-links tag<->page transformed to SQL')
        } else {
            console.log('no links tag<->page to include in SQL script\n')
        }

        if(comments.length > 0) {
            data2sql += comments2SQL_header
            for(let j = 0; j < nLastComment; j++) {
                const comData = comments[j]
                const comObj = Comment.Obj2Comment(comData)
                data2sql += (comObj.serialize2SQL() + ', ')
            }
            const comData = comments[nLastComment]
            const comObj = Comment.Obj2Comment(comData)
            data2sql += (comObj.serialize2SQL() + ';\n')
            console.log('\t-comments transformed to SQL')
        } else {
            console.log('no comments to include in SQL script\n')
        }

        data2sql += spaceList.map(space => setDefaultPage(space)).join('\n')
        console.log('\t-default pages for spaces were set up')

        const memDist = process.memoryUsage()
        console.log(`memtotal: ${memDist.heapTotal}\nmemused: ${memDist.heapUsed}`)
        
        return new Promise((resolve, reject) => {
            fs.writeFile(savePath, data2sql, (err, success) => {
                if(err) {
                    console.log('error while writing results')
                    reject(err)
                } else {
                    console.log(`time passed: ${(performance.now() - tau0).toFixed(1)} ms;\n`)
                    console.log(`parse results saved in ${savePath}`)
                    resolve(success)
                }
            })
        })
    }
}