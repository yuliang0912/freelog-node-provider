'use strict'

const Semver = require('semver')
const lodash = require('lodash')
const ImportRuleHandler = require('./importRuleHandler')
const GenerateDependencyTreeHandler = require('./generateDependencyTreeHandler')

module.exports = class ReplaceRuleHandler {

    constructor(app) {
        this.app = app
        this.importRuleHandler = new ImportRuleHandler(app)
        this.generateDependencyTreeHandler = new GenerateDependencyTreeHandler(app)
    }

    /**
     * 前置替换规则处理,只标记位置,不做实际替换
     * @param ruleInfo
     * @param testResources
     */
    handle(ruleInfo, testResources) {
        //记录下当前规则生效时的作用范围.然后在依赖树生成完以后,做后置处理
        ruleInfo._abortIndex = testResources.length - 1
    }

    /**
     * 后置处理,执行替换依赖树
     * @param testRules
     */
    async postpositionTaskHandle(testRules, testResources) {

        const allReplaceRules = testRules.filter(x => x.operation == "replace")

        for (let i = 0; i < allReplaceRules.length; i++) {
            let currRule = allReplaceRules[i]
            const validTestResources = testResources.slice(0, currRule._abortIndex + 1)
            //此处不能并行,考虑到规则的替换顺序
            await this._rangeReplace(validTestResources, currRule)
        }
    }

    /**
     * 查找替换目标,分发替换任务
     * @param testResources
     * @param ruleInfo
     * @returns {Promise<void>}
     * @private
     */
    async _rangeReplace(testResources, ruleInfo) {

        const operantTestResourceNames = (ruleInfo.scope || []).map(x => x[0].name)
        for (let i = 0; i < testResources.length; i++) {
            let currTestResource = testResources[i]
            if (!operantTestResourceNames.length || operantTestResourceNames.some(name => name === currTestResource.testResourceName)) {
                if (currTestResource.dependencyTree === undefined) {
                    console.log(1, JSON.stringify(currTestResource))
                }
                await this._recursionReplace(currTestResource, currTestResource.dependencyTree, ruleInfo)
            }
        }
    }

    /**
     * 递归替换依赖树
     * @param dependencies
     * @param ruleInfo
     * @returns {Promise<void>}
     * @private
     */
    async _recursionReplace(rootInfo, dependencies, ruleInfo) {
        for (let i = 0; i < dependencies.length; i++) {
            let currNodeInfo = dependencies[i]
            let replacerDependencyInfo = await this._getReplacerDependencies(currNodeInfo, ruleInfo)
            if (!replacerDependencyInfo) {
                if (currNodeInfo.dependencies === undefined) {
                    console.log(12)
                }
                await this._recursionReplace(rootInfo, currNodeInfo.dependencies, ruleInfo)
                continue
            }
            let {ret, deep} = this._checkCycleDependency(dependencies, replacerDependencyInfo)
            if (ret) {
                ruleInfo.matchErrors.push(`规则作用于${rootInfo.testResourceName}时,检查到${deep == 1 ? "重复" : "循环"}依赖,无法替换`)
                continue
            }
            rootInfo.efficientRules.push(ruleInfo)
            dependencies.splice(i, 1, replacerDependencyInfo)
            await this._recursionReplace(rootInfo, (replacerDependencyInfo || currNodeInfo).dependencies, ruleInfo)
        }
    }

    /**
     * 根据当前树的节点信息获取替换品信息
     * @param ruleInfo
     * @param targetModel
     * @param parentIds
     * @private
     * */
    async _getReplacerDependencies(targetInfo, ruleInfo, parentIds = []) {

        const {replaced, replacer, scope = []} = ruleInfo

        if (targetInfo.type !== replaced.type || targetInfo.name !== replaced.name) {
            return
        }
        if (replaced.version && !Semver.satisfies(targetInfo.version, replaced.version)) {
            return
        }

        const isMock = replacer.type === "mock"

        const replacerInfo = isMock
            ? await this.importRuleHandler.getMockResourceInfo(replacer.name)
            : await this.importRuleHandler.getReleaseInfo(replacer.name)

        if (!replacerInfo) {
            ruleInfo.isValid = false
            ruleInfo.matchErrors.push(`替换品名称${replacer.name}无效`)
            return
        }

        const releaseVersion = isMock ? null : this.importRuleHandler.matchReleaseVersion(replacerInfo, replacer.versionRange)
        if (!isMock && !releaseVersion) {
            ruleInfo.isValid = false
            ruleInfo.matchErrors.push(`替换品版本${replacer.versionRange}无效`)
            return
        }

        ruleInfo.effectiveMatchCount += 1

        const replacerDependencies = isMock
            ? await this.generateDependencyTreeHandler.generateMockDependencyTree(replacerInfo)
            : await this.generateDependencyTreeHandler.generateReleaseDependencyTree(replacerInfo, releaseVersion)

        const replacerDependencyTreeInfo = {
            type: replacer.type,
            deep: targetInfo.deep,
            dependencies: replacerDependencies,
            version: releaseVersion,
            id: replacerInfo.mockResourceId || replacerInfo.releaseId,
            name: replacerInfo.fullName || replacerInfo.releaseName
        }

        return replacerDependencyTreeInfo
    }

    /**
     * 检查重复依赖或者循环依赖(deep=1的循环依赖则为重复依赖)
     * @private
     */
    _checkCycleDependency(dependencies, targetInfo, deep = 1) {

        const {id, type} = targetInfo
        if (lodash.isEmpty(dependencies)) {
            return {ret: false, deep}
        }
        if (dependencies.some(x => x.id === id && x.type === type)) {
            return {ret: true, deep}
        }
        if (deep > 100) { //内部限制最大依赖树深度
            //throw new Error()
            //return {ret: false, deep}
        }

        const subDependencies = lodash.chain(dependencies).map(m => m.dependencies).flattenDeep().value()

        return this._checkCycleDependency(subDependencies, targetInfo, deep + 1)
    }
}