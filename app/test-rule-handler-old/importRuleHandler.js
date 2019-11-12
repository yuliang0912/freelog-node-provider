'use strict'

const lodash = require('lodash')
const semver = require('semver')
const commonRegex = require('egg-freelog-base/app/extend/helper/common_regex')

module.exports = class ImportRuleHandler {

    constructor(app) {
        this.app = app
        this.presentableProvider = app.dal.presentableProvider
    }

    /**
     * 导入资源规则处理
     * @param ruleInfo
     * @param testResources
     * @param userId
     */
    handle(ruleInfo, testResources, userId, sortIndex) {

        const {type, name, versionRange = null} = ruleInfo.candidate

        if (this._duplicateReleaseCheck(testResources, ruleInfo)) {
            ruleInfo.isValid = false
            ruleInfo.matchErrors.push(`存在重复导入${name}的错误`)
            return
        }

        const testResourceInfo = {
            testResourceName: ruleInfo.presentableName, versionRange, type,
            definedTagInfo: {
                definedTags: ruleInfo.tags ? ruleInfo.tags : [],
                source: ruleInfo.tags ? ruleInfo.id : "default"
            },
            onlineInfo: {
                isOnline: 1, //非presentable默认直接上线
                source: 'default'
            },
            sortIndex,
            resolveReleases: [],
            efficientRules: [ruleInfo]
        }

        testResources.push(testResourceInfo)

        testResourceInfo.asyncTask = this.importTestResource(ruleInfo, testResourceInfo, userId)
    }

    /**
     * 导入节点presentables
     * @param nodeId
     * @returns {Promise<*>}
     */
    async importNodePresentables(nodeId, sortIndex) {
        return this.presentableProvider.find({nodeId}).map(presentable => {
            let testResourceInfo = {
                testResourceName: presentable.presentableName,
                type: "presentable",
                version: presentable.releaseInfo.version,
                onlineInfo: {
                    isOnline: presentable.isOnline,
                    source: 'default'
                },
                definedTagInfo: {
                    definedTags: presentable.userDefinedTags,
                    source: 'default'
                },
                resourceType: presentable.releaseInfo.resourceType,
                previewImages: [],
                sortIndex: sortIndex++,
                resolveReleases: [],
                efficientRules: [],
                _originModel: presentable.toObject(),
                asyncTask: this.getReleaseInfo(presentable.releaseInfo.releaseId).then(releaseInfo => {
                    let {intro = '', resourceVersions = [], previewImages = []} = releaseInfo || {}
                    testResourceInfo.intro = intro
                    testResourceInfo.versions = resourceVersions.map(x => x.version)
                    testResourceInfo.previewImages = previewImages
                })
            }
            return testResourceInfo
        })
    }

    /**
     * 导入发行或者mock资源
     * @param name
     * @param type
     * @param testResourceInfo
     * @returns {Promise<*>}
     */
    async importTestResource(ruleInfo, testResourceInfo, userId) {

        const {name, type, versionRange = null} = ruleInfo.candidate
        const getModelFunc = type == "mock" ? this.getMockResourceInfo : this.getReleaseInfo

        const originModel = await getModelFunc.call(this, name, testResourceInfo)

        if (!originModel) {
            ruleInfo.isValid = testResourceInfo.isValid = false
            ruleInfo.matchErrors.push(`未找到名称为${name}的${type}`)
            return
        }

        if (type === "mock" && originModel.userId !== userId) {
            ruleInfo.isValid = testResourceInfo.isValid = false
            ruleInfo.matchErrors.push(`没有权限导入mock资源:${ruleInfo.candidate.name}`)
            return
        }

        testResourceInfo.resourceType = originModel.resourceType
        testResourceInfo.previewImages = originModel.previewImages
        testResourceInfo._originModel = originModel
        ruleInfo.effectiveMatchCount += 1

        if (type === "mock") {
            testResourceInfo.intro = lodash.truncate(lodash.unescape(originModel.description), {
                length: 100, omission: '...'
            })
            return
        }

        testResourceInfo.intro = originModel.intro
        const matchedVersion = this.matchReleaseVersion(originModel, versionRange)
        if (!matchedVersion) {
            ruleInfo.effectiveMatchCount -= 1
            ruleInfo.isValid = testResourceInfo.isValid = false
            ruleInfo.matchErrors.push(`发行的版本匹配失败,规则指定版本为${versionRange}`)
            return
        }
        testResourceInfo.version = matchedVersion
        testResourceInfo.versions = originModel.resourceVersions.map(x => x.version)
    }

    /**
     * 获取mock信息
     * @param mockName
     * @returns {*}
     */
    getMockResourceInfo(mockName) {
        const {app} = this
        return app.curlIntranetApi(`${app.webApi.releaseInfo}/mocks/detail?mockName=${mockName}`)
    }

    /**
     * 获取发行信息
     * @param releaseName
     * @returns {*}
     */
    getReleaseInfo(releaseNameOrId) {

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

    /**
     * 重复导入发行检查
     * @param testResourceInfo
     * @private
     */
    _duplicateReleaseCheck(testResources, ruleInfo) {

        const {name, type} = ruleInfo.candidate
        return type === 'release' && testResources.some(item => {
            return item.type === 'presentable' && item._originModel.releaseInfo.releaseName.toLowerCase() === name.toLowerCase()
        })
    }
}