/**
 * Created by yuliang on 2017/6/30.
 */

'use strict'

const eventListen = require('./app/event-handler/event-listen-index')

module.exports = async (app) => {

    /**
     * 监听app事件,主要是一些内部业务事件目前也挂在app上
     */
    eventListen.listenEvents(app)

}

