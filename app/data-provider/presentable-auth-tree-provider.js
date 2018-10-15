'use strict'

const MongoBaseOperation = require('egg-freelog-database/lib/database/mongo-base-operation')

module.exports = class PresentableAuthTreeProvider extends MongoBaseOperation {

    constructor(app) {
        super(app.model.PresentableAuthTree)
    }

    /**
     * 创建或更新授权树
     * @param model
     * @returns {Promise}
     */
    createOrUpdateAuthTree(model) {
        return super.findOneAndUpdate({presentableId: model.presentableId}, model, {new: true}).then(authTree => {
            return authTree || super.create(model)
        })
    }
}