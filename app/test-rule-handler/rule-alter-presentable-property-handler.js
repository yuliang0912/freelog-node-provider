'use strict'

const lodash = require('lodash')
const ImportRuleHandler = require('./rule-import-test-resource-handler')

module.exports = class RuleAlterPresentablePropertyHandler {

    constructor(app) {
        this.app = app
        this.importRuleHandler = new ImportRuleHandler(app)
        this.presentableProvider = app.dal.presentableProvider
    }

    /**
     * 设置presentable属性
     * @param ruleInfo
     * @param testResources
     * @param userId
     */
    async handle(ruleInfo) {

        ruleInfo._asyncGetEntityTask = this.presentableProvider.findOne({
            nodeId: ruleInfo.nodeId,
            presentableName: new RegExp(`^${ruleInfo.presentableName}$`, 'i')
        }).then(presentableInfo => this._fillRuleEntityInfo(ruleInfo, presentableInfo))

        return ruleInfo
    }

    /**
     * 填充规则对应的实体信息
     * @param ruleInfo
     * @param entityInfo
     * @private
     */
    async _fillRuleEntityInfo(ruleInfo, presentableInfo) {

        if (!presentableInfo) {
            ruleInfo.isValid = false
            ruleInfo.matchErrors.push(`节点中不存在名称为${ruleInfo.presentableName}的节点发行`)
            return
        }

        const releaseInfo = await this.importRuleHandler.getReleaseInfo(presentableInfo.releaseInfo.releaseId)

        const entityInfo = lodash.pick(releaseInfo, ['resourceType', 'intro', 'previewImages'])
        entityInfo.entityId = releaseInfo.releaseId
        entityInfo.entityName = releaseInfo.releaseName
        entityInfo.entityType = "release"
        entityInfo.entityVersion = presentableInfo.releaseInfo.version
        entityInfo.entityVersions = releaseInfo['resourceVersions'].map(x => x.version)
        entityInfo.presentableInfo = presentableInfo.toObject()

        ruleInfo.entityInfo = entityInfo
    }
}
