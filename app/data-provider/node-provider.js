/**
 * Created by yuliang on 2017/10/31.
 */

'use strict'

const MongoBaseOperation = require('egg-freelog-database/lib/database/mongo-base-operation')

module.exports = class NodeProvider extends MongoBaseOperation {

    constructor(app) {
        super(app.model.Node)
        this.app = app
    }

    /**
     * 创建节点
     * @param model
     */
    async createNode(model) {

        model.nodeId = await this.app.dal.autoIncrementRecordProvider.getNextDateValue()

        return super.create(model)
    }
}