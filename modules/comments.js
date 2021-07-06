const {getNodeProps, getContentById} = require('./common_utils.js')

module.exports = class Comment {
    /**
     * @description  объект комментария с заполненными полями
     * @param {Array.<{{key: String, login:String}}>} userList - массив с именами пользователей
     * @param {Array.<Object>} contentList - массив с содержимым элементов страницы
     * @param {Node} comment узел исходного xml с данными комментария
     * @returns {Object}
     */
    static createComment(userList, contentList, comment) {
        const result = new Comment()
        result.init(userList, contentList, comment)

        return result
    }

    static Obj2Comment({id, parent_id, page_id, author, date, content}) {
        const result = new Comment()
        result.getFields(id, parent_id, page_id, author, date, content)

        return result
    }
    /**
     * @description конструктор
     */
    constructor() {
        this.id = 0
        this.parent_id = null
        this.page_id = 0
        this.author = ''
        this.date = ''
        this.content = ''
    }
    getFields(id, parent_id, page_id, author, date, content ) {
        this.id = id
        this.parent_id = parent_id
        this.page_id = page_id
        this.author = author
        this.date = date
        this.content = content
    }
    /**
     * @description задать комментарий на основе списка пользователей, контента и узла данных комментария
     */
    init(userList, contentList, comment) {
        const localProps = getNodeProps(comment)
        
        this.id = +comment.querySelector('id').textContent

        this.page_id = +localProps['containerContent'].textContent

        const ancestorNode = localProps['parent']
        this.parent_id = ancestorNode ? +ancestorNode.querySelector('id').textContent : null

        const authorKey = localProps['creator'].querySelector('id').textContent

        this.author = userList.find(user => user.key === authorKey).login

        this.content = getContentById(contentList, this.id)

        this.date = localProps['creationDate'].textContent
    }
    /**
     * @description перевести комментарий в содержимое INSERTа
    */
    serialize2SQL() {
        return '(' + [
            this.id,
            this.page_id,
            this.parent_id ? this.parent_id : 'NULL',
            `'${this.author}'`,
            `'${this.content.replace(/\№/g, '')}'`,
            `'${this.date}'`
        ].join(', ') + ')'
    }
}