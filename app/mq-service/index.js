'use strict'

const Patrun = require('patrun')
const rabbit = require('../extend/helper/rabbit_mq_client')
const {presentableOnlineAuthEvent} = require('../enum/presentable-events')

module.exports = class RabbitMessageQueueEventHandler {

    constructor(app) {
        this.app = app
        this.patrun = Patrun()
        this.__registerEventHandler__()
        this.subscribe()
    }

    /**
     * 订阅rabbitMQ消息
     */
    subscribe() {
        new rabbit(this.app.config.rabbitMq).connect().then(client => {
            const handlerFunc = this.handleMessage.bind(this)
            client.subscribe('node#presentable-event-receive-queue', handlerFunc)
        }).catch(console.error)
    }

    /**
     * rabbitMq事件处理主函数
     * @param message
     * @param headers
     * @param deliveryInfo
     * @param messageObject
     */
    async handleMessage(message, headers, deliveryInfo, messageObject) {

        const givenEventHandler = this.patrun.find({
            queueName: deliveryInfo.queue,
            routingKey: messageObject.routingKey,
            eventName: headers.eventName
        })

        if (givenEventHandler) {
            await givenEventHandler({message, headers, deliveryInfo, messageObject})
        } else {
            console.log(`不能处理的未知事件,queueName:${deliveryInfo.queue},routingKey:${messageObject.routingKey},eventName:${headers.eventName}`)
        }

        messageObject.acknowledge(false)
    }

    /**
     * 注册事件处理函数
     * @private
     */
    __registerEventHandler__() {

        const {patrun, app} = this

        //支付中心支付订单状态变更事件
        patrun.add({
            routingKey: 'presentable.onlineAuth.event',
            eventName: 'presentableOnlineAuthEvent'
        }, ({message}) => {
            app.emit(presentableOnlineAuthEvent, message)
        })
    }
}