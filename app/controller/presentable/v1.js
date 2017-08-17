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
            let nodeId = ctx.request.nodeId = 1

            await ctx.validate().service.presentableService.getPresentableList({nodeId, status: 0}).then().map(data => {
                return {
                    presentableId: data._id,
                    name: data.name,
                    resourceId: data.resourceId,
                    contractId: data.contractId,
                    userId: data.userId,
                    nodeId: data.nodeId,
                    createDate: data.createDate,
                    expireDate: data.expireDate,
                    viewingPolicy: data.viewingPolicy
                }
            }).bind(ctx).then(ctx.success).catch(ctx.error)
        }


        /**
         * 展示消费策略
         * @param ctx
         * @returns {Promise.<void>}
         */
        async show(ctx) {
            let presentableId = ctx.checkParams("id").notEmpty().value


            await ctx.validate().service.presentableService.getPresentable({_id: presentableId}).then(data => {
                return data ? {
                    presentableId: data._id,
                    name: data.name,
                    resourceId: data.resourceId,
                    contractId: data.contractId,
                    userId: data.userId,
                    nodeId: data.nodeId,
                    createDate: data.createDate,
                    expireDate: data.expireDate,
                    viewingPolicy: data.viewingPolicy,
                    status: data.status
                } : null
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
            let resourceId = ctx.checkBody("resourceId").match(/^[0-9a-zA-Z]{40}$/, 'resourceId格式错误').value
            let viewingPolicy = ctx.checkBody('viewingPolicy').exist().type('object').value
            let contractId = ctx.checkBody('contractId').notEmpty().value
            let expireDate = ctx.checkBody('expireDate').isDate().toDate().value
            if (!this.app.type.object(viewingPolicy)) {
                ctx.errors.push({viewingPolicy: "viewingPolicy must be object"})
            }

            ctx.allowContentType({type: 'json'}).validate()

            await ctx.service.presentableService.createPresentable({
                name, nodeId, resourceId, viewingPolicy, contractId, userId: ctx.request.userId, expireDate
            }).bind(ctx).then(data => {
                ctx.success({presentableId: data._id, resourceId, contractId})
            }).catch(ctx.error)
        }

        /**
         * 删除节点消费方案
         * @param ctx
         * @returns {Promise.<void>}
         */
        async destroy(ctx) {

            let presentableId = ctx.checkParams("id").notEmpty().value

            await ctx.service.presentableService.updatePresentable({status: 1}, {_id: presentableId}).then().bind(ctx)
                .then(data => ctx.success(data ? data.ok > 0 : false)).catch(ctx.error)
        }
    }
}