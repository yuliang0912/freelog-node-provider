'use strict'

module.exports = class SetDefinedTagRuleHandler {

    constructor(app) {
        this.app = app
    }

    /**
     * 设置自定义Tag规则处理
     * @param ruleInfo
     * @param testResources
     */
    handle(ruleInfo, testResources) {

        const {id, presentableName, tags} = ruleInfo
        for (let i = 0, j = testResources.length; i < j; i++) {
            let current = testResources[i]
            if (current.testResourceName === presentableName) {
                current.definedTagInfo = {
                    source: id, definedTags: tags
                }
                current.definedTagInfo.source = id
                current.efficientRules.push(ruleInfo)
            }
        }
    }

    /**
     * 后置处理
     * @param testRules
     * @param testResources
     */
    postpositionTaskHandle(testRules, testResources) {

        const allSetDefinedTagRules = testRules.filter(x => x.operation === "set")

        for (let i = 0; i < allSetDefinedTagRules.length; i++) {
            let currRule = allSetDefinedTagRules[i]
            if (testResources.some(x => x.efficientRules.some(m => m.id === currRule.id))) {
                currRule.effectiveMatchCount += 1
            }
        }
    }
}