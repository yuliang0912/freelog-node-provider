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

        if (!super.type.object(model)) {
            return Promise.reject(new Error("model must be object"))
        }

        while (true) {
            model.nodeId = parseInt(Date.now().toString().substr(5, 6) + Math.random().toString().replace(/0.(0)*/, "").substr(0, 3))
            let isExistNodeId = await this._checkNodeIdIsExist(model.nodeId)
            if (!isExistNodeId) {
                break
            }
        }

        return super.create(model)
    }

    /**
     * 节点ID是否存在
     * @param nodeId
     * @returns {Promise<boolean>}
     * @private
     */
    async _checkNodeIdIsExist(nodeId) {
        return await super.count({nodeId}) > 0
    }

    /**
     * 获取多个节点
     * @param condition 资源查找条件
     * @returns {Promise.<*>}
     */
    getNodeList(condition, page, pageSize) {
        return super.findPageList(condition, page, pageSize, null, {nodeId: 1})
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

        return super.find({nodeId: {$in: nodeIds}})
    }
}