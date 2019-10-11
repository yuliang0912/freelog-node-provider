'use strict'

const semver = require('semver')
const lodash = require('lodash')
const Service = require('egg').Service
const {ApplicationError} = require('egg-freelog-base/error')
const NodeTestRuleHandler = require('../test-rule-handler/index')
const cryptoHelper = require('egg-freelog-base/app/extend/helper/crypto_helper')

const dependencyTree = [{
    "id": "5d68c7d65544493fe8191440",
    "name": "readme1",
    "type": "mock",
    "deep": 1,
    "version": null,
    "parentId": "",
    "parentVersion": "",
    "dependCount": 1
}, {
    "id": "5d511a69d0bf1aafa06c96b6",
    "name": "yuliang/发行A",
    "type": "release",
    "deep": 2,
    "version": "0.1.0",
    "parentId": "5d68c7d65544493fe8191440",
    "parentVersion": null,
    "dependCount": 2
}, {
    "id": "5d4134738dc89d6e48e2c8ef",
    "name": "yuliang/发行B",
    "type": "release",
    "deep": 3,
    "version": "0.1.0",
    "parentId": "5d511a69d0bf1aafa06c96b6",
    "parentVersion": "0.1.0",
    "dependCount": 2
}, {
    "id": "5d41321f8dc89d6e48e2c8de",
    "name": "yuliang/单一资源D",
    "type": "release",
    "deep": 4,
    "version": "0.1.0",
    "parentId": "5d4134738dc89d6e48e2c8ef",
    "parentVersion": "0.1.0",
    "dependCount": 0
}, {
    "id": "5d4132388dc89d6e48e2c8e1",
    "name": "yuliang/单一资源E",
    "type": "release",
    "deep": 4,
    "version": "0.1.0",
    "parentId": "5d4134738dc89d6e48e2c8ef",
    "parentVersion": "0.1.0",
    "dependCount": 0,
    "replaced": {
        "id": "5d41321f8dc89d6e48e2c8de",
        "name": "yuliang/单一资源D",
        "version": "0.1.0",
        "type": "release",
        "replacedRuleId": "98a757eeee9641ebb44cd26e4f339147"
    }
}, {
    "id": "5d4146ca565b925d547ed698",
    "name": "yuliang/复合发行C",
    "type": "release",
    "deep": 3,
    "version": "0.1.0",
    "parentId": "5d511a69d0bf1aafa06c96b6",
    "parentVersion": "0.1.0",
    "dependCount": 1
}, {
    "id": "5d4132438dc89d6e48e2c8e4",
    "name": "yuliang/单一资源F",
    "type": "release",
    "deep": 4,
    "version": "0.1.0",
    "parentId": "5d4146ca565b925d547ed698",
    "parentVersion": "0.1.0",
    "dependCount": 0
}]

