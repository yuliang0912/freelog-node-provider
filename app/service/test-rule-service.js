'use strict'

const semver = require('semver')
const lodash = require('lodash')
const Service = require('egg').Service
const {ApplicationError} = require('egg-freelog-base/error')
const NodeTestRuleHandler = require('../test-rule-handler/index')
const cryptoHelper = require('egg-freelog-base/app/extend/helper/crypto_helper')

module.exports = class TestRuleService extends Service {

    constructor({app, request}) {
        super(...arguments)
        this.nodeTestRuleHandler = new NodeTestRuleHandler(app)
        this.nodeTestRuleProvider = app.dal.nodeTestRuleProvider
        this.nodeTestResourceProvider = app.dal.nodeTestResourceProvider
        this.testResourceAuthTreeProvider = app.dal.testResourceAuthTreeProvider
        this.testResourceResolveReleaseProvider = app.dal.testResourceResolveReleaseProvider
        this.testResourceDependencyTreeProvider = app.dal.testResourceDependencyTreeProvider
    }

    /**
     * 匹配并保持节点的测试资源
     * @param nodeId
     * @param testRuleText
     * @returns {Promise<model>}
     */
    async matchAndSaveNodeTestRule(nodeId, testRuleText) {

        const {ctx} = this
        const userId = ctx.request.userId
        const {matchedTestResources, testRules} = await this._compileAndMatchTestRule(nodeId, userId, testRuleText)

        const nodeTestRuleInfo = {
            nodeId, userId, ruleText: testRuleText, testRules: testRules.map(testRuleInfo => {
                let {id, text, effectiveMatchCount, matchErrors} = testRuleInfo
                return {
                    id, text, effectiveMatchCount, matchErrors,
                    ruleInfo: lodash.omit(testRuleInfo, ['id', '_abortIndex', 'text', 'effectiveMatchCount', 'isValid', 'matchErrors'])
                }
            })
        }

        const nodeTestResources = matchedTestResources.map(nodeTestResource => {
            let {testResourceName, previewImages, type, version, versions = [], intro, definedTagInfo, onlineInfo, efficientRules, dependencyTree, _originModel} = nodeTestResource
            let originInfo = {
                id: _originModel['presentableId'] || _originModel['releaseId'] || _originModel['mockResourceId'],
                name: _originModel['presentableName'] || _originModel['releaseName'] || _originModel['fullName'],
                type, version, versions, _originModel
            }
            let testResourceId = this._generateTestResourceId(nodeId, originInfo)
            return {
                testResourceId, testResourceName, nodeId, userId, dependencyTree, previewImages, intro, originInfo,
                resourceType: _originModel['resourceType'] || _originModel.releaseInfo.resourceType,
                differenceInfo: {
                    onlineStatusInfo: {
                        isOnline: onlineInfo.isOnline,
                        ruleId: onlineInfo.source === 'default' ? "" : onlineInfo.source
                    },
                    userDefinedTagInfo: {
                        tags: definedTagInfo.definedTags,
                        ruleId: definedTagInfo.source === 'default' ? "" : definedTagInfo.source
                    }
                },
                rules: efficientRules.map(x => Object({
                    id: x.id, operation: x.operation
                }))
            }
        })
        const nodeTestResourceDependencyTrees = nodeTestResources.map(testResource => Object({
            nodeId,
            testResourceId: testResource.testResourceId,
            testResourceName: testResource.testResourceName,
            dependencyTree: this._flattenDependencyTree(testResource.dependencyTree)
        }))

        const nodeTestResourceAuthTrees = []
        for (let i = 0; i < nodeTestResourceDependencyTrees.length; i++) {
            let {testResourceId, testResourceName, dependencyTree} = nodeTestResourceDependencyTrees[i]
            await this._setDependencyTreeReleaseSchemeId(testResourceId, dependencyTree)
            nodeTestResourceAuthTrees.push({
                nodeId, testResourceId, testResourceName,
                authTree: await this._generateTestResourceAuthTree(dependencyTree)
            })
        }

        const existingResolveReleases = await this.nodeTestResourceProvider.find({nodeId}, 'testResourceId resolveReleases')

        for (let i = 0; i < nodeTestResources.length; i++) {
            let currentTestResource = nodeTestResources[i]
            let {testResourceId} = currentTestResource
            let currentTestResourceAuthTree = nodeTestResourceAuthTrees.find(x => x.testResourceId === testResourceId)
            let currentTestResourceExistingResolveReleases = existingResolveReleases.find(x => x.testResourceId === testResourceId)

            currentTestResource.resolveReleases = this._getTestResourceResolveRelease(currentTestResource, userId, currentTestResourceAuthTree, currentTestResourceExistingResolveReleases)
            currentTestResource.resolveReleaseSignStatus = currentTestResource.resolveReleases.some(x => !x.contracts.length) ? 2 : 1
        }

        const deleteTask1 = this.nodeTestRuleProvider.deleteOne({nodeId})
        const deleteTask2 = this.nodeTestResourceProvider.deleteMany({nodeId})
        const deleteTask3 = this.testResourceAuthTreeProvider.deleteMany({nodeId})
        const deleteTask4 = this.testResourceDependencyTreeProvider.deleteMany({nodeId})
        //const deleteTask5 = this.testResourceResolveReleaseProvider.deleteMany({nodeId})

        await Promise.all([deleteTask1, deleteTask2, deleteTask3, deleteTask4])

        const task1 = this.nodeTestRuleProvider.create(nodeTestRuleInfo)
        const task2 = this.nodeTestResourceProvider.insertMany(nodeTestResources)
        const task3 = this.testResourceAuthTreeProvider.insertMany(nodeTestResourceAuthTrees)
        const task4 = this.testResourceDependencyTreeProvider.insertMany(nodeTestResourceDependencyTrees)
        //const task5 = this.testResourceResolveReleaseProvider.insertMany(nodeTestResourceResolveReleases)

        return Promise.all([task1, task2, task3, task4]).then(() => nodeTestRuleInfo)
    }


    /**
     * 设置测试资源上抛处理情况
     * @param testResourceInfo
     * @param resolveReleases
     * @returns {Promise<void>}
     */
    async setTestResourceResolveRelease(testResourceInfo, resolveReleases) {

        const {ctx} = this
        const invalidResolves = lodash.differenceBy(resolveReleases, testResourceInfo.resolveReleases, x => x.releaseId)
        if (invalidResolves.length) {
            throw new ApplicationError(ctx.gettext('node-test-resolve-release-invalid-error'), {invalidResolves})
        }

        const releaseMap = await ctx.curlIntranetApi(`${ctx.webApi.releaseInfo}/list?releaseIds=${resolveReleases.map(x => x.releaseId).toString()}&projection=policies`)
            .then(list => new Map(list.map(x => [x.releaseId, x])))

        const invalidPolicies = [], beSignedContractReleases = []
        const existingResolveReleases = testResourceInfo.toObject().resolveReleases
        for (let i = 0, j = resolveReleases.length; i < j; i++) {
            let {releaseId, contracts} = resolveReleases[i]
            let releaseInfo = releaseMap.get(releaseId)
            let existingResolveRelease = existingResolveReleases.find(x => x.releaseId === releaseId)
            let existingResolveReleasePolicies = existingResolveRelease.contracts.map(x => x.policyId)
            let latestResolveReleasePolicies = contracts.map(x => x.policyId)
            if (!lodash.difference(latestResolveReleasePolicies, existingResolveReleasePolicies).length && !lodash.difference(existingResolveReleasePolicies, latestResolveReleasePolicies).length) {
                continue
            }
            contracts.forEach(item => {
                if (!releaseInfo.policies.some(x => x.policyId === item.policyId)) {
                    invalidPolicies.push({releaseId: releaseId, policyId: item.policyId})
                }
            })
            existingResolveRelease.contracts = contracts
            beSignedContractReleases.push(existingResolveRelease)
        }

        if (invalidPolicies.length) {
            throw new ApplicationError(ctx.gettext('params-validate-failed', 'resolveReleases'), {invalidPolicies})
        }
        if (!beSignedContractReleases.length) {
            return testResourceInfo
        }

        const contracts = await this._batchSignReleaseContracts(testResourceInfo.nodeId, beSignedContractReleases)
        const contractMap = new Map(contracts.map(x => [`${x['partyOne']}_${x.policyId}`, x]))

        const updatedResolveReleases = existingResolveReleases.map(item => {
            let changedResolveRelease = beSignedContractReleases.find(x => x.releaseId === item.releaseId)
            if (changedResolveRelease) {
                item.contracts = changedResolveRelease.contracts.map(contractInfo => {
                    let signedContractInfo = contractMap.get(`${changedResolveRelease.releaseId}_${contractInfo.policyId}`)
                    if (signedContractInfo) {
                        contractInfo.contractId = signedContractInfo.contractId
                    }
                    return contractInfo
                })
            }
            return item
        })

        const resolveReleaseSignStatus = updatedResolveReleases.some(x => !x.contracts.length) ? 2 : 1

        return this.nodeTestResourceProvider.findOneAndUpdate({testResourceId: testResourceInfo.testResourceId}, {
            resolveReleases: updatedResolveReleases, resolveReleaseSignStatus
        }, {new: true})
    }

    /**
     * 过滤特定资源依赖树
     * @returns {Promise<void>}
     */
    filterTestResourceDependency(dependencyTree, dependentEntityId, dependentEntityVersionRange) {

        const rootDependencies = dependencyTree.filter(x => x.deep === 1)

        function recursionSetMatchResult(dependencies) {
            for (let i = 0; i < dependencies.length; i++) {
                let currentDependInfo = dependencies[i]
                if (entityIsMatched(currentDependInfo)) {
                    currentDependInfo.isMatched = true
                    continue
                }
                let subDependencies = getDependencies(currentDependInfo)
                currentDependInfo.isMatched = recursionMatchResult(subDependencies)
                recursionSetMatchResult(subDependencies)
            }
        }

        function recursionMatchResult(dependencies) {
            if (!dependencies.length) {
                return false
            }
            for (let i = 0; i < dependencies.length; i++) {
                let currentDependInfo = dependencies[i]
                if (entityIsMatched(currentDependInfo)) {
                    return true
                }
                return recursionMatchResult(getDependencies(currentDependInfo))
            }
        }

        function getDependencies(dependInfo, isFilterMatched = false) {
            return dependencyTree.filter(x => x.deep === dependInfo.deep + 1 && x.parentId === dependInfo.id && x.parentVersion === dependInfo.version && (!isFilterMatched || x.isMatched))
        }

        function entityIsMatched(dependInfo) {
            let {id, type, version} = dependInfo
            return id === dependentEntityId && (type === 'mock' || !dependentEntityVersionRange || semver.satisfies(version, dependentEntityVersionRange))
        }

        function recursionBuildDependencyTree(dependencies) {
            return dependencies.filter(x => x.isMatched).map(item => {
                let model = lodash.pick(item, ['id', 'name', 'type', 'version'])
                model.dependencies = recursionBuildDependencyTree(getDependencies(item), item.deep, item.id, item.parentVersion)
                return model
            })
        }

        recursionSetMatchResult(rootDependencies)

        return recursionBuildDependencyTree(rootDependencies)
    }

    /**
     * 编译并匹配测试结果
     * @param nodeId
     * @param userId
     * @param testRuleText
     * @returns {Promise<*>}
     */
    async _compileAndMatchTestRule(nodeId, userId, testRuleText) {

        const {errors, rules} = this.nodeTestRuleHandler.compileTestRule(testRuleText)
        if (!lodash.isEmpty(errors)) {
            throw new ApplicationError(this.ctx.gettext('node-test-rule-compile-failed'), {errors})
        }

        const matchedTestResources = await this.nodeTestRuleHandler.matchTestRuleResults(nodeId, userId, rules)

        return {matchedTestResources, testRules: rules}
    }

    /**
     * 拍平依赖树
     * @param dependencies
     * @param parentId
     * @param parentReleaseVersion
     * @private
     */
    _flattenDependencyTree(dependencyTree, parentId = '', parentVersion = '', results = []) {
        for (let i = 0, j = dependencyTree.length; i < j; i++) {
            let {id, name, type, deep, version, dependencies, replaced} = dependencyTree[i]
            results.push({
                id, name, type, deep, version, parentId, parentVersion, replaced,
                dependCount: dependencies.length
            })
            this._flattenDependencyTree(dependencies, id, version, results)
        }
        return results
    }

    /**
     * 生成测试资源授权树
     * @param dependencyTree
     * @private
     */
    async _generateTestResourceAuthTree(dependencyTree) {

        var dependReleaseMap = new Map()
        var dependReleaseIds = dependencyTree.filter(x => x.type === 'release').map(x => x.id)
        if (dependReleaseIds.length) {
            dependReleaseMap = await this.ctx.curlIntranetApi(`${this.ctx.webApi.releaseInfo}/list?releaseIds=${dependReleaseIds.toString()}`)
                .then(list => new Map(list.map(m => [m.releaseId, m])))
        }

        for (let i = 0; i < dependencyTree.length; i++) {
            let currentDependency = dependencyTree[i]
            let parent = dependencyTree.find(x => x.deep == currentDependency.deep - 1 && x.id === currentDependency.parentId && x.version === currentDependency.parentVersion)
            if (currentDependency.type === 'release') {
                currentDependency.userId = dependReleaseMap.get(currentDependency.id).userId
            }
            currentDependency.resolver = this._findResolver(dependencyTree, parent, currentDependency, dependReleaseMap)
        }

        return this._buildAuthTree(dependencyTree)
    }

    /**
     * 构建平铺的授权树
     * @param dependencyTree
     * @param results
     * @param parent
     * @param deep
     * @returns {Array}
     * @private
     */
    _buildAuthTree(dependencyTree, results = [], parent = null, deep = 1) {

        let parentId = parent ? parent.id : ''
        let parentVersion = parent ? parent.version : ''

        dependencyTree.filter(x => this._compareResolver(parent, x.resolver)).map(item => {
            let model = lodash.pick(item, ['id', 'name', 'userId', 'type', 'version', 'releaseSchemeId'])
            results.push(Object.assign(model, {deep, parentId, parentVersion}))
            this._buildAuthTree(dependencyTree, results, item, deep + 1)
        })

        return results
    }

    /**
     * 比较解决方是否一致
     * @param resolver
     * @param entity
     * @returns {boolean|*}
     * @private
     */
    _compareResolver(target, resolver) {
        return resolver == null && target == null || resolver && target && resolver.id === target.id && resolver.version === target.version && resolver.deep === target.deep
    }

    /**
     * 查找目标实体(release or mock)的解决方
     * @param dependencyTree
     * @param parent
     * @param target
     * @param releaseMap
     * @private
     */
    _findResolver(dependencyTree, parent, target, releaseMap) {

        if (!parent || target.type === 'mock') {
            return null
        }

        let grandfather = dependencyTree.find(x => x.deep == parent.deep - 1 && x.id === parent.parentId && x.version === parent.parentVersion)
        if (parent.type === 'mock') {
            return this._findResolver(dependencyTree, grandfather, target, releaseMap)
        }

        let {baseUpcastReleases} = releaseMap.get(parent.id)
        //如果上抛中有,则递归接着找,否则代表当前层解决
        if (baseUpcastReleases.some(x => x.releaseId === target.id)) {
            return this._findResolver(dependencyTree, grandfather, target, releaseMap)
        }

        return lodash.pick(parent, ['id', 'type', 'deep', 'version'])
    }

    /**
     * 生成测试资源ID
     * @param nodeId
     * @param originInfo
     * @private
     */
    _generateTestResourceId(nodeId, originInfo) {
        return cryptoHelper.md5(`${nodeId}-${originInfo.id}-${originInfo.type}`)
    }

    /**
     * 获取测试资源需要解决的上抛
     * @param testResourceInfo
     * @param authTreeInfo
     * @private
     */
    _getTestResourceResolveRelease(testResourceInfo, userId, authTreeInfo, existingResolveReleases) {

        const {authTree} = authTreeInfo
        const {originInfo} = testResourceInfo

        const toBeProcessedReleases = authTree.filter(x => x.deep == 1 && x.type === "release" && x.userId !== userId).map(m => Object({
            releaseId: m.id, releaseName: m.name, contracts: []
        }))

        const resolveReleases = existingResolveReleases ? existingResolveReleases.resolveReleases :
            originInfo.type === "presentable" ? originInfo._originModel.resolveReleases : []

        const resolveReleaseMap = new Map(resolveReleases.map(x => [x.releaseId, x.contracts]))

        toBeProcessedReleases.forEach(item => {
            if (resolveReleaseMap.has(item.releaseId)) {
                item.contracts = resolveReleaseMap.get(item.releaseId)
            }
        })

        return toBeProcessedReleases
    }

    /**
     * 批量签约
     * @param nodeId
     * @param targetId
     * @param resolveReleases
     * @returns {Promise<*>}
     */
    async _batchSignReleaseContracts(nodeId, beSignedContractReleases) {

        if (!beSignedContractReleases.length) {
            return []
        }
        const {ctx, app} = this
        return ctx.curlIntranetApi(`${ctx.webApi.contractInfo}/batchCreateReleaseContracts`, {
            method: 'post', contentType: 'json', data: {
                partyTwoId: nodeId,
                contractType: app.contractType.ResourceToNode,
                signReleases: beSignedContractReleases.map(item => Object({
                    releaseId: item.releaseId,
                    policyIds: item.contracts.map(x => x.policyId)
                }))
            }
        })
    }

    /**
     * 设置依赖树的发行ID
     * @param dependencies
     * @returns {Promise<void>}
     */
    async _setDependencyTreeReleaseSchemeId(testResourceId, dependencies) {

        const {ctx} = this
        const releaseIds = [], versions = []
        for (let i = 0; i < dependencies.length; i++) {
            let {id, type, version} = dependencies[i]
            if (type === "release") {
                releaseIds.push(id)
                versions.push(version)
            }
        }
        if (!releaseIds.length) {
            return
        }

        const releaseSchemeMap = await ctx.curlIntranetApi(`${ctx.webApi.releaseInfo}/versions/list?releaseIds=${releaseIds.toString()}&versions=${versions.toString()}&projection=releaseId,version`)
            .then(list => new Map(list.map(x => [`${x.releaseId}_${x.version}`, x])))

        for (let i = 0, j = dependencies.length; i < j; i++) {
            let {id, type, version} = dependencies[i]
            if (type !== "release") {
                continue
            }
            if (releaseSchemeMap.has(`${id}_${version}`)) {
                dependencies[i].releaseSchemeId = releaseSchemeMap.get(`${id}_${version}`).schemeId
            } else {
                console.log(`testResourceDependencyTree数据结构缺失,testResourceId:${testResourceId},releaseId:${id},version:${version}`)
            }
        }
    }
}


