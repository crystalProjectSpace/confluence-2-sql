module.exports = {
	/**
	* @description извлечь заключительные версии страниц
	*/
	selectPages:function(rootNode) {
		const rawPages = rootNode.querySelectorAll('object[class="Page"]')
		const result = []
		rawPages.forEach(page => {
			if(!page.querySelector('property[name="originalVersion"]')) {
				result.push(page)
			}
		})
		
		return result
	},
	/**
	* @description извлечь заключительные версии блогов
	*/
	selectBlogs: function(rootNode) {
		const rawBlogs = rootNode.querySelectorAll('object[class="BlogPost"]')
		const result = []
		rawBlogs.forEach(blog => {
			if(!blog.querySelector('property[name="originalVersion"]')) {
				result.push(blog)
			}
		})
		
		return result
	},
	/**
	* @description сформировать список пользователей
	*/
	selectUsers: function(rootNode) {
		const userNodes = rootNode.querySelectorAll('object[class="ConfluenceUserImpl"]')
		const result = []
		userNodes.forEach(userNode => {
			result.push({
				key: userNode.querySelector('id[name="key"]').textContent,
				login: userNode.querySelector('property[name="name"]').textContent
			})
		})
		
		return result
	},
	/**
	* @description составить список тегов с учетом тегов-синонимов
	*/
	selectTags: function(rootNode) {
		const tagNodes = rootNode.querySelectorAll('object[class="Label"]')
		const result = []

		tagNodes.forEach(tagNode => {
			const id = +(tagNode.querySelector('id[name="id"]').textContent)
			const name = tagNode.querySelector('property[name="name"]').textContent

			const synonymTag = result.find(tag => tag.name === name)

			if(synonymTag) {
				const synonymIndex = result.indexOf(synonymTag)
				result[synonymIndex].synonymIds.push(id)
			} else {
				result.push({
					id,
					name,
					synonymIds: []
				})
			}
		})

		return result
	},
	/**
	* @description составить список связей между контентом и тегами
	 */
	selectTags2Content(tagList, rootNode) {
		const tag2ContentList = rootNode.querySelectorAll('object[class="Labelling"]')
		const result = []

		tag2ContentList.forEach(tag2Content => {
			const page_id = +(tag2Content.querySelector('property[name="content"] id').textContent)
			const tag_id = +(tag2Content.querySelector('property[name="label"] id').textContent)
			
			result.push({
				page_id,
				tag_id: tagList.find(tag => tag.id === tag_id || tag.synonymIds.indexOf(tag_id) !== -1).id
			})
		})

		return result
	},
	/**
	 * @description извлечь список комментариев
	 */
	selectComments(rootNode) {
		const rawComments = rootNode.querySelectorAll('object[class="Comment"]')
		const result = []

		rawComments.forEach( comment => {
			if(!comment.querySelector('property[name="originalVersion"]' )) {
				result.push(comment)
			}
		})

		return result
	},
	/**
	 * @description извлечь данные о пространстве
	 */
	selectSpace(rootNode) {
		const rawSpace = rootNode.querySelector('object[class="Space"]')

		const name = rawSpace.querySelector('property[name="name"]').textContent
		const defaultPageNode = rawSpace.querySelector('property[name="homePage"] id')
		const defaultPageId = defaultPageNode ? +defaultPageNode.textContent : null

		return {name, defaultPageId}
	},
	/**
	 * @description извлечь данные о файлах
	 */
	selectAtachedFiles(rootNode) {
		const attachments = rootNode.querySelectorAll('object[class="Attachment"]')
		const result = []
		const nAttachments = attachments.length

		for(let i = 0; i < nAttachments; i++) {
			const attachment = attachments[i]
			const name = attachment.querySelector('property[name="title"]').textContent
			const id = +attachment.querySelector('id').textContent

			result.push({name, id})
		}

		return result
	}
}