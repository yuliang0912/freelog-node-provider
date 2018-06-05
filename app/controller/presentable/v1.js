/**
 * Created by yuliang on 2017/8/15.
 * presentable 面向用户消费策略相关API
 */

'use strict'

const Controller = require('egg').Controller
const batchOperationPolicySchema = require('../../extend/json-schema/batch-operation-policy-schema')
const presentableContractSchema = require('../../extend/json-schema/presentable-contracts-schema')

module.exports = class PresentableController extends Controller {

    /**
     * 展示节点所有的消费方案
     * @param ctx
     * @returns {Promise.<void>}
     */
    async index(ctx) {

        let nodeId = ctx.checkQuery("nodeId").exist().isInt().toInt().value
        let resourceType = ctx.checkQuery('resourceType').optional().isResourceType().value
        let tags = ctx.checkQuery('tags').optional().len(1).toSplitArray().value

        ctx.validate(false)

        let condition = {nodeId, status: 0}
        if (resourceType) {
            condition['resourceInfo.resourceType'] = resourceType
        }
        if (tags) {
            condition.userDefinedTags = {$in: tags}
        }

        await ctx.dal.presentableProvider.getPresentableList(condition).then(ctx.success).catch(ctx.error)
    }

    /**
     * 展示消费策略
     * @param ctx
     * @returns {Promise.<void>}
     */
    async show(ctx) {

        let presentableId = ctx.checkParams("id").isMongoObjectId().value

        ctx.validate(false)

        await ctx.dal.presentableProvider.getPresentable({
            _id: presentableId,
            status: 0
        }).then(ctx.success).catch(ctx.error)
    }

    /**
     * 创建节点消费方案
     * @param ctx
     * @returns {Promise.<void>}
     */
    async create(ctx) {

        const userId = ctx.request.userId
        const nodeId = ctx.checkBody('nodeId').toInt().gt(0).value
        const resourceId = ctx.checkBody('resourceId').isResourceId().value
        const presentableName = ctx.checkBody('presentableName').optional().len(2, 50).type('string').value
        //const contracts = ctx.checkBody('contracts').optional().isArray().value
        ctx.allowContentType({type: 'json'}).validate()

        const resourceInfo = await ctx.curlIntranetApi(`http://127.0.0.1:7001/v1/resources/${resourceId}`)
        //const resourceInfo = await ctx.curlIntranetApi(`${this.config.gatewayUrl}/api/v1/resources/${resourceId}`)
        if (!resourceInfo || resourceInfo.status !== 2) {
            ctx.error({msg: '未能找到有效的资源', data: {resourceInfo}})
        }

        const nodeInfo = await ctx.dal.nodeProvider.getNodeInfo({nodeId})
        if (!nodeInfo || nodeInfo.ownerUserId !== userId) {
            ctx.error({msg: '未能找到有效的节点信息', data: {nodeInfo}})
        }

        // if (contracts) {
        //     const result = presentableContractSchema.validate(contracts, presentableContractSchema.presentableContractsValidator)
        //     result.errors.length && ctx.error({msg: '参数contracts格式校验失败', data: result.errors})
        // }

        // await ctx.dal.presentableProvider.findOne({resourceId, nodeId}).then(oldInfo => {
        //     oldInfo && ctx.error({msg: '不能重复添加'})
        // })

        const presentable = {
            nodeId, resourceId, resourceInfo, userId,
            presentableName: presentableName || '',
            nodeName: nodeInfo.nodeName,
            status: 0
        }

        await ctx.service.presentableService.createPresentable(presentable).then(ctx.success).catch(ctx.error)
    }

    /**
     * 更新presentable
     * @param ctx
     * @returns {Promise<void>}
     */
    async update(ctx) {

        const presentableId = ctx.checkParams("id").exist().isMongoObjectId().value
        const policies = ctx.checkBody('policies').optional().isObject().value
        const presentableName = ctx.checkBody('presentableName').optional().type('string').len(2, 50).value
        const userDefinedTags = ctx.checkBody('userDefinedTags').optional().isArray().value
        const contracts = ctx.checkBody('contracts').optional().isArray().value
        const isOnline = ctx.checkBody('isOnline').optional().toInt().in([0, 1]).value
        ctx.allowContentType({type: 'json'}).validate()

        if ([policies, presentableName, userDefinedTags, contracts, isOnline].every(x => x === undefined)) {
            ctx.error({msg: '缺少必要的参数'})
        }
        if (policies) {
            const result = batchOperationPolicySchema.validate(policies, batchOperationPolicySchema.authSchemePolicyValidator)
            result.errors.length && ctx.error({msg: '参数policies格式校验失败', data: result.errors})
        }
        if (contracts) {
            const result = presentableContractSchema.validate(contracts, presentableContractSchema.presentableContractsValidator)
            result.errors.length && ctx.error({msg: '参数contracts格式校验失败', data: result.errors})
        }

        const presentable = await ctx.dal.presentableProvider.getPresentableById(presentableId)
        if (!presentable || presentable.userId !== ctx.request.userId) {
            ctx.error({msg: '参数presentableId错误或者没有操作权限'})
        }

        await ctx.service.presentableService.updatePresentable({
            presentableName,
            userDefinedTags,
            policies,
            contracts,
            isOnline,
            presentable: presentable.toObject()
        }).then(() => ctx.dal.presentableProvider.getPresentableById(presentableId)).then(ctx.success).catch(ctx.error)
    }

    /**
     * 删除节点消费方案
     * @param ctx
     * @returns {Promise.<void>}
     */
    async destroy(ctx) {

        let presentableId = ctx.checkParams("id").exist().isMongoObjectId().value

        ctx.validate()

        await ctx.dal.presentableProvider.updatePresentable({status: 1}, {_id: presentableId})
            .then(data => ctx.success(data.nModified > 0)).catch(ctx.error)
    }
}