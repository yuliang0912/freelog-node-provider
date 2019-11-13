'use strict'
const ImportRuleHandler = require('./rule-import-test-resource-handler')

module.exports = class RuleSetThemeHandler {

    constructor(app) {
        this.app = app
    }

    /**
     * 设置presentable属性
     * @param ruleInfo
     * @param testResources
     * @param userId
     */
    handle(testRules, testResources) {

        const setThemeRuleInfo = testRules.find(x => x.operation === 'activate_theme')

        if (!setThemeRuleInfo || !setThemeRuleInfo['themeName']) {
            return
        }

        const {themeName} = setThemeRuleInfo

        let mainPageBuildTestResource = testResources.find(x => x.testResourceName.toLowerCase() === themeName.toLowerCase())
        if (!mainPageBuildTestResource) {
            setThemeRuleInfo.isValid = false
            setThemeRuleInfo.matchErrors.push(`未找到需要激活的主题`)
            return setThemeRuleInfo
        }

        if (mainPageBuildTestResource.resourceType !== this.app.resourceType.PAGE_BUILD) {
            setThemeRuleInfo.isValid = false
            setThemeRuleInfo.matchErrors.push(`待激活的主题类型不符合`)
            return setThemeRuleInfo
        }

        setThemeRuleInfo.entityInfo = mainPageBuildTestResource

        return setThemeRuleInfo
    }
}
