'use strict'

const Subscription = require('egg').Subscription;

module.exports = class NodeDataImport extends Subscription {

    static get schedule() {
        return {
            cron: '* * * */2 * * *',  //5秒定时检查一次是否有新的支付事件
            type: 'worker', // 指定一个 worker需要执行
            immediate: true, //立即执行一次
            disable: false
        }
    }

    async subscribe() {

        const count = await this.app.dal.nodeProvider.count({})

        if (count) {
            return
        }

        const nodeList = await this.app.dal.nodeOldProvider.find({})
        for (let i = 0; i < nodeList.length; i++) {
            const nodePageBuild = await this.app.dal.nodeOldProvider.getNodePageBuild(nodeList[i].nodeId)
            if (nodePageBuild) {
                nodeList[i].pageBuildId = nodePageBuild.presentableId
            }
            this.app.dal.nodeProvider.create(nodeList[i])
        }
    }
}