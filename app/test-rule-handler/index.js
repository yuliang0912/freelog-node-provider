'use strict'

const uuid = require('uuid')
const Patrun = require('patrun')
const {ArgumentError} = require('egg-freelog-base/error')
const nmrTranslator = require('@freelog/nmr_translator')
const TagsOptionHandler = require('./option-tags-handler')
const ReplaceOptionHandler = require('./option-replace-handler')
const OnlineStatusOptionHandler = require('./option-online-status-handler')

const SetThemeRuleHandler = require('./rule-set-theme-handler')
const ImportTestResourceRuleHandler = require('./rule-import-test-resource-handler')
const AlterPresentablePropertyHandler = require('./rule-alter-presentable-property-handler')
const GenerateDependencyTreeHandler = require('./common-generate-dependency-tree-handler')

module.exports = class NodeTestRuleHandler {

    constructor(app) {

        this.app = app
        this.patrun = Patrun()
        this.presentableProvider = app.dal.presentableProvider
        this.nodeTestRuleProvider = app.dal.nodeTestRuleProvider
        this.tagsOptionHandler = new TagsOptionHandler(app)
        this.replaceOptionHandler = new ReplaceOptionHandler(app)
        this.setThemeRuleHandler = new SetThemeRuleHandler(app)
        this.onlineStatusOptionHandler = new OnlineStatusOptionHandler(app)
        this.generateDependencyTreeHandler = new GenerateDependencyTreeHandler(app)
        this.importTestResourceRuleHandler = new ImportTestResourceRuleHandler(app)
        this.alterPresentablePropertyHandler = new AlterPresentablePropertyHandler(app)
        this._initialTestRuleHandler()
    }

    /**
     * 匹配测试规则结果
     * step1.筛选出规则中所有操作正式节点的规则(operation=set)
     * step2.执行对应的set属性操作,例如online,tags,replace等
     * step3.执行导入测试资源操作的规则(operation=add)
     * step4.基础校验规则,例如presentableName是否存在,releaseName是否已使用
     * step5.执行导入测试资源操作的规则的设置项.例如online,tags,replace等
     */
    async matchTestRuleResults(nodeId, userId, testRules) {

        if (testRules.length > 200) {
            throw new ArgumentError('规则一批次最多支持200条')
        }

        this._expandRuleInfoProperty(testRules, nodeId, userId)

        await this._checkImportNameAndEntityIsExist(testRules, nodeId)

        testRules.forEach(ruleInfo => {
            let operationHandler = this.patrun.find({type: "rule", operation: ruleInfo.operation})
            operationHandler && operationHandler.handle(ruleInfo)
        })

        //批量执行异步获取实体的操作
        await Promise.all(testRules.filter(x => x._asyncGetEntityTask).map(x => x._asyncGetEntityTask))

        //生成实体对应的依赖树(此处为了后续的replace操作服务)
        await this.generateDependencyTreeHandler.handle(testRules)

        const replaceTasks = []
        for (let i = 0; i < testRules.length; i++) {
            let ruleInfo = testRules[i]
            this.tagsOptionHandler.handle(ruleInfo)
            this.onlineStatusOptionHandler.handle(ruleInfo)
            replaceTasks.push(this.replaceOptionHandler.handle(ruleInfo))
        }

        await Promise.all(replaceTasks)

        return testRules
    }

    /**
     * 获取主题信息
     * @param testRules
     * @param testResources
     * @returns {*}
     */
    getSchemeInfo(testRules, testResources) {

        const setThemeRuleInfo = this.setThemeRuleHandler.handle(testRules, testResources)
        if (!setThemeRuleInfo) {
            return testResources.find(x => x.resourceType === 'page_build' && x.originInfo.type === 'presentable' && x.differenceInfo.onlineStatusInfo.isOnline)
        }
        if (setThemeRuleInfo) {
            return setThemeRuleInfo.isValid ? setThemeRuleInfo.entityInfo : null
        }
    }

    /**
     * 编译测试规则
     * @param testRuleText
     */
    compileTestRule(testRuleText) {

        if (testRuleText === null || testRuleText === undefined || testRuleText === "") {
            return {errors: [], rules: []}
        }

        return nmrTranslator.compile(testRuleText)
    }

    /**
     * 批量检测导入规则中的presentableName是否已存在.以及导入的发行是否已经签约到正式节点中
     * @private
     */
    async _checkImportNameAndEntityIsExist(testRules, nodeId) {

        var condition = {nodeId, $or: []}
        const allAddPresentableNames = testRules.filter(x => x.operation === 'add').map(x => new RegExp(`^${x.presentableName}$`, 'i'))
        const allAddReleaseNames = testRules.filter(x => x.operation === 'add' && x.candidate.type === 'release').map(x => new RegExp(`^${x.candidate.name}$`, 'i'))

        if (allAddPresentableNames.length) {
            condition.$or.push({"presentableName": {"$in": allAddPresentableNames}})
        }
        if (allAddReleaseNames.length) {
            condition.$or.push({"releaseInfo.releaseName": {"$in": allAddReleaseNames}})
        }
        if (!condition.$or.length) {
            return
        }

        const presentables = await this.presentableProvider.find(condition, 'presentableName releaseInfo')

        for (let i = 0; i < presentables.length; i++) {
            let {presentableName, releaseInfo} = presentables[i]
            let existingPresentableNameRule = testRules.find(x => x.operation === 'add' && x.presentableName.toLowerCase() === presentableName.toLowerCase())
            if (existingPresentableNameRule) {
                existingPresentableNameRule.isValid = false
                existingPresentableNameRule.matchErrors.push(`节点的presentable中已存在${existingPresentableNameRule.presentableName},规则无法生效`)
            }
            let existingReleaseNameRule = testRules.find(x => x.operation === 'add' && x.candidate.name.toLowerCase() === releaseInfo.releaseName.toLowerCase() && x.candidate.type === "release")
            if (existingReleaseNameRule) {
                existingReleaseNameRule.isValid = false
                existingReleaseNameRule.matchErrors.push(`节点的presentable中已存在发行${existingReleaseNameRule.candidate.name},规则无法生效`)
            }
        }
    }

    /**
     * 拓展测试规则的属性
     * @param testRules
     * @param userId
     * @returns {*}
     * @private
     */
    _expandRuleInfoProperty(testRules, nodeId, userId) {
        testRules.forEach(ruleInfo => {
            ruleInfo.isValid = true
            ruleInfo.id = uuid.v4().replace(/-/g, '')
            ruleInfo.userId = userId
            ruleInfo.nodeId = nodeId
            ruleInfo.matchErrors = []
            ruleInfo.options = {}
            if (ruleInfo.tags !== null) {
                ruleInfo.options.setTags = {effectiveMatchCount: 1}
            }
            if (ruleInfo.online !== null) {
                ruleInfo.options.setOnlineStatus = {effectiveMatchCount: 1}
            }
            if (ruleInfo.replaces && ruleInfo.replaces.length) {
                ruleInfo.options.replace = {
                    effectiveMatchCount: 0,
                    replaceRecords: []
                }
            }
        })
        return testRules
    }

    /**
     * 初始化测试规则对应的处理函数
     * @private
     */
    _initialTestRuleHandler() {

        const {patrun} = this
        patrun.add({type: "rule", operation: "add"}, this.importTestResourceRuleHandler)
        patrun.add({type: "rule", operation: "alter"}, this.alterPresentablePropertyHandler)
    }
}