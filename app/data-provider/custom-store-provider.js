'use strict'

const MongoBaseOperation = require('egg-freelog-database/lib/database/mongo-base-operation')

module.exports = class CustomStoreProvider extends MongoBaseOperation {

    constructor(app) {
        super(app.model.CustomDataStore)
        this.app = app
    }
}