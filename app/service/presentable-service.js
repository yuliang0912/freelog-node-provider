'use strict'

const lodash = require('lodash')
const Service = require('egg').Service
const commonRegex = require('egg-freelog-base/app/extend/helper/common_regex')

class PresentableSchemeService extends Service {

    /**
     * 创建presentable
     * @returns {Promise<void>}
     */
    async createPresentable(presentable) {

        const {ctx} = this

        if (Array.isArray(presentable.contracts) && presentable.contracts.length) {
            await this._checkPresentableContracts({presentable, contracts: presentable.contracts})
        }

        return ctx.dal.presentableProvider.createPresentable(presentable)
    }

    /**
     * 更新presentable
     * @returns {Promise<void>}
     */
    async updatePresentable({presentableName, userDefinedTags, policies, contracts, isOnline, presentable}) {

        const model = {presentableName: presentableName || presentable.presentableName}

        if (userDefinedTags) {
            model.userDefinedTags = userDefinedTags
        }
        if (policies) {
            model.policy = this._policiesHandler({presentable, policies})
        }
        if (contracts) {
            await this._checkPresentableContracts({presentable, contracts})
            model.contracts = presentable.contracts
            model.status = presentable.status
        }
        if (isOnline !== undefined) {
            this._checkIsCanPublish({presentable, isOnline})
            model.status = presentable.status
        }

        await this._updatePresentableAuthTree(presentable)

        return this.ctx.dal.presentableProvider.update({_id: presentable.presentableId}, model)
    }

    /**
     * 检查合同的完整性
     * @private
     */
    async _checkPresentableContracts({presentable, contracts}) {

        const {ctx} = this
        if (!contracts.length) {
            return
        }
        if (!contracts.some(x => x.resourceId === presentable.resourceId)) {
            ctx.error({msg: '合同数据校验失败,缺失完整性', data: contracts})
        }

        const uniqueCount = lodash.uniqWith(contracts, (x, y) => x.resourceId === y.resourceId).length
        if (uniqueCount !== contracts.length) {
            ctx.error({msg: '同一个资源只能选择一个策略或者合同'})
        }

        const contractMap = new Map()
        const contractResourceMap = new Map(contracts.map(x => [x.resourceId, x]))
        const contractIds = contracts.filter(x => x.contractId).map(x => x.contractId)
        if (contractIds.length) {
            await ctx.curlIntranetApi(`http://127.0.0.1:7008/v1/contracts/list?contractIds=${contractIds.toString()}`).then(contractList => {
                contractList.forEach(x => contractMap.set(x.contractId, x))
            })
        }
        if (contractMap.size !== contractIds.length) {
            ctx.error({msg: 'contractId数据校验失败', data: {contractMap, contractIds}})
        }

        contracts.forEach(item => {
            let contractInfo = contractMap.get(item.contractId)
            if (!contractInfo) {
                return
            }
            if (contractInfo.resourceId !== item.contractId || contractInfo.partyTwo !== presentable.nodeId) {
                ctx.error({msg: '合同信息与资源信息或者节点信息不匹配', data: {contractInfo}})
            }
            item.policySegmentId = contractInfo.segmentId
            item.authSchemeId = contractInfo.targetId
        })

        const allAuthSchemeIds = contracts.map(x => x.authSchemeId)
        const authSchemeList = await ctx.curlIntranetApi(`http://127.0.0.1:7001/v1/resources/authSchemes?authSchemeIds=${allAuthSchemeIds.toString()}`)

        const allAuthSchemeBubbleResourceIds = authSchemeList.reduce((acc, current) => {
            if (current.status !== 1) {
                ctx.error({msg: `授权点${current.authSchemeId}不可用`, data: current})
            }
            if (!contractResourceMap.has(current.resourceId) || contractResourceMap.get(current.resourceId).authSchemeId !== current.authSchemeId) {
                ctx.error({msg: 'resourceId与authSchemeId不匹配', data: {authScheme: current}})
            }
            return [...acc, ...current.bubbleResources.map(x => x.resourceId)]
        }, [presentable.resourceId])

        const diffResources = lodash.difference(Array.from(contractResourceMap.keys()), allAuthSchemeBubbleResourceIds)
        if (diffResources.length) {
            ctx.error({msg: '合同中存在无效的数据', data: {resourceIds: contractResourceMap.keys()}})
        }

        const newCreatedContracts = await this._batchCreatePresentableContracts({presentable, contracts})
        newCreatedContracts && newCreatedContracts.forEach(item => {
            let contractInfo = contractResourceMap.get(item.resourceId)
            contractInfo.contractId = item.contractId
        })

        //如果所有上抛的资源都已经被选择解决了,则表示具备完备态
        presentable.status = allAuthSchemeBubbleResourceIds.every(x => contractResourceMap.has(x)) ? 1 : 0
        presentable.contracts = contracts
    }

    /**
     * 构建presentable的授权树
     * @param presentable
     * @private
     */
    async _updatePresentableAuthTree(presentable) {

        if (presentable.status === 0) {
            return
        }

        const {ctx} = this
        const result = await this._buildContractTree(presentable.contracts).catch(ctx.error)
        return ctx.dal.presentableAuthTreeProvider.createOrUpdateAuthTree({
            nodeId: presentable.nodeId,
            presentableId: presentable.presentableId,
            masterResourceId: presentable.resourceId,
            authTree: this._flattenAuthTree(result)
        })
    }

