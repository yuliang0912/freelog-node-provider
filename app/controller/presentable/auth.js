/**
 * Created by yuliang on 2017/10/26.
 */

'use strict'

const ExtensionNames = ['data', 'js', 'css', 'html']

module.exports = app => {

    const dataProvider = app.dataProvider

    return class PresentableAuthController extends app.Controller {

        /**
         * presentable 获取展示资源接口
         * @param ctx
         * @returns {Promise.<void>}
         */
        async resource(ctx) {

            let nodeId = ctx.checkParams('nodeId').toInt().value
            let presentableId = ctx.checkParams('presentableId').isMongoObjectId('presentableId格式错误').value
            let extName = ctx.checkParams('extName').optional().in(ExtensionNames).value

            ctx.validate()

            let presentable = await dataProvider.presentableProvider.getPresentable({_id: presentableId, nodeId})

            if (!presentable) {
                ctx.error({msg: '参数错误,未找到presentable'})
            }

            //TODO
            //假设presentable全部免费

            let resourceInfo = await ctx.curlIntranetApi(`${ctx.app.config.gatewayUrl}/api/v1/resources/${presentable.resourceId}`)

            if (!extName) {
                Reflect.deleteProperty(resourceInfo, 'resourceUrl')
                ctx.success(resourceInfo)
                return
            }

            if (extName === 'data') {
                ctx.status = 200
                ctx.set('freelog-meta', JSON.stringify(resourceInfo.meta))
                ctx.set('freelog-system-meta', JSON.stringify(resourceInfo.systemMeta))
                let response = await ctx.curl(resourceInfo.resourceUrl, {
                    writeStream: ctx.res
                })
                // let response = await ctx.curl(resourceInfo.resourceUrl)
                // ctx.body = response.data
                // ctx.status = response.status
                // ctx.set(response.headers)
            } else if (resourceInfo.mimeType === 'application/json') {
                await ctx.curl(resourceInfo.resourceUrl).then(res => {
                    return res.data.toString()
                }).then(JSON.parse).then((data) => {
                    ctx.success(data[extName])
                }).catch(ctx.error)
            } else {
                ctx.success(null)
            }
        }
    }
}