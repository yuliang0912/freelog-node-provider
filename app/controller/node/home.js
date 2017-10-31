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

            ctx.success(nodeInfo)
        }
    }
}
