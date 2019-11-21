'use strict'

const lodash = require('lodash')
const Service = require('egg').Service
const {AuthorizationError, ApplicationError} = require('egg-freelog-base/error')
const {PresentableBindContractEvent} = require('../enum/rabbit-mq-publish-event')
const releasePolicyCompiler = require('egg-freelog-base/app/extend/policy-compiler/release-policy-compiler')
const {presentableVersionLockEvent, presentableSwitchOnlineStateEvent} = require('../enum/presentable-events')

class PresentableSchemeService extends Service {

    constructor({app, request}) {
        super(...arguments)
        this.userId = request.userId
        this.presentableProvider = app.dal.presentableProvider
    }

    /**
     * 创建presentable
     * @param releaseInfo
     * @param presentableName
     * @param resolveReleases
     * @param version
     * @param policies
     * @param nodeInfo
     * @param intro
     * @param userDefinedTags
     * @returns {Promise<model>}
     */
    async createPresentable({releaseInfo, presentableName, resolveReleases, version, policies, nodeInfo, intro, userDefinedTags}) {

        const {app, userId} = this
        await this._validateResolveReleases(releaseInfo, resolveReleases)
        await this._validatePolicyIdentityAndSignAuth(nodeInfo.nodeId, resolveReleases, false)

        const {releaseId, releaseName, resourceType} = releaseInfo
        const model = {
            userId, presentableName, intro, userDefinedTags, resolveReleases, policies: [],
            nodeId: nodeInfo.nodeId,
            releaseInfo: {
                releaseId, releaseName, resourceType, version
            }
        }
        if (!lodash.isEmpty(policies)) {
            model.policies = this._compilePolicies(policies)
        }

        const presentableInfo = await this.presentableProvider.create(model)

        return this.batchSignReleaseContracts(presentableInfo).then(model => {
            app.emit(presentableVersionLockEvent, model)
            return model
        })
    }

    /**
     * 更新presentable
     * @param presentableInfo
     * @param policyInfo
     * @param presentableName
     * @param userDefinedTags
     * @param resolveReleases
     * @param intro
     * @returns {Promise<Collection~findAndModifyWriteOpResultObject>}
     */
    async updatePresentable({presentableInfo, policyInfo, presentableName, userDefinedTags, resolveReleases, intro}) {

        let model = {}, {ctx, app} = this
        if (lodash.isString(intro)) {
            model.intro = intro
        }
        if (lodash.isString(presentableName)) {
            model.presentableName = presentableName
        }
        if (userDefinedTags) {
            model.userDefinedTags = userDefinedTags
        }
        if (policyInfo) {
            model.policies = this._policiesHandler(presentableInfo, policyInfo)
            if (presentableInfo.isOnline === 1 && !model.policies.some(x => x.status === 1)) {
                throw new ApplicationError(ctx.gettext('presentable-policy-offline-validate-error'))
            }
        }

        const beSignedContractReleases = []
        if (!lodash.isEmpty(resolveReleases)) {
            const invalidResolveReleases = lodash.differenceBy(resolveReleases, presentableInfo.resolveReleases, x => x.releaseId)
            if (invalidResolveReleases.length) {
                throw new ApplicationError(ctx.gettext('presentable-update-resolve-release-invalid-error'), {invalidResolveReleases})
            }
            const updatedResolveReleases = presentableInfo.toObject().resolveReleases
            for (let i = 0, j = resolveReleases.length; i < j; i++) {
                let {releaseId, contracts} = resolveReleases[i]
                let intrinsicResolve = updatedResolveReleases.find(x => x.releaseId === releaseId)
                intrinsicResolve.contracts = contracts
                beSignedContractReleases.push(intrinsicResolve)
            }
            await this._validatePolicyIdentityAndSignAuth(presentableInfo.nodeId, beSignedContractReleases, true)
        }

        const presentable = await this.presentableProvider.findOneAndUpdate({_id: presentableInfo.id}, model, {new: true})
        if (beSignedContractReleases.length) {
            return this.batchSignReleaseContracts(presentable, beSignedContractReleases).then(model => {
                app.rabbitClient.publish(Object.assign({}, PresentableBindContractEvent, {
                    body: model
                }))
                return model
            })
        }
        return presentable
    }

