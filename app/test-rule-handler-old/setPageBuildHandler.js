'use strict'

module.exports = class SetOnlineStatusHandler {

    constructor(app) {
        this.app = app
    }

    /**
     * 设置测试资源中pageBuild处理,保证最多只有一条上线的pageBuild
     * @param testResources
     */
    handle(testResources) {

        const onlinePageBuildTestResources = testResources.filter(x => x.resourceType === this.app.resourceType.PAGE_BUILD && x.onlineInfo.isOnline)

        if (onlinePageBuildTestResources.length <= 1) {
            return
        }

        // pageBuild上线处理规则:
        // 1.如果正式节点中有pageBuild上线,则沿用正式节点.导入的pageBuild资源则默认不上线
        // 2.如果正式节点中不存在上线的pageBuild,则导入的pageBuild资源默认第一个上线,其他的为非上线状态
    }
}