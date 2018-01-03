/**
 * Created by yuliang on 2017/10/30.
 */

'use strict'


const presentableEventListen = require('./presentable-event-handler')
const nodeTemplateUpdateEventListen = require('./node-template-update-handler')


module.exports.listenEvents = app => {

    /**
     * presentable事件监听与处理
     */
    presentableEventListen.listen(app)

    nodeTemplateUpdateEventListen.listen(app)
}