    /**
     * presentable上下线操作
     * @param presentable
     * @param isOnline
     * @returns {Promise<Bool>}
     * @constructor
     */
    async switchPresentableOnlineState(presentable, isOnline) {

        //TODO:上线逻辑检查(1.包含策略 2:节点资源授权链路需要通过)
        if (isOnline) {
            await this._onlineCheck(presentable)
        }

        return this.presentableProvider.findOneAndUpdate({_id: presentable.presentableId}, {isOnline}, {new: true}).then(model => {
            this.app.emit(presentableSwitchOnlineStateEvent, model)
            return true
        })
    }

    /**
     * 批量签约
     * @param nodeId
     * @param targetId
     * @param resolveReleases
     * @returns {Promise<*>}
     */
    async batchSignReleaseContracts(presentableInfo, changedResolveRelease = []) {

        const {ctx, app} = this
        const {nodeId, presentableId, resolveReleases} = presentableInfo

        const beSignReleases = changedResolveRelease.length ? changedResolveRelease : resolveReleases
        if (!beSignReleases.length) {
            return presentableInfo
        }

        const contracts = await ctx.curlIntranetApi(`${ctx.webApi.contractInfo}/batchCreateReleaseContracts`, {
            method: 'post', contentType: 'json', data: {
                partyTwoId: nodeId,
                contractType: app.contractType.ResourceToNode,
                signReleases: beSignReleases.map(item => Object({
                    releaseId: item.releaseId,
                    policyIds: item.contracts.map(x => x.policyId)
                }))
            }
        })

        const contractMap = new Map(contracts.map(x => [`${x.partyOne}_${x.policyId}`, x]))

        const updatedResolveReleases = resolveReleases.map(resolveRelease => {
            let changedResolveRelease = beSignReleases.find(x => x.releaseId === resolveRelease.releaseId)
            if (changedResolveRelease) {
                resolveRelease.contracts = changedResolveRelease.contracts.map(contractInfo => {
                    let signedContractInfo = contractMap.get(`${changedResolveRelease.releaseId}_${contractInfo.policyId}`)
                    if (signedContractInfo) {
                        contractInfo.contractId = signedContractInfo.contractId
                    }
                    return contractInfo
                })
            }
            return resolveRelease
        })

        return this.presentableProvider.findOneAndUpdate({_id: presentableId}, {
            resolveReleases: updatedResolveReleases, contractStatus: 2
        }, {new: true})
    }

    /**
     * 构建presentable递归结构的依赖树
     * @param flattenDependencies
     * @param startNid
     * @param maxDeep
     * @returns {*}
     */
    buildPresentableDependencyTree(flattenDependencies, startNid = "", isContainRootNode = true, maxDeep = 100) {

        const targetDependencyInfo = flattenDependencies.find(x => x.nid === startNid)
        if (!targetDependencyInfo) {
            return []
        }
        maxDeep = isContainRootNode ? maxDeep : maxDeep + 1

        function recursionBuildDependencyTree(dependencies, currDeep = 1) {
            if (!dependencies.length || currDeep++ >= maxDeep) {
                return
            }
            dependencies.forEach(item => {
                item.dependencies = flattenDependencies.filter(x => x.parentNid === item.nid)
                recursionBuildDependencyTree(item.dependencies, currDeep)
            })
        }

        recursionBuildDependencyTree([targetDependencyInfo])

        return isContainRootNode ? [targetDependencyInfo] : targetDependencyInfo.dependencies
    }

    /**
     *
     * @param releaseInfo
     * @param resolveReleases
     * @private
     */
    async _validateResolveReleases(releaseInfo, resolveReleases) {

        const {ctx} = this
        const allUntreatedReleases = releaseInfo.baseUpcastReleases.concat([{releaseId: releaseInfo.releaseId}])

        const untreatedReleases = lodash.differenceBy(allUntreatedReleases, resolveReleases, x => x.releaseId)
        if (untreatedReleases.length) {
            throw new ApplicationError(ctx.gettext('presentable-resolve-release-integrity-validate-failed'), {untreatedReleases})
        }

        const invalidResolveReleases = lodash.differenceBy(resolveReleases, allUntreatedReleases, x => x.releaseId)
        if (invalidResolveReleases.length) {
            throw new ApplicationError(ctx.gettext('params-validate-failed', 'resolveReleases'), {invalidResolveReleases})
        }

        const releaseMap = await ctx.curlIntranetApi(`${ctx.webApi.releaseInfo}/list?releaseIds=${resolveReleases.map(x => x.releaseId).toString()}&projection=releaseName,policies`)
            .then(list => new Map(list.map(x => [x.releaseId, x])))

        const invalidPolicies = []
        for (let i = 0, j = resolveReleases.length; i < j; i++) {
            let resolveRelease = resolveReleases[i]
            const releaseInfo = releaseMap.get(resolveRelease.releaseId)
            resolveRelease.releaseName = releaseInfo.releaseName
            resolveRelease.contracts.forEach(item => {
                if (!releaseInfo.policies.some(x => x.policyId === item.policyId && x.status === 1)) {
                    invalidPolicies.push({releaseId: resolveRelease.releaseId, policyId: item.policyId})
                }
            })
        }
        if (invalidPolicies.length) {
            throw new ApplicationError(ctx.gettext('params-validate-failed', 'resolveReleases'), {invalidPolicies})
        }
    }

