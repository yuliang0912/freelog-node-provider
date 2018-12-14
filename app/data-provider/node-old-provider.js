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
     * 批量查询节点
     * @param nodeIds
     * @returns {Promise<Array>}
     */
    getNodeListByNodeIds(nodeIds) {

        if (!Array.isArray(nodeIds) || !nodeIds.length) {
            return Promise.resolve([])
        }

        return super.queryChain.whereIn('nodeId', nodeIds).select()
    }

    getNodePageBuild(nodeId) {
        return this.nodeKnex('nodepagebuild').where({nodeId, status: 1}).first()
    }
}