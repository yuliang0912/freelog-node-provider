'use strict'

const semver = require('semver')
const commonRegex = require('egg-freelog-base/app/extend/helper/common_regex')

module.exports = class RuleImportTestResourceHandler {

    constructor(app) {
        this.app = app
        this.presentableProvider = app.dal.presentableProvider
    }

    /**
     * 导入资源规则处理
     * @param ruleInfo
     */
    handle(ruleInfo) {

        const {name, type} = ruleInfo.candidate

        if (ruleInfo.isValid) {
            const getEntityInfoFunc = type == "mock" ? this.getMockResourceInfo : this.getReleaseInfo
            ruleInfo._asyncGetEntityTask = getEntityInfoFunc.call(this, name).then(entityInfo => this._fillRuleEntityInfo(ruleInfo, entityInfo))
        }

        return ruleInfo

        // if (nodePresentables.some(x => x.presentableName.toLowerCase() === ruleInfo.presentableName.toLowerCase())) {
        //     ruleInfo.isValid = false
        //     ruleInfo.matchErrors.push(`节点的presentable中已存在${ruleInfo.presentableName},规则无法生效`)
        // }
        // else if (type === "release" && nodePresentables.some(x => x.releaseInfo.releaseName.toLowerCase() === name.toLowerCase())) {
        //     ruleInfo.isValid = false
        //     ruleInfo.matchErrors.push(`节点的presentable中已存在发行${name},规则无法生效`)
        // }
        // else {
    }

    /**
     * 填充规则对应的实体信息
     * @param ruleInfo
     * @param entityInfo
     * @private
     */
    _fillRuleEntityInfo(ruleInfo, entityInfo) {

        const {name, type, versionRange} = ruleInfo.candidate
        const isMock = type === 'mock'

        if (!entityInfo) {
            ruleInfo.isValid = false
            ruleInfo.matchErrors.push(`未找到名称为${name}的${type}`)
            return
        }
        if (type === "mock" && entityInfo.userId !== ruleInfo.userId) {
            ruleInfo.isValid = false
            ruleInfo.matchErrors.push(`没有权限导入mock资源:${name}`)
            return
        }
        if (type === "release") {
            //this.presentableProvider.findOne({})
        }

        entityInfo.entityType = type
        entityInfo.entityId = entityInfo[isMock ? 'mockResourceId' : 'releaseId']
        entityInfo.entityName = entityInfo[isMock ? 'fullName' : 'releaseName']
        entityInfo.entityVersions = isMock ? [] : entityInfo.resourceVersions.map(x => x.version)
        entityInfo.entityVersion = isMock ? null : this.matchReleaseVersion(entityInfo, versionRange)

        ruleInfo.entityInfo = entityInfo
    }

    /**
     * 获取mock信息
     * @param mockName
     * @returns {*}
     */
    async getMockResourceInfo(mockName) {
        const {app} = this
        return app.curlIntranetApi(`${app.webApi.releaseInfo}/mocks/detail?mockName=${mockName}`)
    }

    /**
     * 获取发行信息
     * @param releaseName
     * @returns {*}
     */
    async getReleaseInfo(releaseNameOrId) {

        let {app} = this, url = ''
        if (commonRegex.mongoObjectId.test(releaseNameOrId)) {
            url = `${app.webApi.releaseInfo}/${releaseNameOrId}`
        }
        else if (commonRegex.fullReleaseName.test(releaseNameOrId)) {
            url = `${app.webApi.releaseInfo}/detail?releaseName=${releaseNameOrId}`
        } else {
            return null
        }

        return app.curlIntranetApi(url)
    }

    /**
     * 匹配发行版本
     * @param releaseInfo
     * @param versionRange
     * @returns {*}
     */
    matchReleaseVersion(releaseInfo, versionRange) {

        const {resourceVersions, latestVersion} = releaseInfo

        if (!versionRange || versionRange === "latest") {
            return latestVersion.version
        }

        return semver.maxSatisfying(resourceVersions.map(x => x.version), versionRange)
    }
}