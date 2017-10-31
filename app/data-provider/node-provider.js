/**
 * Created by yuliang on 2017/10/31.
 */

'use strict'

const moment = require('moment')

module.exports = app => {

    const {knex, type} = app

    return {
        /**
         * 创建节点
         * @param model
         * @returns {Promise|Promise.<*>}
         */
        createNode(model) {

            if (!type.object(model)) {
                return Promise.reject(new Error("model must be object"))
            }

            model.createDate = moment().toDate()
            model.status = 0 //开发阶段先不审核

            return knex.node('nodeinfo').insert(model)
        },

        /**
         * 查询单个节点
         * @param condition
         */
        getNodeInfo(condition) {

            if (!type.object(condition)) {
                return Promise.reject(new Error("condition must be object"))
            }

            return knex.node('nodeinfo').where(condition).first()
        },


        /**
         * 获取多个节点
         * @param condition 资源查找条件
         * @returns {Promise.<*>}
         */
        getNodeList(condition, page, pageSize) {

            if (!type.object(condition)) {
                return Promise.reject(new Error("condition must be object"))
            }

            return knex.node('nodeinfo').where(condition)
                .limit(pageSize).offset((page - 1) * pageSize)
                .orderBy('nodeId', 'desc')
                .select()
        },

        /**
         * 获取数量
         * @param condition
         * @returns {*}
         */
        getCount(condition) {

            if (!type.object(condition)) {
                return Promise.reject(new Error("condition must be object"))
            }

            return knex.node('nodeinfo').where(condition).count("nodeId as count").first()
        }
    }
}