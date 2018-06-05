'use strict'

const MongoBaseOperation = require('egg-freelog-database/lib/database/mongo-base-operation')

module.exports = class PresentableAuthTreeProvider extends MongoBaseOperation {

    constructor(app) {
        super(app.model.PresentableAuthTree)
        this.app = app
    }

    /**
     * 创建或更新授权树
     * @param model
     * @returns {Promise}
     */
    createOrUpdateAuthTree(model) {
        return super.findOneAndUpdate({presentableId: model.presentableId}, model).then(oldInfo => {
            return oldInfo ? super.findOne({presentableId: model.presentableId}) : super.create(model)
        })
    }
}