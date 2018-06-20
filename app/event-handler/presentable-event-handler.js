/**
 * Created by yuliang on 2017/10/30.
 */

'use strict'

module.exports.listen = app => {

    /**
     * 创建presentable事件
     */
    app.on(app.event.presentableEvent.createPresentableEvent, presentable => {

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
        app.dataProvider.nodePageBuildProvider.createNodePageBuild(model).catch(console.error)
    })
}