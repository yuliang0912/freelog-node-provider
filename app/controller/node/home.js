/**
 * Created by yuliang on 2017/10/26.
 */

'use strict'

module.exports = app => {
    const dataProvider = app.dataProvider

    return class HomeController extends app.Controller {

        /**
         * node主页.解析pb
         * @param ctx
         * @returns {Promise.<void>}
         */
        async index(ctx) {

            ctx.validateNodeInfo()

            let {nodeInfo} = ctx.request
            let pageBuilds = await dataProvider.nodePageBuildProvider.getNodePageBuildList({nodeId: nodeInfo.nodeId})

            if (!pageBuilds.length) {
                ctx.error({msg: '当前节点暂未设置PageBuild资源'})
            }

            let defaultPageBuild = pageBuilds.find(item => item.status === 1)
            if (!defaultPageBuild) {
                defaultPageBuild = pageBuilds[0]
            }

            let pbResource = await ctx.curlIntranetApi(`http://127.0.0.1:7005/v1/node/${defaultPageBuild.nodeId}/presentables/${defaultPageBuild.presentableId}.data`, {dataType: 'original'})

            console.log(pbResource.headers['freelog-meta'], pbResource.headers['freelog-system-meta'])

            let nodeTemplate = await ctx.curl('http://static.freelog.com/web-components/index.html').then(data => {
                return data.data.toString().replace(/(href|src)=\".\//g, 'href="http://static.freelog.com/web-components/')
            })

            ctx.body = ctx.helper.nodeTemplateHelper.convertNodePageBuild(nodeTemplate, pbResource.data.toString())
            ctx.allowCors()
            ctx.type = "text/html"
        }
    }
}
