'use strict'
const ImportRuleHandler = require('./rule-import-test-resource-handler')

module.exports = class RuleSetGlobalPropertyHandler {

    constructor(app) {
        this.app = app
    }

    /**
     * 设置presentable属性
     * @param ruleInfo
     * @param testResources
     * @param userId
     */
    async handle(testRules) {

        const setGlobalRuleInfo = testRules.find(x => x.operation === 'set')
        
        if (!setGlobalRuleInfo) {
            return
        }

    }
}
