/**
 * Created by yuliang on 2017/7/25.
 */

const mongoose = require('mongoose')
const presentable = require('./presentable.model')

module.exports = {
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