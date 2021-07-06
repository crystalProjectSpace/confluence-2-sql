'use strict'

const {getComArgs} = require('./modules/common_utils.js')
const args = getComArgs()

const TEMP_PATH = args.temp_path
const RESULT_NAME = args.result_name
const PRESET_BLOCK_ID = Number(args.preset_block_id)

const parsedEntities = require(`./temp/${TEMP_PATH}`)
const {save2SQL} = require('./modules/output_utils.js')
const fs = require('fs')

const {
    parsedPages,
    parsedComments,
    parsedTags,
    tags2Content,
    pagename2ids,
    userList,
    spaceList,
    attachments
} = parsedEntities

save2SQL(
    parsedPages,
    parsedComments,
    parsedTags,
    tags2Content,
    pagename2ids,
    userList,
    spaceList,
    attachments,
    PRESET_BLOCK_ID,
    RESULT_NAME ,
    fs
)
.then( () => {
    console.log('removing temporary files;')
    fs.unlink(`./temp/${TEMP_PATH}`, err => {
        console.log(err ?
            `\terror while removing temporary files;\n\t${err}` :
            '\t-temporary files deleted'
        )
    })
})