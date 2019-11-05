'use strict'

module.exports = class SetOnlineStatusOptionHandler {

    /**
     * 上下线操作实现
     * @param ruleInfo
     * @returns {*}
     */
    handle(ruleInfo) {

        if (!ruleInfo.isValid) {
            return ruleInfo
        }

        const {online, entityInfo, entityType} = ruleInfo

        if (online === true || online === false) {
            ruleInfo.onlineStatus = online ? 1 : 0
        }
        else if (entityType === "presentable") {
            ruleInfo.onlineStatus = entityInfo.isOnline ? 1 : 0
        }
        else {
            ruleInfo.onlineStatus = 0
        }

        return ruleInfo
    }
}