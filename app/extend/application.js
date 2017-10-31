/**
 * Created by yuliang on 2017/10/30.
 */

'use strict'

const nodeEvent = require('./event/freelog-node-events')
const presentableEvent = require('./event/freelog-presentable-events')

module.exports = {

    event: {

        /**
         * 节点事件
         */
        nodeEvent,

        /**
         * presentable事件
         */
        presentableEvent
    }
}