/**
 * Created by yuliang on 2017/10/30.
 */

'use strict'

module.exports.listen = app => {

    /**
     * 创建presentable事件
     */
    app.on(app.event.presentableEvent.createPresentableEvent, presentable => {
        if (presentable.tagInfo.resourceInfo.resourceType !== app.resourceType.PAGE_BUILD) {
            return
        }
        let model = {
            nodeId: presentable.nodeId,
            presentableId: presentable.presentableId,
            presentableName: presentable.name,
            resourceId: presentable.tagInfo.resourceInfo.resourceId,
            userId: presentable.userId,
            status: 2 //默认隐藏
        }
        app.dataProvider.nodePageBuildProvider.createNodePageBuild(model).catch(console.error)
    })
}