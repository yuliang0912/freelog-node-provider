'use strict'

const Patrun = require('patrun')
const {ApplicationError} = require('egg-freelog-base/error')
const PresentableEvents = require('../enum/presentable-events')
const PresentableLockVersionEventHandler = require('./presentable-lock-version-event-handler')
const PresentableSignContractEventHandler = require('./presentable-sign-contract-event-handler')
const GeneratePresentableDependencyTreeEventHandler = require('./generate-dependency-tree-event-handler')
const PresentableSwitchOnlineStateEventHandler = require('./presentable-switch-online-state-event-handler')

module.exports = class AppEventsListener {

    constructor(app) {
        this.app = app
        this.patrun = Patrun()
        this.registerEventHandler()
        this.registerEventListener()
    }

    /**
     * 注册事件侦听者
     */
    registerEventListener() {
        this.registerEventAndHandler(PresentableEvents.signReleaseContractEvent)
        this.registerEventAndHandler(PresentableEvents.presentableVersionLockEvent)
        this.registerEventAndHandler(PresentableEvents.generatePresentableDependencyTreeEvent)
        this.registerEventAndHandler(PresentableEvents.presentableSwitchOnlineStateEvent)
    }

    /**
     * 注册事件以及事件处理者
     * @param eventName
     */
    registerEventAndHandler(eventName) {

        const eventHandler = this.patrun.find({event: eventName.toString()})
        if (!eventHandler) {
            throw new ApplicationError(`尚未注册事件${eventName}的处理者`)
        }

        this.app.on(eventName, (...args) => eventHandler.handle(...args))
    }

    /**
     * 注册事件处理者
     */
    registerEventHandler() {

        const {app, patrun} = this

        patrun.add({event: PresentableEvents.signReleaseContractEvent.toString()}, new PresentableSignContractEventHandler(app))
        patrun.add({event: PresentableEvents.presentableVersionLockEvent.toString()}, new PresentableLockVersionEventHandler(app))
        patrun.add({event: PresentableEvents.presentableSwitchOnlineStateEvent.toString()}, new PresentableSwitchOnlineStateEventHandler(app))
        patrun.add({event: PresentableEvents.generatePresentableDependencyTreeEvent.toString()}, new GeneratePresentableDependencyTreeEventHandler(app))

    }
}