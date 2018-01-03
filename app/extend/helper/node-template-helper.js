/**
 * Created by yuliang on 2017/11/2.
 */

'use strict'

const cheerio = require('cheerio')

module.exports = {

    /**
     * 组合节点的pb HTML内容
     * @param template 模本内容
     * @param pageBuildStr PB文件
     */
    convertNodePageBuild (template, pageBuildStr, nodeId, userId, presentables = []){

        let $ = cheerio.load(template)

        $(pageBuildStr).appendTo('#js-page-container')

        presentables.forEach(item => {
            item.presentableId && $(`[data-widget-src=${item.resourceId}]`).attr('data-widget-presentable-id', item.presentableId)
        })

        let authInfo = {
            __auth_user_id__: userId,
            __auth_node_id__: nodeId
        }

        $(`<script> window.__auth_info__ = ${ JSON.stringify(authInfo) } </script>`).appendTo('head')

        return $.html()
    },

    /**
     * 组合节点的pb HTML内容
     * @param template
     * @param authErrorInfo
     */
    convertErrorNodePageBuild (template, nodeId, userId, authErrorInfo){

        let $ = cheerio.load(template)

        let authInfo = {
            __auth_error_info__: authErrorInfo,
            __auth_user_id__: userId,
            __auth_node_id__: nodeId
        }

        $(`<script> window.__auth_info__ = ${ JSON.stringify(authInfo) } </script>`).appendTo('head')

        return $.html()
    }
}