'use strict'

const uuid = require('uuid')
const lodash = require('lodash')
const Patrun = require('patrun')
const nmrTranslator = require('@freelog/nmr_translator')
const ImportRuleHandler = require('./importRuleHandler')
const ReplaceRuleHandler = require('./repleaceRuleHandler')
const SetOnlineStatusHandler = require('./setOnlineStatusHandler')
const SetDefinedTagRuleHandler = require('./setDefinedTagRuleHandler')
const GenerateDependencyTreeHandler = require('./generateDependencyTreeHandler')

module.exports = class NodeTestRuleHandler {

    constructor(app) {
        this.app = app
        this.patrun = Patrun()
        this.importRuleHandler = new ImportRuleHandler(app)
        this.replaceRuleHandler = new ReplaceRuleHandler(app)
        this.nodeTestRuleProvider = app.dal.nodeTestRuleProvider
        this._initialTestRuleHandler()
    }

    /**
     * 匹配测试规则结果
     * step1.导入正式节点的presentables
     * step2.遍历按序执行所有的规则
     * step3.等待所有导入规则的异步任务执行完毕
     * step4.批量生成所有测试资源对应的依赖树
     * step5.执行第2步中已经预置好的替换规则后置处理函数(替换规则处理时只是标记规则替换的作用范围,直到此时基础数据完备才真正执行替换)
     */
    async matchTestRuleResults(nodeId, userId, testRules = []) {

        const {app} = this
        const testResources = await this.importRuleHandler.importNodePresentables(nodeId, testRules.length)

        testRules.forEach((ruleInfo, index) => {
            ruleInfo.id = uuid.v4().replace(/-/g, '')
            ruleInfo.effectiveMatchCount = 0
            ruleInfo.matchErrors = []
            let handler = this.patrun.find({ruleType: ruleInfo.operation})
            if (!handler) {
                console.error(`无效的处理规则,`, ruleInfo)
                return
            }
            handler.handle(ruleInfo, testResources, userId, index)
        })

        //批量执行所有异步获取mock/release实体信息的请求
        await Promise.all(testResources.filter(x => x.asyncTask).map(x => x.asyncTask))

        const validTestResources = testResources.filter(x => !Reflect.has(x, 'isValid') || x.isValid)

        //批量执行所有生成测试资源依赖树的异步请求
        await new GenerateDependencyTreeHandler(app).handle(validTestResources)

        //后置处理替换规则的异步请求
        await this.replaceRuleHandler.postpositionTaskHandle(testRules, validTestResources)

        return lodash.sortBy(validTestResources, x => x.sortIndex)
    }


    /**
     * 初始化测试规则对应的处理函数
     * @private
     */
    _initialTestRuleHandler() {
        const {app, patrun} = this
        patrun.add({ruleType: "add"}, this.importRuleHandler)
        patrun.add({ruleType: "replace"}, this.replaceRuleHandler)
        patrun.add({ruleType: "online"}, new SetOnlineStatusHandler(app))
        patrun.add({ruleType: "offline"}, new SetOnlineStatusHandler(app))
        patrun.add({ruleType: "set"}, new SetDefinedTagRuleHandler(app))
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
}