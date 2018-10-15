/**
 * Created by yuliang on 2017/10/31.
 */

'use strict'

const MongoBaseOperation = require('egg-freelog-database/lib/database/mongo-base-operation')

module.exports = class PresentableProvider extends MongoBaseOperation {

    constructor(app) {
        super(app.model.Presentable)
        this.app = app
    }

    /**
     * 创建presentable
     * @param model
     * @returns {Promise}
     */
    createPresentable(model) {

        if (!super.type.object(model)) {
            return Promise.reject(new Error("model must be object"))
        }

        return super.findOneAndUpdate({
            resourceId: model.resourceId,
            nodeId: model.nodeId
        }, model, {new: true}).then(presentableInfo => {
            return presentableInfo || super.create(model)
        })
    }
}