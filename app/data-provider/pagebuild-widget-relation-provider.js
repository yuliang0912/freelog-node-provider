'use strict'

const MongoBaseOperation = require('egg-freelog-database/lib/database/mongo-base-operation')

module.exports = class PageBuildWidgetRelationProvider extends MongoBaseOperation {
    constructor(app) {
        super(app.model.PagebuildWidgetRelation)
        this.app = app
        this.PagebuildWidgetRelation = app.model.PagebuildWidgetRelation
    }

    /**
     * 创建或更新pb与widget的关系
     * @param model
     * @returns {Promise}
     */
    createOrUpdate(model) {
        return this.PagebuildWidgetRelation.findOneAndUpdate({presentableId: model.presentableId}, {
            relevanceContractIds: model.relevanceContractIds
        }).then(relation => {
            if (relation) {
                relation.relevanceContractIds = model.relevanceContractIds
                return Promise.resolve(relation)
            }
            return super.create(model)
        })
    }

    /**
     * 获取pb对应的widget关系
     * @param condition
     */
    getWidgetRelation(condition) {
        return super.findOne(condition)
    }

    /**
     * 获取pb对应的widget关系
     * @param condition
     */
    getWidgetRelations(condition) {
        return super.find(condition)
    }
}