module.exports = class TestRuleService extends Service {

    constructor({app, request}) {
        super(...arguments)
        this.nodeTestRuleHandler = new NodeTestRuleHandler(app)
        this.nodeTestRuleProvider = app.dal.nodeTestRuleProvider
        this.nodeTestResourceProvider = app.dal.nodeTestResourceProvider
        this.nodeTestResourceDependencyTreeProvider = app.dal.nodeTestResourceDependencyTreeProvider
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

        var sortIndex = 1
        const nodeTestResources = matchedTestResources.map(nodeTestResource => {
            let {testResourceName, previewImages, type, version, versions = [], intro, definedTagInfo, onlineInfo, efficientRules, dependencyTree, _originModel} = nodeTestResource
            let originInfo = {
                id: _originModel['presentableId'] || _originModel['releaseId'] || _originModel['mockResourceId'],
                name: _originModel['presentableName'] || _originModel['releaseName'] || _originModel['fullName'],
                type, version, versions
            }
            let testResourceId = this._generateTestResourceId(nodeId, originInfo)
            return {
                testResourceId, testResourceName, nodeId, dependencyTree, previewImages, intro, originInfo,
                sortIndex: sortIndex++,
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

        //await this._test()

        const deleteTask1 = this.nodeTestRuleProvider.deleteOne({nodeId})
        const deleteTask2 = this.nodeTestResourceProvider.deleteMany({nodeId})
        const deleteTask3 = this.nodeTestResourceDependencyTreeProvider.deleteMany({nodeId})

        await Promise.all([deleteTask1, deleteTask2, deleteTask3])

        const task1 = this.nodeTestRuleProvider.create(nodeTestRuleInfo)
        const task2 = this.nodeTestResourceProvider.insertMany(nodeTestResources)
        const task3 = this.nodeTestResourceDependencyTreeProvider.insertMany(nodeTestResourceDependencyTrees)

        return Promise.all([task1, task2, task3]).then(() => nodeTestRuleInfo)
    }

    /**
     * 过滤特使资源依赖树
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
     * @private
     */
    async _generateTestResourceAuthTree({testResourceId, dependencyTree}) {

        //替换的是发行,则上抛当前发行以及发当前发行与被替换的发行的上抛交集.如果发行是作者本人的,可以自动获取授权
        //替换的是mock,则获取mock的依赖发行以及依赖的mock的依赖发行.然后提取出来一起上抛

        const rootDependency = dependencyTree.find(x => x.deep === 1)
        const dependSubReleaseIds = rootDependency.dependencies.filter(x => x.type === 'release').map(x => x.releaseId)
        const dependSubReleases = await this._getReleases(dependSubReleaseIds)

    }


    async getUpcastReleases(rootDependency) {
        if (rootDependency.type === "mock") {
            rootDependency.baseUpcastReleases = rootDependency.dependencies
        }
    }

    /**
     * 获取发行列表
     * @param releaseIds
     * @returns {*}
     * @private
     */
    async _getReleases(releaseIds) {
        if (!releaseIds.length) {
            return []
        }
        const {ctx} = this
        return ctx.curlIntranetApi(`${ctx.webApi.releaseInfo}/list?releaseIds=${releaseIds.toString()}`)
    }

    /**
     * 根据依赖树查找版本
     * @param dependencies
     * @param release
     * @param list
     * @returns {*}
     * @private
     */
    _findReleaseVersionFromDependencyTree(dependencies, releaseId, list = []) {

        return dependencies.reduce((acc, dependency) => {
            if (dependency.type === 'release' && dependency.id === releaseId && !dependency.replaced) {
                acc.push(dependency)
            }
            //如果依赖项未上抛该发行,则终止检查子级节点
            if (!dependency.baseUpcastReleases.some(x => x.releaseId === releaseId)) {
                return acc
            }
            return this._findReleaseVersionFromDependencyTree(dependency.dependencies, releaseId, acc)
        }, list)
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


    async _test() {

        for (let i = 0; i < dependencyTree.length; i++) {
            let currentDependency = dependencyTree[i]
            let parent = dependencyTree.find(x => x.deep == currentDependency.deep - 1 && x.id === currentDependency.parentId && x.version === currentDependency.parentVersion)
            await this._findResolver(dependencyTree, parent, currentDependency)
        }

        const rootNodes = dependencyTree.filter(x => x.resolver === null).map(item => this._buildAuthTree(dependencyTree, item))

        console.log(JSON.stringify(rootNodes))
    }


    //递归构建授权树
    _buildAuthTree(dependencyTree, target) {

        const resolveReleases = dependencyTree.filter(x => x.resolver
            && x.resolver.id === target.id && x.resolver.version === target.version && x.resolver.deep === target.deep)

        //resolveReleases.forEach(item => this._buildAuthTree(dependencyTree, item))

        return Object.assign(lodash.pick(target, ['id', 'name', 'type', 'deep', 'version']), {
            dependencies: resolveReleases.map(item => {
                return this._buildAuthTree(dependencyTree, item)
            })
        })
    }


    //查找谁来解决当前依赖
    async _findResolver(dependencyTree, parent, target) {

        if (target.replaced) {

        }
        if (!parent || parent.type === "mock" || target.type === "mock") {
            target.resolver = null
            return
        }
        if (!parent.baseUpcastReleases) {
            let parentReleaseInfo = await this.ctx.curlIntranetApi(`${this.ctx.webApi.releaseInfo}/${parent.id}`)
            parent.baseUpcastReleases = parentReleaseInfo.baseUpcastReleases
        }
        //如果上抛中有,则递归接着找,否则代表当前层解决
        if (!parent.baseUpcastReleases.some(x => x.releaseId === target.id)) {
            target.resolver = lodash.pick(parent, ['id', 'type', 'deep', 'version'])
            return
        }

        let grandfather = dependencyTree.find(x => x.deep == parent.deep - 1 && x.id === parent.parentId && x.version === parent.parentVersion)

        await this._findResolver(dependencyTree, grandfather, target)
    }
}


