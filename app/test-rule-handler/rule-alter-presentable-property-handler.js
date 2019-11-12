'use strict'
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

        ruleInfo._asyncGetEntityTask = this.presentableProvider.findOne({presentableName: ruleInfo.presentableName})
            .then(entityInfo => this._fillRuleEntityInfo(ruleInfo, entityInfo))

        return ruleInfo
    }

    /**
     * 填充规则对应的实体信息
     * @param ruleInfo
     * @param entityInfo
     * @private
     */
    async _fillRuleEntityInfo(ruleInfo, entityInfo) {

        if (!entityInfo) {
            ruleInfo.isValid = false
            ruleInfo.matchErrors.push(`节点中不存在名称为${ruleInfo.presentableName}的节点发行`)
            return
        }

        const releaseInfo = await this.importRuleHandler.getReleaseInfo(entityInfo.releaseInfo.releaseId)
        const {resourceType = '', intro = '', resourceVersions = [], previewImages = []} = releaseInfo || {}

        entityInfo = entityInfo.toObject()
        entityInfo.intro = intro
        entityInfo.entityId = entityInfo.presentableId
        entityInfo.entityName = entityInfo.presentableName
        entityInfo.previewImages = previewImages
        entityInfo.entityType = "presentable"
        entityInfo.entityVersion = entityInfo.releaseInfo.version
        entityInfo.entityVersions = resourceVersions.map(x => x.version)
        entityInfo.resourceType = resourceType

        ruleInfo.entityInfo = entityInfo
    }
}
