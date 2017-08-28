/**
 * Created by yuliang on 2017/8/15.
 * presentable 面向用户消费策略相关API
 */

'use strict'

module.exports = app => {
    return class PresentableController extends app.Controller {

        /**
         * 展示节点所有的消费方案
         * @param ctx
         * @returns {Promise.<void>}
         */
        async index(ctx) {
            let nodeId = ctx.checkQuery("nodeId").exist().isInt().value

            await ctx.validate().service.presentableService.getPresentableList({
                nodeId,
                status: 0
            }).bind(ctx).map(buildReturnPresentable).then(ctx.success).catch(ctx.error)
        }

        /**
         * 展示消费策略
         * @param ctx
         * @returns {Promise.<void>}
         */
        async show(ctx) {
            let presentableId = ctx.checkParams("id").isMongoObjectId().value

            await ctx.validate().service.presentableService.getPresentable({
                _id: presentableId,
                status: 0
            }).bind(ctx).then(ctx.success).catch(ctx.error)
        }

        /**
         * 创建节点消费方案
         * @param ctx
         * @returns {Promise.<void>}
         */
        async create(ctx) {
            let name = ctx.checkBody('name').notBlank().len(2, 50).type('string').value
            let nodeId = ctx.checkBody('nodeId').isInt().gt(0).value
            let contractId = ctx.checkBody('contractId').notEmpty().value
            let expireDate = ctx.checkBody('expireDate').isDate().toDate().value
            let languageType = ctx.checkBody('languageType').default('yaml').in(['yaml']).value
            let viewingPolicyText = ctx.checkBody('viewingPolicyText').exist().isBase64().decodeBase64().value

            ctx.allowContentType({type: 'json'}).validate()

            let contractInfo = await ctx.curlIntranetApi(`http://192.168.0.3:1201/api/v1/contracts/${contractId}`)

            if (!contractInfo || contractInfo.partyTwo !== nodeId || contractInfo.contractType !== 2) {
                ctx.error({msg: 'contract信息错误'})
            }
            if (expireDate > new Date(contractInfo.expireDate)) {
                ctx.error({msg: 'expireDate大于合约的有效期'})
            }

            let presentable = {
                name, nodeId,
                resourceId: contractInfo.targetId,
                viewingPolicyText, languageType,
                contractId,
                userId: 1,
                expireDate
            }

            await ctx.service.presentableService.createPresentable(presentable)
                .bind(ctx).then(ctx.success).catch(ctx.error)
        }

        /**
         * 删除节点消费方案
         * @param ctx
         * @returns {Promise.<void>}
         */
        async destroy(ctx) {

            let presentableId = ctx.checkParams("id").exist().isMongoObjectId().value

            await ctx.service.presentableService.updatePresentable({status: 1}, {_id: presentableId}).bind(ctx)
                .then(data => ctx.success(data ? data.ok > 0 : false)).catch(ctx.error)
        }
    }
}

const buildReturnPresentable = (data) => {
    if (data) {
        data = data.toObject()
        Reflect.deleteProperty(data, 'languageType')
        Reflect.deleteProperty(data, 'viewingPolicyText')
    }
    return data
}