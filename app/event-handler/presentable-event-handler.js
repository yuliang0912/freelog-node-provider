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
     * 创建节点的pageBuild信息
     * @param presentable
     * @returns {Promise<void>}
     */
    async createPageBuild({presentable}) {

        const {app} = this
        if (presentable.resourceInfo.resourceType !== app.resourceType.PAGE_BUILD) {
            return
        }
        const model = {
            nodeId: presentable.nodeId,
            presentableId: presentable.presentableId,
            presentableName: presentable.presentableName,
            resourceId: presentable.resourceId,
            userId: presentable.userId,
            status: 2 //默认隐藏
        }
        app.dal.nodePageBuildProvider.createNodePageBuild(model).catch(error => {
            console.error("createPageBuild-error", error)
            app.logger.error("createPageBuild-error", error)
        })
    }

    /**
     * presentable的合同执行到获得上线授权
     * @param presentableId
     * @returns {Promise<void>}
     */
    async presentableOnlineAuthEventHandler({presentableId}) {
        const presentableInfo = await this.app.dal.presentableProvider.findById(presentableId)
        if (presentableInfo && (presentableInfo.status & 4) === 4) {
            return
        }
        console.log('event ', presentableInfo, presentableId)
        await presentableInfo.updateOne({$inc: {status: 4}})
    }

    /**
     * 注册事件处理者
     * @private
     */
    __registerEventHandler__() {

        // arguments : {authScheme}
        this.app.on(presentableEvents.createPresentableEvent, this.createPageBuild.bind(this))

        this.app.on(presentableEvents.presentableOnlineAuthEvent, this.presentableOnlineAuthEventHandler.bind(this))

        this.app.on(presentableEvents.updatePresentableEvent, console.log)
    }
}