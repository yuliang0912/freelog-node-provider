/**
 * Created by yuliang on 2017/10/31.
 */

'use strict'

const moment = require('moment')
const KnexBaseOperation = require('egg-freelog-database/lib/database/knex-base-operation')

module.exports = class NodeProvider extends KnexBaseOperation {

    constructor(app) {
        super(app.knex.node("nodePageBuild"))
        this.app = app
        this.nodeKnex = app.knex.node
    }

    /**
     * 节点设置自己的pb文件
     * @param model
     */
    createNodePageBuild(model) {

        if (!super.type.object(model)) {
            return Promise.reject(new Error("model must be object"))
        }

        model.createDate = moment().toDate()

        return super.create(model)
    }

    /**
     * 查询nodePageBuild
     * @param condition
     * @returns {*}
     */
    getNodePageBuild(condition) {
        return super.findOne(condition)
    }

    /**
     * 查询nodePageBuild
     * @param condition
     * @returns {*}
     */
    getNodePageBuildList(condition) {
        return super.find(condition)
    }

    /**
     * 更新状态
     * @param nodeId
     * @param id
     * @param status
     * @returns {*}
     */
    updateNodePageBuildStatus(nodeId, id, status) {
        return this.nodeKnex.transaction(trans => {
            let task1 = super.queryChain.transacting(trans).update({status}).where({nodeId, id})
            let task2 = status === 1
                ? super.queryChain.transacting(trans).update({status: 2}).where({nodeId}).where('id', '<>', id)
                : undefined

            return Promise.all([task1, task2]).then(trans.commit).catch(trans.rollback)
        })
    }
}