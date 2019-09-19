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
    handle(ruleInfo, testResources = []) {

        const {id, operation, presentation} = ruleInfo
        for (let i = 0, j = testResources.length; i < j; i++) {
            let current = testResources[i]
            if (current.testResourceName === presentation) {
                current.onlineInfo = {
                    source: id, isOnline: operation.toLowerCase() === "online" ? 1 : 0,
                }
                ruleInfo.effectiveMatchCount += 1
                current.efficientRules.push(ruleInfo)
            }
        }
    }
}