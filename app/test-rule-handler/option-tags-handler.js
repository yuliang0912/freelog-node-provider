'use strict'

module.exports = class SetOnlineStatusOptionHandler {

    /**
     * tags操作实现
     * @param ruleInfo
     * @returns {*}
     */
    handle(ruleInfo) {

        if (!ruleInfo.isValid || !['alter', 'add'].includes(ruleInfo.operation)) {
            return ruleInfo
        }

        const {tags = null, entityInfo, entityType} = ruleInfo

        if (tags === null && entityType === "presentable") {
            ruleInfo.userDefinedTags = entityInfo.userDefinedTags
        }
        else {
            ruleInfo.userDefinedTags = tags || []
        }

        return ruleInfo
    }
}