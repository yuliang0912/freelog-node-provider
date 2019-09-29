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
                let simpleRootInfo = {
                    name: currTestResource.testResourceName,
                    type: currTestResource.type,
                    version: currTestResource.version
                }
                await this._recursionReplace(currTestResource, currTestResource.dependencyTree, ruleInfo, [simpleRootInfo])
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
    async _recursionReplace(rootInfo, dependencies, ruleInfo, parents = []) {

        if (lodash.isEmpty(dependencies)) {
            return
        }

        for (let i = 0; i < dependencies.length; i++) {
            let currNodeInfo = dependencies[i]
            parents.push(lodash.pick(currNodeInfo, ['name', 'type', 'version']))
            let replacerDependencyInfo = await this._getReplacerDependencies(currNodeInfo, ruleInfo, parents)
            if (!replacerDependencyInfo) {
                await this._recursionReplace(rootInfo, currNodeInfo.dependencies, ruleInfo, parents)
                continue
            }
            let {result, deep} = this._checkCycleDependency(dependencies, replacerDependencyInfo)
            if (result) {
                ruleInfo.matchErrors.push(`规则作用于${rootInfo.testResourceName}时,检查到${deep == 1 ? "重复" : "循环"}依赖,无法替换`)
                continue
            }
            rootInfo.efficientRules.push(ruleInfo)
            dependencies.splice(i, 1, replacerDependencyInfo)
        }
    }

    /**
     * 根据当前树的节点信息获取替换品信息
     * @param ruleInfo
     * @param targetModel
     * @param parents
     * @private
     * */
    async _getReplacerDependencies(targetInfo, ruleInfo, parents = []) {

        const {replaced, replacer, scope = []} = ruleInfo

        //作用域检查不符合
        if (!this._checkScope(scope, parents)) {
            return
        }
        if (!this._entityIsMatched(replaced, targetInfo)) {
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

        return {
            type: replacer.type,
            deep: targetInfo.deep,
            dependencies: replacerDependencies,
            version: releaseVersion,
            id: replacerInfo['mockResourceId'] || replacerInfo['releaseId'],
            name: replacerInfo['fullName'] || replacerInfo['releaseName'],
            replaced: lodash.omit(targetInfo, 'dependencies')
        }
    }

    /**
     * 检查scope是否符合
     * @param scope
     * @param parents
     * @returns Boolean 1:不符合  2:局部符合  3:完全符合
     * @private
     */
    _checkScope(scopes, parents) {

        if (lodash.isEmpty(scopes)) { //空数组即全局替换
            return true
        }

        //多个scopes中如果有任意一个是满足的
        for (let i = 0; i < scopes.length; i++) {
            let subScopes = scopes[i], subScopesLength = scopes[i].length
            if (subScopesLength > parents.length) {
                continue
            }
            for (let x = 0; x < subScopesLength; x++) {
                if (!this._entityIsMatched(subScopes[x], parents[x])) {
                    break
                }
                if (x === subScopesLength - 1) {
                    return true
                }
            }
        }

        return false
    }

    /**
     * 检查是否匹配作用域中的项
     * @param scopeInfo
     * @param dependInfo
     * @returns {boolean|*}
     * @private
     */
    _entityIsMatched(scopeInfo, dependInfo) {

        let {name, type, version} = scopeInfo
        let nameAndVersionIsMatched = name === dependInfo.name && type === dependInfo.type
        //let versionIsMatched = type === 'mock' ? true : Semver.satisfies(version, dependInfo.version)

        return nameAndVersionIsMatched //&& versionIsMatched
    }

    /**
     * 检查重复依赖或者循环依赖(deep=1的循环依赖则为重复依赖)
     * @private
     */
    _checkCycleDependency(dependencies, targetInfo, deep = 1) {

        const {id, type} = targetInfo
        if (lodash.isEmpty(dependencies)) {
            return {result: false, deep}
        }
        if (dependencies.some(x => x.id === id && x.type === type)) {
            return {result: true, deep}
        }
        if (deep > 100) { //内部限制最大依赖树深度
            //throw new Error()
            //return {result: false, deep}
        }

        const subDependencies = lodash.chain(dependencies).map(m => m.dependencies).flattenDeep().value()

        return this._checkCycleDependency(subDependencies, targetInfo, deep + 1)
    }
}