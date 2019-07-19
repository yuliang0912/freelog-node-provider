'use strict'

const lodash = require('lodash')

module.exports = class PresentableSwitchOnlineStateEventHandler {

    constructor(app) {
        this.app = app
        this.nodeProvider = app.dal.nodeProvider
        this.presentableProvider = app.dal.presentableProvider
    }

    /**
     * presentable切换上下线状态事件处理
     * @param presentable
     * @returns {Promise<void>}
     */
    async handle(presentable) {

        const {PAGE_BUILD} = this.app.resourceType
        const {releaseInfo, isOnline, nodeId, presentableId} = presentable
        if (releaseInfo.resourceType !== PAGE_BUILD) {
            return
        }

        const tasks = []
        tasks.push(this.nodeProvider.updateOne({nodeId}, {pageBuildId: isOnline ? presentableId : ''}))

        if (isOnline) {
            tasks.push(this.presentableProvider.updateMany({
                _id: {$ne: presentableId}, nodeId, 'releaseInfo.resourceType': PAGE_BUILD
            }, {isOnline: 0}))
        }

        return Promise.all(tasks)
    }
}