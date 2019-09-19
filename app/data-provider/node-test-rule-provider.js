/**
 * Created by yuliang on 2017/10/31.
 */

'use strict'

const MongoBaseOperation = require('egg-freelog-database/lib/database/mongo-base-operation')

module.exports = class NodeTestRuleProvider extends MongoBaseOperation {

    constructor(app) {
        super(app.model.NodeTestRule)
    }

}