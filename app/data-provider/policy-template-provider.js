'use strict'

const MongoBaseOperation = require('egg-freelog-database/lib/database/mongo-base-operation')

module.exports = class PolicyTemplateProvider extends MongoBaseOperation {
    constructor(app) {
        super(app.model.PolicyTemplate)
        this.app = app
    }
}