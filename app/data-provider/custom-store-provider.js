'use strict'

const MongoBaseOperation = require('egg-freelog-database/lib/database/mongo-base-operation')

module.exports = class CustomStoreProvider extends MongoBaseOperation {

    constructor(app) {
        super(app.model.CustomDataStore)
        this.app = app
    }

    /**
     * 创建自定义存储
     * @param model
     * @returns {model}
     */
    createCustomStore(model) {
        return super.create(model)
    }

    async existKey(key){
        return super.count()
    }
}