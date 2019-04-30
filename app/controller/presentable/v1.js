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
        const page = ctx.checkQuery("page").default(1).toInt().gt(0).value
        const pageSize = ctx.checkQuery("pageSize").default(10).gt(0).lt(101).toInt().value
        const order = ctx.checkQuery("order").optional().in(['isOnline']).value
        const asc = ctx.checkQuery("asc").optional().default(0).in([0, 1]).value
        const projection = ctx.checkQuery('projection').optional().toSplitArray().value
        const isSignContract = ctx.checkQuery('isSignContract').optional().toInt().in([0, 1, 2]).value
        const keywords = ctx.checkQuery('keywords').optional().type('string').len(1, 100).value

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
        if (isSignContract === 0) {
            condition.masterContractId = ''
        }
        if (isSignContract === 1) {
            condition.masterContractId = {$ne: ''}
        }
        if (keywords !== undefined) {
            let searchExp = {$regex: keywords, $options: 'i'}
            condition.$or = [{presentableName: searchExp}, {'resourceInfo.resourceName': searchExp}]
        }

        var presentableList = [], projectionStr = null
        if (projection && projection.length) {
            projectionStr = projection.join(' ')
        }
        const totalItem = await this.presentableProvider.count(condition)
        if (totalItem > (page - 1) * pageSize) {
            presentableList = await this.presentableProvider.findPageList(condition, page, pageSize, projectionStr, {createDate: -1})
        }
        const resourceMap = new Map(presentableList.map(x => [x.resourceId, null]))
        const resourceIds = Array.from(resourceMap.keys()).toString()
        if (resourceIds) {
            await ctx.curlIntranetApi(`${ctx.webApi.resourceInfo}/list?resourceIds=${Array.from(resourceMap.keys()).toString()}`).then(resourceList => {
                resourceList.forEach(item => resourceMap.set(item.resourceId, item))
            })
            const resourceFiled = ['userId', 'userName', 'resourceName', 'resourceType', 'meta', 'purpose', 'previewImages', 'createDate', 'updateDate']
            presentableList = presentableList.map(item => {
                item = item.toObject()
                if (resourceMap.has(item.resourceId)) {
                    item.resourceInfo = lodash.pick(resourceMap.get(item.resourceId), resourceFiled)
                }
                return item
            })
        }
        ctx.success({page, pageSize, totalItem, dataList: presentableList})
    }

    /**
     * 获取presentable列表
     * @param ctx
     * @returns {Promise<void>}
     */
    async list(ctx) {

        const userId = ctx.checkQuery('userId').optional().toInt().gt(0).value
        const nodeId = ctx.checkQuery('nodeId').optional().toInt().gt(0).value
        const presentableIds = ctx.checkQuery('presentableIds').exist().isSplitMongoObjectId().toSplitArray().len(1).value
        const projection = ctx.checkQuery('projection').optional().toSplitArray().value

        ctx.validate()

        const condition = {
            _id: {$in: presentableIds}
        }
        if (userId) {
            condition.userId = userId
        }
        if (nodeId) {
            condition.nodeId = nodeId
        }
        var projectionStr = null
        if (projection && projection.length) {
            projectionStr = projection.join(' ')
        }

        await this.presentableProvider.find(condition, projectionStr).then(ctx.success)
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
            const resourceFiled = ['userId', 'userName', 'resourceName', 'resourceType', 'meta', 'purpose', 'previewImages', 'createDate', 'updateDate']
            await ctx.curlIntranetApi(`${ctx.webApi.resourceInfo}/${presentableInfo.resourceId}`).then(resourceInfo => {
                presentableInfo = presentableInfo.toObject()
                presentableInfo.resourceInfo = lodash.pick(resourceInfo, resourceFiled)
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
        ctx.allowContentType({type: 'json'}).validate()

        const resourceInfo = await ctx.curlIntranetApi(`${ctx.webApi.resourceInfo}/${resourceId}`)
        if (!resourceInfo || resourceInfo.status !== 2) {
            ctx.error({msg: ctx.gettext('缺少有效资源信息'), data: {resourceInfo}})
        }

        const nodeInfo = await ctx.dal.nodeProvider.findOne({nodeId})
        if (!nodeInfo || nodeInfo.ownerUserId !== userId) {
            ctx.error({msg: ctx.gettext('缺少有效节点信息'), data: {nodeInfo}})
        }
        await this.presentableProvider.findOne({resourceId, nodeId}).then(oldInfo => {
            oldInfo && ctx.error({msg: ctx.gettext('已经添加的节点资源,不能重复添加')})
        })

        const presentable = {
            nodeId, resourceId, resourceInfo, userId,
            presentableName: presentableName || resourceInfo.resourceName,
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
        //const isOnline = ctx.checkBody('isOnline').optional().toInt().in([0, 1]).value
        const presentableIntro = ctx.checkBody('presentableIntro').optional().type('string').len(2, 500).value

        ctx.allowContentType({type: 'json'}).validate()

        if ([policies, presentableName, userDefinedTags, contracts].every(x => x === undefined)) {
            ctx.error({msg: ctx.gettext('缺少必要的参数')})
        }
        if (policies) {
            const result = batchOperationPolicySchema.validate(policies, batchOperationPolicySchema.authSchemePolicyValidator)
            result.errors.length && ctx.error({msg: ctx.gettext('参数%s格式校验失败', 'policies'), data: result.errors})
        }
        if (contracts) {
            const result = presentableContractSchema.validate(contracts, presentableContractSchema.presentableContractsValidator)
            result.errors.length && ctx.error({msg: ctx.gettext('参数%s格式校验失败', 'contracts'), data: result.errors})
        }

        const presentable = await this.presentableProvider.findById(presentableId)
        if (!presentable || presentable.userId !== ctx.request.userId) {
            ctx.error({msg: ctx.gettext('参数%s错误或者没有操作权限', 'presentableId')})
        }
        await ctx.service.presentableService.updatePresentable({
            presentableName, userDefinedTags, presentableIntro, policies, contracts, presentable
        }).then(ctx.success).catch(ctx.error)
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
            ctx.error({msg: ctx.gettext('未找到节点资源或者没有权限'), data: {presentableInfo}})
        }
        if (presentableInfo.masterContractId) {
            ctx.error({msg: ctx.gettext('已签约的节点资源不允许删除'), data: {presentableInfo}})
        }

        const task1 = this.app.dal.dataRecycleBinProvider.create({
            primaryKey: presentableId,
            dataType: 'presentable',
            data: presentableInfo.toObject()
        })

        const task2 = this.presentableProvider.deleteOne({_id: presentableId})

        await Promise.all([task1, task2]).then(() => ctx.success(true))
    }

    /**
     * 上线或下线
     * @returns {Promise<void>}
     */
    async onlineOrOffline(ctx) {

        const presentableId = ctx.checkParams("presentableId").exist().isPresentableId().value
        const isOnline = ctx.checkBody("isOnline").exist().toInt().in([0, 1]).value
        ctx.validate()

        const presentableInfo = await this.presentableProvider.findById(presentableId)
        if (!presentableInfo || presentableInfo.userId !== ctx.request.userId) {
            ctx.error({msg: ctx.gettext('未找到节点资源或者没有权限'), data: {presentableInfo}})
        }

        if (presentableInfo.isOnline === isOnline) {
            return ctx.success(presentableInfo)
        }
        if (isOnline) {
            const resourceInfo = await ctx.curlIntranetApi(`${ctx.webApi.resourceInfo}/${presentableInfo.resourceId}`)
            if ((resourceInfo.purpose & 2) != 2) {
                ctx.error({msg: ctx.gettext('原资源未提供包含presentable授权的策略,无法上线'), data: {resourceInfo}})
            }
        }

        await ctx.service.presentableService.presentableOnlineOrOffline(presentableInfo, isOnline).then(ctx.success)
    }

    /**
     * 获取presentable授权树
     * @param ctx
     * @returns {Promise<void>}
     */
    async presentableAuthTree(ctx) {

        const presentableId = ctx.checkParams("presentableId").exist().isPresentableId().value

        ctx.validate(false)

        await this.presentableAuthTreeProvider.findOne({presentableId}).then(ctx.success).catch(ctx.error)
    }

    /**
     * 获取presentable授权树
     * @param ctx
     * @returns {Promise<void>}
     */
    async presentableTrees(ctx) {

        const presentableIds = ctx.checkQuery('presentableIds').exist().isSplitMongoObjectId().toSplitArray().len(1, 99).value
        ctx.validate(false)

        await this.presentableAuthTreeProvider.find({presentableId: {$in: presentableIds}}).then(ctx.success).catch(ctx.error)
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
            presentableId: item.presentableId.toString(),
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

    /**
     * 批量获取presentable合同状态
     * @param ctx
     * @returns {Promise<void>}
     */
    async getPresentableContractState(ctx) {

        const nodeId = ctx.checkQuery("nodeId").exist().toInt().value
        const presentableIds = ctx.checkQuery('presentableIds').exist().isSplitMongoObjectId().toSplitArray().len(1, 20).value
        ctx.validate()

        await ctx.service.presentableService.getPresentableContractState(nodeId, presentableIds).then(ctx.success)
    }
}