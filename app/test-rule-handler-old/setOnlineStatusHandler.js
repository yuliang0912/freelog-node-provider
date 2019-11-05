'use strict'

module.exports = class SetOnlineStatusHandler {

    constructor(app) {
        this.app = app
    }

    /**
     * 设置上线or下线
     * @param ruleInfo
     * @param testResources
     */
    handle(ruleInfo, testResources) {

        const {id, operation, presentableName} = ruleInfo
        for (let i = 0, j = testResources.length; i < j; i++) {
            let current = testResources[i]
            if (current.testResourceName === presentableName) {
                current.onlineInfo = {
                    source: id, isOnline: operation.toLowerCase() === "online" ? 1 : 0,
                }
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

        const allOnlineOfflineRules = testRules.filter(x => x.operation === "online" || x.operation == "offline")

        for (let i = 0; i < allOnlineOfflineRules.length; i++) {
            let currRule = allOnlineOfflineRules[i]
            if (testResources.some(x => x.efficientRules.some(m => m.id === currRule.id))) {
                currRule.effectiveMatchCount += 1
            }
        }
    }
}