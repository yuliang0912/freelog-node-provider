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
    convertNodePageBuild (template, pageBuildStr){

        let $ = cheerio.load(template)

        $(pageBuildStr).appendTo('#js-page-container')

        return $.html()
    }
}