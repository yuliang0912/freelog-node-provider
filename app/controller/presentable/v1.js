/**
 * Created by yuliang on 2017/8/15.
 * presentable 面向用户消费策略相关API
 */

'use strict'

const lodash = require('lodash')
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

        const nodeId = ctx.checkQuery("nodeId").exist().isInt().toInt().value
        const resourceType = ctx.checkQuery('resourceType').optional().isResourceType().value
        const tags = ctx.checkQuery('tags').optional().len(1).toSplitArray().value
        const isOnline = ctx.checkQuery('isOnline').optional().toInt().default(0).value

        ctx.validate(false)

        const condition = {nodeId}
        if (resourceType) {
            condition['resourceInfo.resourceType'] = resourceType
        }
        if (tags) {
            condition.userDefinedTags = {$in: tags}
        }
        if (isOnline === 0 || isOnline === 1) {
            condition.isOnline = isOnline
        }

        var presentableList = await ctx.dal.presentableProvider.getPresentableList(condition)
        if (!presentableList.length) {
            ctx.success([])
        }

        const resourceMap = new Map(presentableList.map(x => [x.resourceId, null]))
        await ctx.curlIntranetApi(`${ctx.webApi.resourceInfo}/list?resourceIds=${Array.from(resourceMap.keys()).toString()}`).then(resourceList => {
            resourceList.forEach(item => resourceMap.set(item.resourceId, item))
        })

        presentableList = presentableList.map(item => {
            item = item.toObject()
            if (resourceMap.has(item.resourceId)) {
                const {resourceName, meta} = resourceMap.get(item.resourceId)
                item.resourceInfo.meta = meta
                item.resourceInfo.resourceName = resourceName
            }
            return item
        })

        ctx.success(presentableList)
    }

    /**
     * 展示消费策略
     * @param ctx
     * @returns {Promise.<void>}
     */
    async show(ctx) {

        const presentableId = ctx.checkParams("id").isMongoObjectId().value

        ctx.validate(false)

        await ctx.dal.presentableProvider.getPresentableById(presentableId).then(ctx.success).catch(ctx.error)
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

        const resourceInfo = await ctx.curlIntranetApi(`${ctx.webApi.resourceInfo}/${resourceId}`)
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

        await ctx.dal.presentableProvider.findOne({resourceId, nodeId}).then(oldInfo => {
            oldInfo && ctx.error({msg: '不能重复添加'})
        })

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

        const presentableId = ctx.checkParams("id").exist().isMongoObjectId().value

        ctx.validate()

        await ctx.dal.presentableProvider.updatePresentable({status: 1}, {_id: presentableId})
            .then(data => ctx.success(data.nModified > 0)).catch(ctx.error)
    }

    /**
     * 获取presentbale授权树
     * @param ctx
     * @returns {Promise<void>}
     */
    async presentableTree(ctx) {

        const presentableId = ctx.checkParams("presentableId").exist().isMongoObjectId().value

        ctx.validate(false)

        await ctx.dal.presentableAuthTreeProvider.findOne({presentableId}).then(ctx.success).catch(ctx.error)
    }

    /**
     * presentable 所分布在的节点
     * @param ctx
     * @returns {Promise<void>}
     */
    async resourceSubordinateNodes(ctx) {

        const resourceId = ctx.checkQuery('resourceId').isResourceId().value
        ctx.validate()

        const condition = {
            resourceId, userId: ctx.request.userId
        }

        await ctx.dal.presentableProvider.find(condition).map(x => new Object({
            nodeId: x.nodeId,
            resourceId: x.resourceId,
            presentableId: x._id.toString(),
            presentableName: x.presentableName,
        })).then(nodeList => {
            ctx.success(lodash.uniqBy(nodeList, 'nodeId'))
        }).catch(ctx.error)
    }

    /**
     * presentable下的节点合同状况
     * @param ctx
     * @returns {Promise<void>}
     */
    async contractInfos(ctx) {

        const nodeId = ctx.checkQuery('nodeId').exist().isInt().gt(1).value
        const presentableIds = ctx.checkQuery('presentableIds').exist().isSplitMongoObjectId().toSplitArray().len(1, 100).value
        ctx.validate()

        const presentableContractMap = new Map()
        const presentableInfos = await ctx.dal.presentableProvider.find({nodeId, _id: {$in: presentableIds}})

        presentableInfos.forEach(item => item.contracts.forEach(contract => {
            contract.contractId && presentableContractMap.set(contract.contractId, null)
        }))

        await ctx.curlIntranetApi(`${ctx.webApi.contractInfo}/list?contractIds=${Array.from(presentableContractMap.keys())}`).then(contractInfos => {
            contractInfos.forEach(item => presentableContractMap.set(item.contractId, item))
        })

        const result = presentableInfos.map(item => new Object({
            presentableId: item._id.toString(),
            presentableName: item.presentableName,
            status: item.status,
            isOnline: item.isOnline,
            createDate: item.createDate,
            contracts: item.contracts.map(x => {
                let contractInfo = presentableContractMap.get(x.contractId)
                return {
                    contractId: contractInfo.contractId,
                    resourceId: contractInfo.resourceId,
                    status: contractInfo.status,
                    createDate: contractInfo.createDate,
                    isMasterContract: contractInfo.resourceId === item.resourceId
                }
            }).sort(x => !x.isMasterContract)
        }))

        ctx.success(result)
    }
}