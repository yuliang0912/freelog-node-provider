/**
 * Created by yuliang on 2017/10/26.
 */

'use strict'

module.exports = app => {
    return class HomeController extends app.Controller {

        /**
         * node主页.解析pb
         * @param ctx
         * @returns {Promise.<void>}
         */
        async index(ctx) {

            let {nodeInfo} = ctx.request
            let pageBuilds = await ctx.service.nodePageBuildService.getNodePageBuildList({nodeId: nodeInfo.nodeId})

            if (!pageBuilds.length) {
                ctx.errors({msg: '当前节点暂未设置PageBuild资源'})
            }

            let defaultPageBuild = pageBuilds.find(item => item.status === 1)
            if (!defaultPageBuild) {
                defaultPageBuild = pageBuilds[0]
            }

            //let presentableTask = await ctx.service.presentableService.getPresentable({_id: defaultPageBuild.presentableId})
            let resourceInfo = await ctx.curlIntranetApi(`${ctx.app.config.gatewayUrl}/api/v1/resources/${presentable.resourceId}`)


            resourceInfo.systemMeta



            ctx.success(nodeInfo)
        }
    }
}
