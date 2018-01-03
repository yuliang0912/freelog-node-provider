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
            let userContractId = ctx.checkQuery('userContractId').optional().isMongoObjectId().value

            //请求响应设置:https://help.aliyun.com/document_detail/31980.html?spm=5176.doc31855.2.9.kpDwZN
            let response = ctx.checkHeader('response').optional().toJson().default({}).value

            ctx.validate()

            let authToken = await dataProvider.presentableTokenProvider.getLatestResourceToken(presentableId, ctx.request.userId)
                .bind(ctx).catch(ctx.error)

            if (!authToken) {
                authToken = await ctx.curlIntranetApi(`${this.config.gatewayUrl}/api/v1/auths/presentableAuthorization`, {
                    data: userContractId ? {nodeId, presentableId, userContractId} : {nodeId, presentableId}
                }).catch(err => {
                    ctx.error(err)
                })
                await dataProvider.presentableTokenProvider.createResourceToken(authToken).catch(err => ctx.error(err))
            }

            let resourceInfo = await ctx.curlIntranetApi(`${this.config.gatewayUrl}/api/v1/resources/auth/getResource`, {
                headers: response
                    ? {authorization: "bearer " + authToken.signature, response: JSON.stringify(response)}
                    : {authorization: "bearer " + authToken.signature}
            })
            ctx.set('freelog-contract-id', authToken.nodeContractId)

            if (!extName) {
                Reflect.deleteProperty(resourceInfo, 'resourceUrl')
                ctx.success(resourceInfo)
                return
            }

            if (extName === 'data') {
                await ctx.curl(resourceInfo.resourceUrl, {
                    streaming: true,
                }).then(result => {
                    if (/^2[\d]{2}$/.test(result.status)) {
                        ctx.body = result.res;
                        ctx.set(result.headers)
                        ctx.set('content-disposition', 'attachment;filename=' + presentableId)
                        ctx.set('freelog-resource-type', resourceInfo.resourceType)
                        ctx.set('freelog-meta', JSON.stringify(resourceInfo.meta))
                        ctx.set('freelog-system-meta', JSON.stringify(resourceInfo.systemMeta))
                    } else {
                        ctx.error({msg: '文件丢失,未能获取到资源源文件信息', data: {['http-status']: result.status}})
                    }
                })
            } else if (resourceInfo.mimeType === 'application/json') {
                await ctx.curl(resourceInfo.resourceUrl).then(res => {
                    return res.data.toString()
                }).then(JSON.parse).then((data) => {
                    ctx.success(data[extName])
                }).catch(err => {
                    ctx.error(err)
                })
            } else {
                ctx.success(null)
            }
        }
    }
}