/**
 * Created by yuliang on 2017/7/25.
 */

'use strict'

const mongoose = require('mongoose')
const presentable = require('./presentable.model')

module.exports = {

    /**
     * 节点的对外消费方案
     */
    presentable,

    /**
     * 自动获取mongoseID
     * @returns {*}
     * @constructor
     */
    get ObjectId() {
        return new mongoose.Types.ObjectId
    }
}