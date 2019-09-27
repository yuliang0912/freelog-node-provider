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
                ruleInfo.effectiveMatchCount += 1
                current.definedTagInfo.source = id
                current.efficientRules.push(ruleInfo)
            }
        }
    }
}