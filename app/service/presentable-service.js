'use strict'

const lodash = require('lodash')
const Service = require('egg').Service
const presentableEvents = require('../enum/presentable-events')
const {LogicError, ApplicationError} = require('egg-freelog-base/error')

class PresentableSchemeService extends Service {

    constructor({app}) {
        super(...arguments)
        this.presentableProvider = app.dal.presentableProvider
    }

    /**
     * 创建presentable
     * @returns {Promise<void>}
     */
    async createPresentable(presentable) {

        const {app, presentableProvider} = this

        // if (Array.isArray(presentable.contracts) && presentable.contracts.length) {
        //     await this._checkPresentableContracts({presentable, contracts: presentable.contracts})
        // }

        return presentableProvider.createPresentable(presentable).tap(presentableInfo => {
            app.emit(presentableEvents.createPresentableEvent, {presentable: presentableInfo})
        })
    }

    /**
     * 更新presentable
     * @returns {Promise<void>}
     */
    async updatePresentable({presentableName, userDefinedTags, presentableIntro, policies, contracts, isOnline, presentable}) {

        var presentableStatusTemp = 0
        const model = {presentableName: presentableName || presentable.presentableName}
        if (userDefinedTags) {
            model.userDefinedTags = userDefinedTags
        }
        if (presentableIntro !== undefined) {
            model.presentableIntro = presentableIntro
        }
        if (policies) {
            this._policiesHandler({presentable, policies})
            model.policy = presentable.policy
            if ((presentable.status & 2) === 2) {
                presentableStatusTemp = presentableStatusTemp | 2
            }
        }
        if (contracts) {
            await this._checkPresentableContracts({presentable, contracts})
            model.contracts = presentable.contracts
            if ((presentable.status & 1) === 1) {
                presentableStatusTemp = presentableStatusTemp | 1
            }
        }
        if (isOnline !== undefined) {
            model.isOnline = presentable.isOnline = isOnline
            if (isOnline === 1) {
                this._checkPresentableStatus(presentable)
            }
        }

        await this._updatePresentableAuthTree(presentable)
        return this.presentableProvider.findOneAndUpdate({_id: presentable.presentableId}, {model}, {new: true}).then(newPresentableInfo => {
            if ((newPresentableInfo.status & 4) === 4) {
                newPresentableInfo.status = presentableStatusTemp | 4
            } else {
                newPresentableInfo.status = presentableStatusTemp
            }
            return newPresentableInfo.updateOne({status: newPresentableInfo.status})
        })
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

        const masterResourceContract = contracts.find(x => x.resourceId === presentable.resourceId)
        if (!masterResourceContract) {
            throw new LogicError('合同数据校验失败,缺失完整性', contracts)
        }

        const uniqueCount = lodash.uniqWith(contracts, (x, y) => x.resourceId === y.resourceId).length
        if (uniqueCount !== contracts.length) {
            throw new LogicError('同一个资源只能选择一个策略或者合同')
        }

        const contractMap = new Map()
        const contractResourceMap = new Map(contracts.map(x => [x.resourceId, x]))
        const contractIds = contracts.filter(x => x.contractId).map(x => x.contractId)
        if (contractIds.length) {
            await ctx.curlIntranetApi(`${ctx.webApi.contractInfo}/list?contractIds=${contractIds.toString()}`).then(contractList => {
                contractList.forEach(x => contractMap.set(x.contractId, x))
            })
        }
        if (contractMap.size !== contractIds.length) {
            throw new ApplicationError('contractId数据校验失败', {contractMap, contractIds})
        }

        contracts.forEach(item => {
            let contractInfo = contractMap.get(item.contractId)
            if (!contractInfo) {
                return
            }
            if (contractInfo.resourceId !== item.resourceId || contractInfo.partyTwo !== presentable.nodeId.toString()) {
                throw new LogicError('合同信息与资源信息或者节点信息不匹配', contractInfo)
            }
            item.policySegmentId = contractInfo.segmentId
            item.authSchemeId = contractInfo.targetId
        })

        const allAuthSchemeIds = contracts.map(x => x.authSchemeId)
        const authSchemeList = await ctx.curlIntranetApi(`${ctx.webApi.authSchemeInfo}?authSchemeIds=${allAuthSchemeIds.toString()}`)

        const allAuthSchemeBubbleResourceIds = authSchemeList.reduce((acc, current) => {
            if (current.status !== 1) {
                throw new ApplicationError(`授权点${current.authSchemeId}不可用`, current)
            }
            if (!contractResourceMap.has(current.resourceId) || contractResourceMap.get(current.resourceId).authSchemeId !== current.authSchemeId) {
                throw new LogicError('resourceId与authSchemeId不匹配', {authScheme: current})
            }
            return [...acc, ...current.bubbleResources.map(x => x.resourceId)]
        }, [presentable.resourceId])

        const diffResources = lodash.difference(Array.from(contractResourceMap.keys()), allAuthSchemeBubbleResourceIds)
        if (diffResources.length) {
            throw new LogicError('合同中存在无效的资源数据', {resourceIds: diffResources})
        }

        const newCreatedContracts = await this._batchCreatePresentableContracts({presentable, contracts})
        newCreatedContracts && newCreatedContracts.forEach(item => {
            let contractInfo = contractResourceMap.get(item.resourceId)
            contractInfo.contractId = item.contractId
            contractMap.set(item.contractId, item)
        })

        //如果所有上抛的资源都已经被选择解决了,则表示具备完备态
        if (allAuthSchemeBubbleResourceIds.every(x => contractResourceMap.has(x))) {
            presentable.status = presentable.status | 1
        } else if ((presentable.status & 1) === 1) {
            presentable.status = presentable.status ^ 1
        }

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
        const result = await this._buildContractTree(presentable.contracts)
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

        const authSchemeMap = await ctx.curlIntranetApi(`${ctx.webApi.authSchemeInfo}?authSchemeIds=${authSchemeIds.toString()}`)
            .then(dataList => new Map(dataList.map(x => [x.authSchemeId, x])))

        if (associatedContracts.length !== authSchemeMap.size) {
            throw new ApplicationError('授权树数据完整性校验失败')
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

        const {ctx, app} = this

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

        return ctx.curlIntranetApi(`${ctx.webApi.contractInfo}/batchCreateAuthSchemeContracts`, {
            method: 'post',
            contentType: 'json',
            data: body,
            dataType: 'json'
        })
    }

    /**
     * 处理策略段变更
     * @param authScheme
     * @param policies
     * @returns {*}
     * @private
     */
    _policiesHandler({presentable, policies}) {

        const {ctx} = this
        const {removePolicySegments, addPolicySegments, updatePolicySegments} = policies
        const oldPolicySegmentMap = new Map(presentable.policy.map(x => [x.segmentId, x]))

        removePolicySegments && removePolicySegments.forEach(oldPolicySegmentMap.delete)

        updatePolicySegments && updatePolicySegments.forEach(item => {
            let targetPolicySegment = oldPolicySegmentMap.get(item.policySegmentId)
            if (!targetPolicySegment) {
                throw new ApplicationError('未能找到需要更新的策略段', targetPolicySegment)
            }
            targetPolicySegment.policyName = item.policyName
            targetPolicySegment.status = item.status
        })

        addPolicySegments && addPolicySegments.forEach(item => {
            let newPolicy = ctx.helper.policyCompiler(item)
            console.log(newPolicy)
            if (oldPolicySegmentMap.has(newPolicy.segmentId)) {
                throw new ApplicationError('不能添加已经存在的策略段', newPolicy)
            }
            oldPolicySegmentMap.set(newPolicy.segmentId, newPolicy)
        })

        presentable.policy = Array.from(oldPolicySegmentMap.values())
        if (presentable.policy.some(x => x.status === 1)) {
            presentable.status = presentable.status | 2
        } else if ((presentable.status & 2) === 2) {
            presentable.status = presentable.status ^ 2
        }
    }


    /**
     * 检查presentable是否达到可以上线的标准
     * @param presentable
     * @private
     */
    _checkPresentableStatus(presentable) {

        const isCompleteSignContracts = (presentable.status & 1) === 1
        const isExistEffectivePolicy = (presentable.status & 2) === 2
        const isCanRecontractable = (presentable.status & 4) === 4

        if (presentable.isOnline === 1 && !(isCompleteSignContracts && isExistEffectivePolicy && isCanRecontractable)) {
            const errMsg = !isExistEffectivePolicy ? 'presentable不存在有效的策略段,不能发布' :
                !isCompleteSignContracts ? '未解决全部上抛的资源,不能发布' : 'presentable主资源合同未执行到可上线状态'
            throw new LogicError(errMsg)
        }
    }
}

module.exports = PresentableSchemeService