    /**
     * 校验策略身份和签约授权
     * @param nodeId
     * @param resolveReleases
     * @param isFilterSignedPolicy
     * @returns {Promise<void>}
     * @private
     */
    async _validatePolicyIdentityAndSignAuth(nodeId, resolveReleases, isFilterSignedPolicy = true) {

        if (lodash.isEmpty(resolveReleases)) {
            return
        }

        const {ctx} = this
        const releaseIds = [], policyIds = []
        for (let i = 0, j = resolveReleases.length; i < j; i++) {
            let {releaseId, contracts} = resolveReleases[i]
            for (let x = 0; x < contracts.length; x++) {
                releaseIds.push(releaseId)
                policyIds.push(contracts[x].policyId)
            }
        }

        const authResults = await ctx.curlIntranetApi(`${ctx.webApi.authInfo}/releases/batchPolicyIdentityAuthentication?nodeId=${nodeId}&&releaseIds=${releaseIds.toString()}&policyIds=${policyIds}&isFilterSignedPolicy=${isFilterSignedPolicy ? 1 : 0}`)
        const identityAuthFailedPolices = authResults.filter(x => x.authenticationResult < 1)
        if (identityAuthFailedPolices.length) {
            throw new AuthorizationError(ctx.gettext('release-policy-identity-authorization-failed'), {identityAuthFailedPolices})
        }
    }

    /**
     * 编译策略
     * @param policies
     * @returns {*}
     * @private
     */
    _compilePolicies(policies) {

        return policies.map(({policyName, policyText}) => {
            let signAuth = 0
            let policyInfo = releasePolicyCompiler.compile(policyText, policyName)
            if (policyText.toLowerCase().includes('presentable')) {
                signAuth = signAuth | 2
            }
            if (policyText.toLowerCase().includes('recontractable')) {
                signAuth = signAuth | 1
            }
            policyInfo.signAuth = signAuth

            return policyInfo
        })
    }

    /**
     * 处理策略段变更
     * @param presentable
     * @param policies
     * @returns {*}
     * @private
     */
    _policiesHandler(presentable, policyInfo) {

        const {ctx} = this
        const {addPolicies, updatePolicies} = policyInfo

        const oldPolicyMap = new Map(presentable.policies.map(x => [x.policyId, x]))

        updatePolicies && updatePolicies.forEach(item => {
            let targetPolicy = oldPolicyMap.get(item.policyId)
            if (!targetPolicy) {
                throw new ApplicationError(ctx.gettext('params-validate-failed', 'policyId'), item)
            }
            targetPolicy.status = item.status
            targetPolicy.policyName = item.policyName
        })

        addPolicies && addPolicies.forEach(item => {
            let newPolicy = releasePolicyCompiler.compile(item.policyText, item.policyName)
            if (oldPolicyMap.has(newPolicy.policyId)) {
                throw new ApplicationError(ctx.gettext('presentable-policy-create-duplicate-error'), item)
            }
            oldPolicyMap.set(newPolicy.policyId, newPolicy)
        })

        return Array.from(oldPolicyMap.values())
    }

    /**
     * 上线检测
     * @param presentable
     * @returns {Promise<void>}
     * @private
     */
    async _onlineCheck(presentable) {

        const {ctx} = this
        const {presentableId, policies} = presentable
        if (!policies.some(x => x.status === 1)) {
            throw new ApplicationError(ctx.gettext('presentable-online-policy-validate-error'))
        }

        const authResults = await ctx.curlIntranetApi(`${ctx.webApi.authInfo}/presentables/batchNodeAndReleaseSideAuth?presentableIds=${presentableId}`)
        const presentableAuthResult = authResults.find(x => x.presentableId === presentableId)
        if (!presentableAuthResult || !presentableAuthResult.authResult.isAuth) {
            throw new ApplicationError(ctx.gettext('presentable-online-auth-validate-error'))
        }
    }

}

module.exports = PresentableSchemeService