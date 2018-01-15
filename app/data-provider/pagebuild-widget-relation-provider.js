const mongoModels = require('../models/index')

module.exports = app => {

    const type = app.type

    return {

        /**
         * 创建或更新pb与widget的关系
         * @param model
         * @returns {Promise}
         */
        createOrUpdate(model) {
            return mongoModels.pageBuildWidgetRelation.findOneAndUpdate({presentableId: model.presentableId}, {
                relevanceContractIds: model.relevanceContractIds
            }).then(relation => {
                if (relation) {
                    relation.relevanceContractIds = model.relevanceContractIds
                    return Promise.resolve(relation)
                }
                return mongoModels.pageBuildWidgetRelation.create(model)
            })
        },

        /**
         * 获取pb对应的widget关系
         * @param condition
         */
        getWidgetRelation(condition){

            if (!type.object(condition)) {
                return Promise.reject(new Error("condition must be object"))
            }

            return  mongoModels.pageBuildWidgetRelation.findOne(condition).exec()
        }
    }
}