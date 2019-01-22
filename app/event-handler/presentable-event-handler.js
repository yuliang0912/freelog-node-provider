/**
 * Created by yuliang on 2017/10/30.
 */

'use strict'

const presentableEvents = require('../enum/presentable-events')

module.exports = class PresentableEventHandler {

    constructor(app) {
        this.app = app
        this.__registerEventHandler__()
    }

    /**
     * presentable的合同执行到获得上线授权
     * @param presentableId
     * @returns {Promise<void>}
     */
    async presentableOnlineAuthEventHandler({nodeId, resourceId}) {
        const presentableInfo = await this.app.dal.presentableProvider.findOne({nodeId, resourceId})
        if (!presentableInfo) {
            return
        }
        if ((presentableInfo.status & 4) !== 4) {
            await presentableInfo.updateOne({$inc: {status: 4}})
        }
    }

    /**
     * presentable上线或下线事件
     * @returns {Promise<void>}
     */
    async presentableOnlineOrOfflineEventHandler(presentable) {

        const {app} = this
        if (presentable.resourceInfo.resourceType !== app.resourceType.PAGE_BUILD) {
            return
        }

        //下线,置空pageBuildId
        if (!presentable.isOnline) {
            return app.dal.nodeProvider.updateOne({nodeId: presentable.nodeId}, {pageBuildId: ''})
        }

        //上线pb,则下线其他的pb.
        const task1 = app.dal.nodeProvider.updateOne({nodeId: presentable.nodeId}, {pageBuildId: presentable.presentableId})
        const task2 = app.dal.presentableProvider.updateMany({
            _id: {$ne: presentable.presentableId},
            nodeId: presentable.nodeId,
            'resourceInfo.resourceType': app.resourceType.PAGE_BUILD
        }, {isOnline: 0})
        return Promise.all([task1, task2])
    }

    /**
     * 注册事件处理者
     * @private
     */
    __registerEventHandler__() {

        // arguments : {authScheme}
        this.app.on(presentableEvents.presentableOnlineOrOfflineEvent, this.presentableOnlineOrOfflineEventHandler.bind(this))

        this.app.on(presentableEvents.presentableOnlineAuthEvent, this.presentableOnlineAuthEventHandler.bind(this))

        this.app.on(presentableEvents.updatePresentableEvent, console.log)
    }
}