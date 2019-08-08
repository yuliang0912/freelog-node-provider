'use strict'

module.exports = {

    /**
     * presentable创建事件
     */
    PresentableCreatedEvent: Object.freeze({
        routingKey: 'node.presentable.created',
        eventName: 'presentableCreatedEvent'
    }),


    /**
     * presentable绑定合同事件
     */
    PresentableBindContractEvent: Object.freeze({
        routingKey: 'node.presentable.bindContract',
        eventName: 'presentableBindContractEvent'
    }),


    /**
     * presentable版本锁定事件
     */
    PresentableVersionLockedEvent: Object.freeze({
        routingKey: 'node.presentable.versionLocked',
        eventName: 'presentableVersionLockedEvent'
    }),
}