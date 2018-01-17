/**
 * Created by yuliang on 2017/10/26.
 */

'use strict'

const ExtensionNames = ['data', 'js', 'css', 'html']

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

            let userId = ctx.request.userId || 0
            let nodeInfo = ctx.request.nodeInfo
            let pageBuild = await dataProvider.nodePageBuildProvider.getNodePageBuild({
                nodeId: nodeInfo.nodeId,
                status: 1
            })
            if (!pageBuild) {
                ctx.error({msg: '当前节点没有可展示的PageBuild资源'})
            }

            let pbResource = await ctx.curlIntranetApi(`${this.config.gatewayUrl}/api/v1/nodes/${pageBuild.nodeId}/presentables/${pageBuild.presentableId}.data`, {dataType: 'original'}).then(response => {
                if (response.res.headers['content-type'].indexOf('application/json') > -1) {
                    return JSON.parse(response.data.toString())
                } else {
                    return response
                }
            }).catch(err => ctx.error(err))

            if (!pbResource.res && !pbResource.status) {
                ctx.body = ctx.helper.nodeTemplateHelper.convertErrorNodePageBuild(this.config.nodeTemplate, nodeInfo.nodeId, userId, pbResource)
                ctx.allowCors()
                ctx.type = "text/html"
                return
            }

            let widgetRelation = await dataProvider.pagebuildWidgetRelationProvider.getWidgetRelation({presentableId: pageBuild.presentableId})
            let relevanceContractIds = widgetRelation ? widgetRelation.relevanceContractIds.map(t => t.contractId) : []

            let pbWidgets = JSON.parse(pbResource.headers['freelog-system-meta']).widgets

            let widgetsPresentables = relevanceContractIds.length ?
                await ctx.curlIntranetApi(`${this.config.gatewayUrl}/api/v1/presentables?nodeId=${nodeInfo.nodeId}&contractIds=${relevanceContractIds.toString()}`) : []

            pbWidgets.forEach(item => {
                let presentable = widgetsPresentables.find(t => t.resourceId === item.resourceId)
                if (presentable) {
                    item.presentableId = presentable.presentableId
                }
            })

            ctx.body = ctx.helper.nodeTemplateHelper.convertNodePageBuild(this.config.nodeTemplate, pbResource.data.toString(), nodeInfo.nodeId, userId, pbWidgets)
            ctx.allowCors()
            ctx.type = "text/html"
        }

        /**
         * 当前节点请求presentable资源
         * @param ctx
         * @returns {Promise.<void>}
         */
        async presentableResource(ctx) {

            var OSS = require('ali-oss');
            var client = new OSS({
                region: 'oss-cn-shenzhen',
                accessKeyId: 'LTAIy8TOsSnNFfPb',
                accessKeySecret: 'Bt5yMbW89O7wMTVQsNUfvYfou5GPsL',
                bucket: 'freelog-shenzhen'
            });

            var url = client.signatureUrl('/resources/image/bb8d7393f7ad47fdaa9f2036e4fda709', {expires: 1510802533});
            console.log(url);

            ctx.success(url)


            // let nodeInfo = ctx.request.nodeInfo
            // let presentableId = ctx.checkParams('presentableId').isMongoObjectId('presentableId格式错误').value
            // let extName = ctx.checkParams('extName').optional().in(ExtensionNames).value
            //
            // ctx.validateNodeInfo().validate()
            //
            // return ctx.success(nodeInfo)

            // await ctx.curl('http://frcdn.oss-cn-shenzhen.aliyuncs.com/test-file/mysql-5.7.17.msi', {
            //     streaming: true,
            // }).then(result => {
            //     if (/^2[\d]{2}$/.test(result.status)) {
            //         ctx.body = result.res;
            //     } else {
            //         ctx.error({msg: '文件丢失,未能获取到资源源文件信息', data: {['http-status']: result.status}})
            //     }
            // })
        }
    }
}
