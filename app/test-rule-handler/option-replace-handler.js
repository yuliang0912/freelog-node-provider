'use strict'

const Semver = require('semver')
const lodash = require('lodash')
const ImportRuleHandler = require('./rule-import-test-resource-handler')
const GenerateDependencyTreeHandler = require('./common-generate-dependency-tree-handler')

module.exports = class ReplaceOptionHandler {

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
    async handle(ruleInfo) {

        if (!ruleInfo.isValid || !['alter', 'add'].includes(ruleInfo.operation) || lodash.isEmpty(ruleInfo.replaces)) {
            return ruleInfo
        }

        await this._recursionReplace(ruleInfo.entityDependencyTree, ruleInfo)

        return ruleInfo
    }

    /**
     * 递归替换依赖树
     * @param dependencies
     * @param ruleInfo
     * @returns {Promise<void>}
     * @private
     */
    async _recursionReplace(dependencies, ruleInfo, parents = []) {

        if (lodash.isEmpty(dependencies)) {
            return
        }

        for (let i = 0, j = dependencies.length; i < j; i++) {
            let currTreeNodeInfo = dependencies[i]
            let currChain = parents.concat([lodash.pick(currTreeNodeInfo, ['name', 'type', 'version'])])
            let replacerInfo = await this._getReplacerAndDependencies(currTreeNodeInfo, ruleInfo, currChain)
            if (!replacerInfo) {
                await this._recursionReplace(currTreeNodeInfo.dependencies, ruleInfo, currChain)
                continue
            }
            let {result, deep} = this._checkCycleDependency(dependencies, replacerInfo)
            if (result) {
                ruleInfo.matchErrors.push(`规则作用于${ruleInfo.presentableName}时,检查到${deep == 1 ? "重复" : "循环"}依赖,无法替换`)
                continue
            }
            dependencies.splice(i, 1, replacerInfo)
        }
    }

    /**
     * 根据当前树的节点信息获取替换品信息
     * @param ruleInfo
     * @param targetModel
     * @param parents
     * @private
     * */
    async _getReplacerAndDependencies(targetInfo, ruleInfo, parents = []) {

        var efficientReplaceCount = 0
        var {id, name, type, version, replaceRecords = []} = targetInfo
        var comparableTarget = {id, name, type, version}

        for (let i = 0; i < ruleInfo.replaces.length; i++) {

            let {replaced, replacer, scopes} = ruleInfo.replaces[i]
            let isMock = replacer.type === "mock"

            if (!this._checkRuleScope(scopes, parents) || !this._entityIsMatched(replaced, comparableTarget)) {
                continue
            }

            const replacerInfo = isMock
                ? await this.importRuleHandler.getMockResourceInfo(replacer.name)
                : await this.importRuleHandler.getReleaseInfo(replacer.name)

            if (!replacerInfo) {
                ruleInfo.isValid = false
                ruleInfo.matchErrors.push(`替换品名称${replacer.name}无效,未找到对应的对象`)
                return
            }

            const version = isMock ? null : this.importRuleHandler.matchReleaseVersion(replacerInfo, replacer.versionRange)

            if (!isMock && !version) {
                ruleInfo.isValid = false
                ruleInfo.matchErrors.push(`替换品版本${replacer.versionRange}无效`)
                return
            }

            efficientReplaceCount += 1
            replaceRecords.push(comparableTarget)

            comparableTarget = {
                id: replacerInfo[isMock ? 'mockResourceId' : 'releaseId'],
                name: replacerInfo[isMock ? 'fullName' : 'releaseName'],
                version, type: replacer.type
            }
        }

        if (efficientReplaceCount === 0) {
            return
        }

        ruleInfo.options.replace.effectiveMatchCount += efficientReplaceCount

        //重新获取的依赖树和已经被替换过的依赖树对比,可能会存在循环依赖的情况.目前检查机制未避免此BUG
        const replacerDependencies = comparableTarget.type === "mock"
            ? await this.generateDependencyTreeHandler.generateMockDependencyTree(comparableTarget.id, false)
            : await this.generateDependencyTreeHandler.generateReleaseDependencyTree(comparableTarget.id, comparableTarget.version, false)

        return Object.assign({}, comparableTarget, {
            nid: this.generateDependencyTreeHandler.generateRandomStr(),
            dependencies: replacerDependencies,
            replaceRecords: replaceRecords
        })
    }

    /**
     * 检查scope是否符合
     * @param scope
     * @param parents
     * @returns Boolean 1:不符合  2:局部符合  3:完全符合
     * @private
     */
    _checkRuleScope(scopes, parents) {

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
    _entityIsMatched(scopeInfo, targetInfo) {

        let {name, type, versionRange = "*"} = scopeInfo
        let nameAndTypeIsMatched = name === targetInfo.name && type === targetInfo.type
        let versionIsMatched = type === 'release' ? Semver.satisfies(targetInfo.version, versionRange) : true

        return nameAndTypeIsMatched && versionIsMatched
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