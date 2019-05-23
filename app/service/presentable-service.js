'use strict'

const lodash = require('lodash')
const Service = require('egg').Service
const {AuthorizationError, ApplicationError} = require('egg-freelog-base/error')
const {signReleaseContractEvent, presentableVersionLockEvent} = require('../enum/presentable-events')
const releasePolicyCompiler = require('egg-freelog-base/app/extend/policy-compiler/release-policy-compiler')

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

        return this.presentableProvider.create(model).tap(presentableInfo => {
            app.emit(presentableVersionLockEvent, presentableInfo)
            this.batchSignReleaseContracts(nodeInfo.nodeId, presentableInfo.id, resolveReleases).then(contracts => {
                app.emit(signReleaseContractEvent, {presentableId: presentableInfo.id, contracts})
            }).catch(error => {
                console.error('presentable签约失败', error)
                presentableInfo.updateOne({contractStatus: 2}).exec()
            })
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

        const {ctx, app} = this
        let model = {}
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
                throw new ApplicationError(ctx.gettext('已上线的节点资源最少需要一个有效的授权策略'))
            }
        }

        const changedResolveReleases = []
        if (resolveReleases && resolveReleases.length) {
            const invalidResolveReleases = lodash.differenceBy(resolveReleases, presentableInfo.resolveReleases, x => x.releaseId)
            if (invalidResolveReleases.length) {
                throw new ApplicationError(ctx.gettext('release-scheme-update-resolve-release-invalid-error'), {invalidResolveReleases})
            }
            const intrinsicResolveReleases = []
            for (let i = 0, j = presentableInfo.resolveReleases.length; i < j; i++) {
                const resolveRelease = presentableInfo.resolveReleases[i]
                const newModel = resolveReleases.find(x => x.releaseId === resolveRelease.releaseId)
                if (!newModel) {
                    intrinsicResolveReleases.push(resolveRelease)
                    continue
                }
                newModel.contracts.forEach(item => {
                    var policyContractInfo = resolveRelease.contracts.find(x => x.policyId === item.policyId)
                    if (policyContractInfo) {
                        item.contractId = policyContractInfo.contractId
                    }
                })
                newModel.releaseName = resolveRelease.releaseName
                changedResolveReleases.push(newModel)
            }

            await this._validatePolicyIdentityAndSignAuth(presentableInfo.nodeId, changedResolveReleases, true)

            model.resolveReleases = [...changedResolveReleases, ...intrinsicResolveReleases]
        }

        const presentable = await this.presentableProvider.findOneAndUpdate({_id: presentableInfo.id}, model, {new: true})

        if (changedResolveReleases.length) {
            this.batchSignReleaseContracts(presentableInfo.nodeId, changedResolveReleases).then(contracts => {
                app.emit(signReleaseContractEvent, {presentableId: presentableInfo.id, contracts})
            })
        }

        return presentable
    }


    /**
     * 生成授权树
     * @returns {Promise<void>}
     */
    async generatePresentableAuthTree(presentableInfo) {

        const {ctx} = this
        const {releaseId, version} = presentableInfo.releaseInfo

        const presentableResolveReleases = presentableInfo.resolveReleases.map(item => {
            return {
                releaseId: item.releaseId,
                releaseName: item.releaseName,
                contracts: item.contracts,
                versions: item.releaseId === releaseId ? [{version}] : []
            }
        })

        //获取presentable所直接引用的发行的上抛树(用于分析presentable解决的上抛的具体版本集合)
        if (presentableResolveReleases.length > 1) {
            const releaseUpcastTree = await ctx.curlIntranetApi(`${ctx.webApi.releaseInfo}/${releaseId}/upcastTree?version=${version}&maxDeep=1`)
            for (let i = 0, j = presentableResolveReleases.length; i < j; i++) {
                let presentableResolveRelease = presentableResolveReleases[i]
                let releaseUpcast = releaseUpcastTree.find(x => x.releaseId === presentableResolveRelease.releaseId)
                if (releaseUpcast) {
                    presentableResolveRelease.versions = releaseUpcast.versions.map(x => Object({version: x.version}))
                }
            }
        }

        const allTasks = presentableResolveReleases.reduce((tasks, current) => {
            for (let i = 0, j = current.versions.length; i < j; i++) {
                let task = ctx.curlIntranetApi(`${ctx.webApi.releaseInfo}/${current.releaseId}/authTree?version=${current.versions[i].version}`)
                    .then(list => current.versions[i].resolveReleases = list)
                tasks.push(task)
            }
            return tasks
        }, [])

        return Promise.all(allTasks).then(() => presentableResolveReleases)
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

        return presentable.updateOne({isOnline}).then((model) => Boolean(model.ok))

        //presentable.isOnline = isOnline
        //this.app.emit(presentableOnlineOrOfflineEvent, presentable)
    }

    /**
     * 批量获取presentable合同状态
     * @param nodeId
     * @param presentableIds
     */
    async getPresentableContractState(nodeId, presentableIds) {

        const {ctx} = this
        const presentableMap = await this.presentableProvider.find({nodeId, _id: {$in: presentableIds}}, 'contracts')
            .then(list => new Map(list.map(x => [x.presentableId, x.contracts])))

        const contractIds = lodash.flatten(Array.from(presentableMap.values())).map(x => x.contractId)

        var contractMap = new Map()
        if (contractIds.length) {
            contractMap = await ctx.curlIntranetApi(`${ctx.webApi.contractInfo}/list?contractIds=${contractIds.toString()}&projection=status`)
                .then(contractList => new Map(contractList.map(x => [x.contractId, x])))
        }

        const result = []
        presentableIds.forEach(presentableId => {
            const contracts = presentableMap.get(presentableId)
            if (!contracts || !contracts.length) {
                result.push({presentableId, status: 0})
                return
            }

            let status = 1
            for (let i = 0; i < contracts.length; i++) {
                const contractInfo = contractMap.get(contracts[i].contractId)
                if (!contractInfo || contractInfo.status !== 4) {
                    status = 0
                    break
                }
            }
            result.push({presentableId, status})
        })

        return result
    }

    /**
     * 批量签约
     * @param nodeId
     * @param targetId
     * @param resolveReleases
     * @returns {Promise<*>}
     */
    async batchSignReleaseContracts(nodeId, presentableId, resolveReleases) {

        const {ctx, app, userId} = this
        if (!resolveReleases.length) {
            return []
        }

        const batchSignReleaseContractParams = {
            partyTwoId: nodeId,
            targetId: presentableId,
            partyTwoUserId: userId,
            contractType: app.contractType.ResourceToNode,
            signReleases: resolveReleases.map(item => Object({
                releaseId: item.releaseId,
                policyIds: item.contracts.map(x => x.policyId)
            }))
        }

        return ctx.curlIntranetApi(`${ctx.webApi.contractInfo}/batchCreateReleaseContracts`, {
            method: 'post', contentType: 'json', data: batchSignReleaseContractParams
        })
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
            throw new ApplicationError(ctx.gettext('resource-depend-resolve-integrity-validate-failed'), {untreatedReleases})
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
        const releasePolicies = lodash.chain(resolveReleases).map(x => x.contracts.map(m => `${x.releaseId}-${m.policyId}`)).flattenDeep().value()

        const authResults = await ctx.curlIntranetApi(`${ctx.webApi.authInfo}/releasePolicyIdentityAuthentication?nodeId=${nodeId}&releasePolicies=${releasePolicies.toString()}&isFilterSignedPolicy=${isFilterSignedPolicy ? 1 : 0}`)
        const identityAuthFailedPolices = authResults.filter(x => x.status !== 1)
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
                throw new ApplicationError(ctx.gettext('policy-create-duplicate-error'), item)
            }
            oldPolicyMap.set(newPolicy.policyId, newPolicy)
        })

        return Array.from(oldPolicyMap.values())
    }
}

module.exports = PresentableSchemeService