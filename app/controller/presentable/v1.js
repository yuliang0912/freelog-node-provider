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

    constructor({app}) {
        super(...arguments)
        this.presentableProvider = app.dal.presentableProvider
        this.presentableAuthTreeProvider = app.dal.presentableAuthTreeProvider
    }

    /**
     * 展示节点所有的消费方案
     * @param ctx
     * @returns {Promise.<void>}
     */
    async index(ctx) {

        const nodeId = ctx.checkQuery("nodeId").exist().isInt().toInt().value
        const resourceType = ctx.checkQuery('resourceType').optional().isResourceType().value
        const tags = ctx.checkQuery('tags').optional().len(1).toSplitArray().value
        const isOnline = ctx.checkQuery('isOnline').optional().toInt().default(1).value

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

        var presentableList = await this.presentableProvider.find(condition)
        if (!presentableList.length) {
            return ctx.success([])
        }

        const resourceMap = new Map(presentableList.map(x => [x.resourceId, null]))
        await ctx.curlIntranetApi(`${ctx.webApi.resourceInfo}/list?resourceIds=${Array.from(resourceMap.keys()).toString()}`).then(resourceList => {
            resourceList.forEach(item => resourceMap.set(item.resourceId, item))
        })

        presentableList = presentableList.map(item => {
            item = item.toObject()
            if (resourceMap.has(item.resourceId)) {
                item.resourceInfo = lodash.pick(resourceMap.get(item.resourceId), ['resourceName', 'resourceType', 'meta'])
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

        const presentableId = ctx.checkParams("id").isPresentableId().value

        ctx.validate(false)

        var presentableInfo = await this.presentableProvider.findById(presentableId)
        if (presentableInfo) {
            await ctx.curlIntranetApi(`${ctx.webApi.resourceInfo}/${presentableInfo.resourceId}`).then(resourceInfo => {
                presentableInfo = presentableInfo.toObject()
                presentableInfo.resourceInfo = lodash.pick(resourceInfo, ['resourceName', 'resourceType', 'meta'])
            })
        }

        ctx.success(presentableInfo)
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
        const presentableIntro = ctx.checkBody('presentableIntro').optional().type('string').len(2, 500).value

        //const contracts = ctx.checkBody('contracts').optional().isArray().value
        ctx.allowContentType({type: 'json'}).validate()

        const resourceInfo = await ctx.curlIntranetApi(`${ctx.webApi.resourceInfo}/${resourceId}`)
        if (!resourceInfo || resourceInfo.status !== 2) {
            ctx.error({msg: '未能找到有效的资源', data: {resourceInfo}})
        }

        const nodeInfo = await ctx.dal.nodeProvider.findOne({nodeId})
        if (!nodeInfo || nodeInfo.ownerUserId !== userId) {
            ctx.error({msg: '未能找到有效的节点信息', data: {nodeInfo}})
        }

        // if (contracts) {
        //     const result = presentableContractSchema.validate(contracts, presentableContractSchema.presentableContractsValidator)
        //     result.errors.length && ctx.error({msg: '参数contracts格式校验失败', data: result.errors})
        // }

        await this.presentableProvider.findOne({resourceId, nodeId}).then(oldInfo => {
            oldInfo && ctx.error({msg: '不能重复添加'})
        })

        const presentable = {
            nodeId, resourceId, resourceInfo, userId,
            presentableName: presentableName || '',
            presentableIntro: presentableIntro || '',
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
        const presentableIntro = ctx.checkBody('presentableIntro').optional().type('string').len(2, 500).value

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

        const presentable = await this.presentableProvider.findById(presentableId)
        if (!presentable || presentable.userId !== ctx.request.userId) {
            ctx.error({msg: '参数presentableId错误或者没有操作权限'})
        }

        await ctx.service.presentableService.updatePresentable({
            presentableName, userDefinedTags, presentableIntro, policies, contracts, isOnline, presentable
        }).then(() => this.presentableProvider.findById(presentableId)).then(ctx.success).catch(ctx.error)
    }

    /**
     * 删除节点消费方案
     * @param ctx
     * @returns {Promise.<void>}
     */
    async destroy(ctx) {

        const presentableId = ctx.checkParams("id").exist().isPresentableId().value

        ctx.validate()

        const presentableInfo = await this.presentableProvider.findById(presentableId)

        if (!presentableInfo || presentableInfo.userId !== ctx.request.userId) {
            ctx.error({msg: '未找到节点资源或者没有权限', data: {presentableInfo}})
        }

        await presentableInfo.updateOne({status: 1}).then(data => ctx.success(data.nModified > 0)).catch(ctx.error)
    }

    /**
     * 获取presentable授权树
     * @param ctx
     * @returns {Promise<void>}
     */
    async presentableTree(ctx) {

        const presentableId = ctx.checkParams("presentableId").exist().isPresentableId().value

        ctx.validate(false)

        await this.presentableAuthTreeProvider.findOne({presentableId}).then(ctx.success).catch(ctx.error)
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

        await this.presentableProvider.find(condition).map(model => lodash.pick(model, ['nodeId', 'resourceId', 'presentableId', 'presentableName'])).then(nodeList => {
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
        const presentableInfos = await this.presentableProvider.find({nodeId, _id: {$in: presentableIds}})

        presentableInfos.forEach(item => item.contracts.forEach(contract => {
            contract && contract.contractId && presentableContractMap.set(contract.contractId, null)
        }))

        if (presentableContractMap.size > 0) {
            await ctx.curlIntranetApi(`${ctx.webApi.contractInfo}/list?contractIds=${Array.from(presentableContractMap.keys())}`).then(contractInfos => {
                contractInfos.forEach(item => presentableContractMap.set(item.contractId, item))
            })
        }

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