'use strict'

const semver = require('semver')
const lodash = require('lodash')
const Service = require('egg').Service
const {ApplicationError} = require('egg-freelog-base/error')
const NodeTestRuleHandler = require('../test-rule-handler/index')
const cryptoHelper = require('egg-freelog-base/app/extend/helper/crypto_helper')
const CommonGenerateDependencyTreeHandler = require('../test-rule-handler/common-generate-dependency-tree-handler')
const RuleImportTestResourceHandler = require('../test-rule-handler/rule-import-test-resource-handler')

module.exports = class TestRuleService extends Service {

    constructor({app, request}) {
        super(...arguments)
        this.nodeTestRuleHandler = new NodeTestRuleHandler(app)
        this.nodeTestRuleProvider = app.dal.nodeTestRuleProvider
        this.presentableProvider = app.dal.presentableProvider
        this.nodeTestResourceProvider = app.dal.nodeTestResourceProvider
        this.ruleImportTestResourceHandler = new RuleImportTestResourceHandler(app)
        this.testResourceAuthTreeProvider = app.dal.testResourceAuthTreeProvider
        this.testResourceResolveReleaseProvider = app.dal.testResourceResolveReleaseProvider
        this.testResourceDependencyTreeProvider = app.dal.testResourceDependencyTreeProvider
        this.commonGenerateDependencyTreeHandler = new CommonGenerateDependencyTreeHandler(app)
    }

    /**
     * 匹配规则并保存结果
     * @param nodeId
     * @param testRuleText
     * @returns {Promise<Model>}
     */
    async matchAndSaveNodeTestRule(nodeId, testRuleText) {

        const {ctx} = this
        const userId = ctx.request.userId
        const testRules = await this._compileAndMatchTestRule(nodeId, userId, testRuleText)

        var nodeTestResources = []

        for (let i = 0; i < testRules.length; i++) {
            let testRuleInfo = testRules[i]
            if (!testRuleInfo.isValid || !['alter', 'add'].includes(testRuleInfo.operation)) {
                continue
            }
            let {presentableName, entityInfo, entityDependencyTree, onlineStatus, userDefinedTags} = testRuleInfo
            let {entityId, entityName, entityType, entityVersion, entityVersions, resourceType, intro, previewImages, presentableInfo} = entityInfo

            let originInfo = {
                id: entityId, name: entityName, type: entityType, presentableInfo,
                version: entityVersion, versions: entityVersions
            }

            //如果原始依赖的版本被替换了,则整个测试资源的版本也跟随改变
            if (entityType === 'release' && !lodash.isEmpty(entityDependencyTree)) {
                originInfo.version = entityDependencyTree[0].version
            }

            let testResourceId = this._generateTestResourceId(nodeId, originInfo)
            let flattenDependencyTree = this._flattenDependencyTree(testResourceId, entityDependencyTree)

            nodeTestResources.push({
                testResourceId, nodeId, userId, flattenDependencyTree, intro, previewImages, originInfo, resourceType,
                nodePresentableId: presentableInfo ? presentableInfo.presentableId : '',
                ruleId: testRuleInfo.id,
                testResourceName: presentableName,
                dependencyTree: entityDependencyTree,
                differenceInfo: {
                    onlineStatusInfo: {
                        isOnline: onlineStatus,
                        ruleId: testRuleInfo.online === null ? "default" : testRuleInfo.id
                    },
                    userDefinedTagInfo: {
                        tags: userDefinedTags,
                        ruleId: testRuleInfo.tags === null ? 'default' : testRuleInfo.id
                    }
                }
            })
        }

        const unOperantNodePresentableTestResources = await this.getUnOperantNodePresentableTestResources(nodeId, userId, testRules)

        nodeTestResources = nodeTestResources.concat(unOperantNodePresentableTestResources)

        const nodeTestResourceDependencyTrees = nodeTestResources.map(testResource => Object({
            nodeId,
            testResourceId: testResource.testResourceId,
            testResourceName: testResource.testResourceName,
            dependencyTree: testResource.flattenDependencyTree
        }))

        const nodeTestResourceAuthTrees = []
        for (let i = 0; i < nodeTestResourceDependencyTrees.length; i++) {
            let {testResourceId, testResourceName, dependencyTree} = nodeTestResourceDependencyTrees[i]
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

        await Promise.all([deleteTask1, deleteTask2, deleteTask3, deleteTask4])

        const themeResourceInfo = this.nodeTestRuleHandler.getSchemeInfo(testRules, nodeTestResources)

        const nodeTestRuleInfo = {
            nodeId, userId, ruleText: testRuleText,
            themeId: themeResourceInfo ? themeResourceInfo.testResourceId : '',
            testRules: testRules.map(testRuleInfo => {
                let {id, text, matchErrors} = testRuleInfo
                return {
                    id, text, matchErrors,
                    ruleInfo: lodash.pick(testRuleInfo, ['tags', 'replaces', 'online', 'operation', 'presentableName', 'candidate', 'themeName'])
                }
            })
        }

        const task1 = this.nodeTestRuleProvider.create(nodeTestRuleInfo)
        const task2 = this.nodeTestResourceProvider.insertMany(nodeTestResources)
        const task3 = this.testResourceAuthTreeProvider.insertMany(nodeTestResourceAuthTrees)
        const task4 = this.testResourceDependencyTreeProvider.insertMany(nodeTestResourceDependencyTrees)

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
     * 获取未被规则操作过的节点presentables
     * @param nodeId
     * @param testRules
     * @returns {Promise<Array>}
     */
    async getUnOperantNodePresentableTestResources(nodeId, userId, testRules) {

        const testResources = []
        const operantPresentableIds = testRules.filter(x => x.isValid && x.operation === 'alter').map(x => x.entityInfo.presentableInfo.presentableId)

        const nodePresentables = await this.presentableProvider.find({nodeId, _id: {$nin: operantPresentableIds}})

        for (let i = 0; i < nodePresentables.length; i++) {
            let presentableInfo = nodePresentables[i]
            let {presentableId, isOnline, userDefinedTags, presentableName} = presentableInfo

            let getReleaseInfoTask = this.ruleImportTestResourceHandler.getReleaseInfo(presentableInfo.releaseInfo.releaseId)
            let getPresentableDependencyTreeTask = this.commonGenerateDependencyTreeHandler.generatePresentableDependencyTree(presentableId, presentableInfo.releaseInfo.version)
            let [releaseInfo, presentableDependencyTree] = await Promise.all([getReleaseInfoTask, getPresentableDependencyTreeTask])
            let originInfo = {
                id: releaseInfo.releaseId,
                name: releaseInfo.releaseName,
                type: 'release',
                version: presentableInfo.releaseInfo.version,
                presentableInfo,
                versions: releaseInfo['resourceVersions'].map(x => x.version)
            }

            let testResourceId = this._generateTestResourceId(nodeId, originInfo)
            let flattenDependencyTree = this._flattenDependencyTree(testResourceId, presentableDependencyTree)

            testResources.push({
                testResourceId, nodeId, userId, flattenDependencyTree, originInfo,
                intro: releaseInfo.intro,
                previewImages: releaseInfo.previewImages,
                resourceType: releaseInfo.resourceType,
                testResourceName: presentableName,
                dependencyTree: presentableDependencyTree,
                nodePresentableId: presentableId,
                differenceInfo: {
                    onlineStatusInfo: {
                        isOnline: isOnline,
                        ruleId: 'default'
                    },
                    userDefinedTagInfo: {
                        tags: userDefinedTags,
                        ruleId: 'default'
                    }
                },
                rules: []  //efficientRules.map(x => Object({id: x.id, operation: x.operation}))
            })
        }

        return testResources
    }

    /**
     * 构建依赖树
     * @param flattenDependencies
     * @param startNid
     * @param maxDeep
     * @returns {*}
     */
    buildTestResourceDependencyTree(flattenDependencies, startNid = "", maxDeep = 100, isContainRootNode = true) {

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
     * 过滤特定资源依赖树
     * @returns {Promise<void>}
     */
    filterTestResourceDependency(entityNid, flattenDependencies, dependentEntityId, dependentEntityVersionRange) {

        const testResourceDependencies = this.buildTestResourceDependencyTree(flattenDependencies, entityNid)

        function recursionSetMatchResult(dependencies) {
            if (lodash.isEmpty(dependencies)) {
                return false
            }
            for (let i = 0, j = dependencies.length; i < j; i++) {
                let currentDependInfo = dependencies[i]
                //自身匹配或者子依赖有匹配的
                if (entityIsMatched(currentDependInfo) || recursionSetMatchResult(currentDependInfo.dependencies)) {
                    currentDependInfo.isMatched = true
                    return true
                }
                //当前依赖的全部子依赖全部遍历完依然没有匹配的,则当前依赖不匹配
                if (i + 1 === j) {
                    currentDependInfo.isMatched = false
                    return false
                }
            }
        }

        function entityIsMatched(dependInfo) {
            let {id, type, version} = dependInfo
            return id === dependentEntityId && (type === 'mock' || !dependentEntityVersionRange || semver.satisfies(version, dependentEntityVersionRange))
        }

        function recursionBuildDependencyTree(dependencies) {
            return dependencies.filter(x => x.isMatched).map(item => {
                let model = lodash.pick(item, ['id', 'name', 'type', 'version'])
                model.dependencies = recursionBuildDependencyTree(item.dependencies)
                return model
            })
        }

        recursionSetMatchResult(testResourceDependencies)

        return recursionBuildDependencyTree(testResourceDependencies)
    }

    /**
     * 编译并且匹配规则
     * @param nodeId
     * @param userId
     * @param testRuleText
     * @returns {Promise<*>}
     * @private
     */
    async _compileAndMatchTestRule(nodeId, userId, testRuleText) {

        var {errors, rules} = this.nodeTestRuleHandler.compileTestRule(testRuleText)

        if (!lodash.isEmpty(errors)) {
            throw new ApplicationError(this.ctx.gettext('node-test-rule-compile-failed'), {errors})
        }
        if (!rules.length) {
            return rules
        }

        await this.nodeTestRuleHandler.matchTestRuleResults(nodeId, userId, rules.reverse())

        return rules

        // const testRuleChunks = lodash.chunk(rules, 200)
        // for (let i = 0; i < testRuleChunks.length; i++) {
        //     await this.nodeTestRuleHandler.matchTestRuleResults(nodeId, userId, testRuleChunks[i])
        // }
        //
        // return rules
    }

    /**
     * 拍平依赖树
     * @param dependencies
     * @param parentId
     * @param parentReleaseVersion
     * @private
     */
    _flattenDependencyTree(testResourceId, dependencyTree, parentNid = '', results = [], deep = 1) {
        for (let i = 0, j = dependencyTree.length; i < j; i++) {
            let {nid, id, name, type, version, dependencies, replaceRecords, resourceId, resourceType, releaseSchemeId} = dependencyTree[i]
            if (deep == 1) {
                nid = testResourceId.substr(0, 12)
            }
            results.push({
                nid, id, name, type, deep, version, parentNid, replaceRecords, resourceType,
                resourceId, releaseSchemeId, dependCount: dependencies.length
            })
            this._flattenDependencyTree(testResourceId, dependencies, nid, results, deep + 1)
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
            let parent = dependencyTree.find(x => x.nid == currentDependency.parentNid)
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
            let model = lodash.pick(item, ['id', 'name', 'userId', 'type', 'version', 'releaseSchemeId', 'resourceId'])
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
        return (resolver == null && target == null) || (resolver && target && resolver.nid === target.nid)
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

        let grandfather = dependencyTree.find(x => x.nid === parent.parentNid)
        if (parent.type === 'mock') {
            return this._findResolver(dependencyTree, grandfather, target, releaseMap)
        }

        let {baseUpcastReleases} = releaseMap.get(parent.id)
        //如果上抛中有,则递归接着找,否则代表当前层解决
        if (baseUpcastReleases.some(x => x.releaseId === target.id)) {
            return this._findResolver(dependencyTree, grandfather, target, releaseMap)
        }

        return lodash.pick(parent, ['nid', 'id', 'type', 'version'])
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
            originInfo.presentableInfo ? originInfo.presentableInfo.resolveReleases : []

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
}