    /**
     * 生产合同的构建树
     * @param contracts
     * @private
     */
    async _buildContractTree(associatedContracts = [], deep = 0) {

        if (!associatedContracts.length) {
            return []
        }

        const {ctx} = this
        const dataList = []
        const authSchemeIds = associatedContracts.map(x => x.authSchemeId)
        const authSchemeMap = await ctx.curlIntranetApi(`http://127.0.0.1:7001/v1/resources/authSchemes?authSchemeIds=${authSchemeIds.toString()}`)
            .then(dataList => new Map(dataList.map(x => [x.authSchemeId, x])))

        if (associatedContracts.length !== authSchemeMap.size) {
            throw new Error('授权树数据完整性校验失败')
        }

        for (let i = 0, j = associatedContracts.length; i < j; i++) {
            let {authSchemeId, contractId} = associatedContracts[i]
            let currentAuthScheme = authSchemeMap.get(authSchemeId)
            dataList.push({
                deep,
                authSchemeId,
                contractId,
                resourceId: currentAuthScheme.resourceId,
                children: await this._buildContractTree(currentAuthScheme.associatedContracts, deep + 1)
            })
        }

        return dataList
    }

    /**
     * 平铺授权树
     * @param presentableAuthTree
     * @returns {Promise<void>}
     * @private
     */
    _flattenAuthTree(presentableAuthTree) {

        const dataList = []

        const recursion = (children, parentAuthSchemeId = '') => {
            children.forEach(x => {
                let {deep, contractId, authSchemeId, resourceId, children} = x
                dataList.push({contractId, authSchemeId, resourceId, parentAuthSchemeId, deep,})
                children.length && recursion(children, authSchemeId)
            })
        }

        recursion(presentableAuthTree)

        return dataList
    }

    /**
     * 批量签约
     * @private
     */
    _batchCreatePresentableContracts({presentable, contracts}) {

        const {ctx, app, config} = this

        const body = {
            partyTwo: presentable.nodeId,
            contractType: app.contractType.ResourceToNode,
            signObjects: contracts.filter(x => x.contractId === undefined).map(x => new Object({
                targetId: x.authSchemeId,
                segmentId: x.policySegmentId
            }))
        }

        if (!body.signObjects.length) {
            return
        }

        //ctx.curlIntranetApi(`${config.gatewayUrl}/v1/contracts/batchCreateAuthSchemeContracts`,{
        return ctx.curlIntranetApi(`http://127.0.0.1:7008/v1/contracts/batchCreateAuthSchemeContracts`, {
            method: 'post',
            contentType: 'json',
            data: body,
            dataType: 'json'
        }).catch(ctx.error)
    }

    /**
     * 检查presentable是否达到可以上线的标准
     * @param presentable
     * @private
     */
    _checkIsCanPublish({presentable, isOnline}) {
        if (isOnline === undefined || (isOnline === 0 && presentable.status < 2)) {
            return
        }
        if (isOnline === 0) {
            presentable.status = 1
            return
        }
        const {ctx} = this
        if (!presentable.presentableName.length) {
            ctx.error({msg: 'presentableName为空,不能设置为发布状态'})
        }
        if (!presentable.policy.length) {
            ctx.error({msg: '策略段为空,不能设置为发布状态'})
        }
        if (presentable.status === 0) {
            ctx.error({msg: '未解决全部上抛的资源,不能设置为发布状态'})
        }
        if (presentable.contracts.some(x => !commonRegex.mongoObjectId.test(x.contractId))) {
            ctx.error({msg: '未签约全部上抛的资源,不能设置为发布状态'})
        }

        presentable.status = 2
    }

    /**
     * 处理策略段变更
     * @param authScheme
     * @param policies
     * @returns {*}
     * @private
     */
    _policiesHandler({presentable, policies}) {

        let {ctx} = this
        let {removePolicySegments, addPolicySegments, updatePolicySegments} = policies
        let oldPolicySegmentMap = new Map(presentable.policy.map(x => [x.segmentId, x]))

        removePolicySegments && removePolicySegments.forEach(oldPolicySegmentMap.delete)

        updatePolicySegments && updatePolicySegments.forEach(item => {
            let targetPolicySegment = oldPolicySegmentMap.get(item.policySegmentId)
            if (!targetPolicySegment) {
                throw Object.assign(new Error("未能找到需要更新的策略段"), {data: targetPolicySegment})
            }
            targetPolicySegment.policyName = item.policyName
            targetPolicySegment.status = item.status
        })

        addPolicySegments && addPolicySegments.forEach(item => {
            let newPolicy = ctx.helper.policyCompiler(item)
            if (oldPolicySegmentMap.has(newPolicy.segmentId)) {
                throw Object.assign(new Error("不能添加已经存在的策略段"), {data: newPolicy})
            }
            oldPolicySegmentMap.set(newPolicy.segmentId, newPolicy)
        })

        return Array.from(oldPolicySegmentMap.values())
    }
}

module.exports = PresentableSchemeService