const {getNodeProps, getContentById, confluence2base} = require('./common_utils.js')

const DEFAULT_BLOCK_ID = 1111
module.exports = class Page {
    /**
     * @description создать страницу в древовидной иерархии
    */
    static TreePage(contentList, userList, pageObj, space_id) {
        const result = new Page()

        result.init(contentList, userList, pageObj, space_id, false)

        return result
    }
    /**
    * @description извлечь страницу блога
    */
    static BlogPage(contentList, userList, pageObj, space_id) {
        const result = new Page()

        result.init(contentList, userList, pageObj, space_id, true)

        return result
    }
    static Obj2Page({id, name, parent_id, content, author, sys_date_create, is_chrono, space_id}) {
        const result = new Page()

        result.getFields(id, name, parent_id, content, author, sys_date_create, is_chrono, space_id)

        return result
    }
    /**
    * @description конструктор
    */
    constructor() {
        this.id = 0
        this.name = ''
        this.parent_id = null
        this.content = ''
        this.author = ''
        this.sys_date_create = null
        this.is_chrono = false
        this.space_id = 0
    }
    getFields(id, name, parent_id, content, author, sys_date_create, is_chrono, space_id) {
        this.id = id
        this.name = name
        this.parent_id = parent_id
        this.content = content
        this.author = author
        this.sys_date_create = sys_date_create
        this.is_chrono = is_chrono
        this.space_id = space_id
    }
    /**
    * @description извлечь данные о странице
    */
    init(contentList, userList, pageObj, spaceId, is_chrono) {
        this.id = +pageObj.querySelector('id[name="id"]').textContent
        
        const pageProps = getNodeProps(pageObj)
        
        if(!is_chrono) {
            const ancestorNode = pageProps['parent']
            this.parent_id = ancestorNode ? ancestorNode.querySelector('id').textContent : null	
        } else {
            this.is_chrono = true
        }
        
        this.content = getContentById(contentList, this.id)
        
        const authorKey = pageProps['creator'].querySelector('id[name="key"]').textContent
        
        this.author = userList.find(user => user.key === authorKey).login
        
        this.name = pageProps['title'].textContent
        if(this.name) {
            this.name = this.name.replace(/\'/g, '&apos;')
        }
        
        this.sys_date_create = pageProps['creationDate'].textContent

        this.space_id = spaceId
    }
    /**
     * сериализовать данные страницы для их подачи в скрипт sql
    */
    serialize2SQL(pagename2ids, userList, attachments, presetBlockId = DEFAULT_BLOCK_ID) {
        const localAttachments = attachments[this.space_id - 1]
        const structuredContent = JSON.stringify({
            rows: [{
                blocks: [{
                    typeId: presetBlockId,
                    width: "auto",
                    content: { txt: confluence2base(this.content, pagename2ids, userList, localAttachments) }
                }]
            }]
        }).replace(/(\\"')|('\\")/g, '\\"').replace(/\№/g, '&#8470;')

        return '(' + (this.is_chrono ? [
            this.id,            
            this.space_id,
            'NULL',
            `'${this.name}'`,
            `'${this.author}'`,
            `'${structuredContent}'`,
            `'${this.sys_date_create}'`,
            true
        ].join(', ') : [
            this.id,            
            this.space_id,
            this.parent_id ? this.parent_id : 'NULL',
            `'${this.name}'`,
            `'${this.author}'`,
            `'${structuredContent}'`,
            `'${this.sys_date_create}'`,
            false
        ].join(', ')) + ')'
    }
}