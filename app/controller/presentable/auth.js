/**
 * Created by yuliang on 2017/10/26.
 */

'use strict'

module.exports = app => {
    return class NodeAuthController extends app.Controller {

        /**
         * presentable授权接口
         * @param ctx
         * @returns {Promise.<void>}
         */
        async auth(ctx) {

            let presentableId = ctx.checkQuery('presentableId').isMongoObjectId()
            ctx.validate()

            let presentable = await ctx.service.presentableService.getPresentable({_id: presentableId})

            //TODO
            //假设presentable全部免费

            let resourceInfo = await ctx.curlIntranetApi(`${ctx.app.config.gatewayUrl}/api/v1/resources/${presentable.resourceId}`)

            ctx.success(resourceInfo)
        }
    }
}