/**
 * Created by yuliang on 2017/7/25.
 */

'use strict'

const mongoose = require('mongoose')
const presentable = require('./presentable.model')
const pageBuildWidgetRelation = require('./pagebuild.widget.relation.model')

module.exports = {

    /**
     * 节点的对外消费方案
     */
    presentable,

    /**
     * pageBuild的presentable与对应的widget的合同之间的关联
     */
    pageBuildWidgetRelation,

    /**
     * 自动获取mongoseID
     * @returns {*}
     * @constructor
     */
    get ObjectId() {
        return new mongoose.Types.ObjectId
    }
}