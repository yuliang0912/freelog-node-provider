/**
 * Created by yuliang on 2017/6/30.
 */

'use strict'

const mongoDb = require('./app/models/db_start')
const eventListen = require('./app/event-handler/event-listen-index')

module.exports = async (app) => {

    /**
     * 监听app事件,主要是一些内部业务事件目前也挂在app上
     */
    eventListen.listenEvents(app)

    app.beforeStart(async () => {
        await app.runSchedule('update_node_template');
    })

    app.messenger.on('update-node-template', data => {
        app.config.nodeTemplate = data
    });

    /**
     * 连接mongodb
     */
    await mongoDb.connect(app)
}

