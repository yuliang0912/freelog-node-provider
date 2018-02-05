/**
 * Created by yuliang on 2017/10/31.
 */

'use strict'

const moment = require('moment')
const KnexBaseOperation = require('egg-freelog-database/lib/database/knex-base-operation')

module.exports = class NodeProvider extends KnexBaseOperation {
    constructor(app) {
        super(app.knex.node("nodeinfo"))
        this.app = app
        this.nodeKnex = app.knex.node
    }

    /**
     * 创建节点
     * @param model
     * @returns {Promise|Promise.<*>}
     */
    createNode(model) {
        if (!super.type.object(model)) {
            return Promise.reject(new Error("model must be object"))
        }

        model.createDate = moment().toDate()
        model.status = 0 //开发阶段先不审核

        return super.create(model)
    }

    /**
     * 查询单个节点
     * @param condition
     */
    getNodeInfo(condition) {
        return super.findOne(condition)
    }


    /**
     * 获取多个节点
     * @param condition 资源查找条件
     * @returns {Promise.<*>}
     */
    getNodeList(condition, page, pageSize) {
        return super.findPageList({
            where: condition, page, pageSize,
            orderBy: "nodeId",
            asc: false
        })
    }

    /**
     * 获取数量
     * @param condition
     * @returns {*}
     */
    getCount(condition) {
        return super.count(condition)
    }
}
