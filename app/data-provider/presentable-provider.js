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
}