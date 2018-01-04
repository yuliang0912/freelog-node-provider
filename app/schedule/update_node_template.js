/**
 * Created by yuliang on 2017/11/17.
 */

'use strict'

const Subscription = require('egg').Subscription;

module.exports = class UpdateNodeTemplate extends Subscription {

    static get schedule() {
        return {
            cron: '0 */15 * * * * *', // 1分钟间隔
            type: 'worker', // 指定一个 worker需要执行
            immediate: false, //立即执行一次
        };
    }

    async subscribe() {
        let nodeTemplate = await this.ctx.curl(this.config.nodeHomePageTemplateUrl).then(data => {
            return data.data.toString()
            // 客户端自己确保模板中使用绝对地址引用文件
            //.replace(/(href|src)=\".\//g, '$1="http://static.freelog.com/web-components/')
        }).catch(() => {
            console.error('获取节点模板文件失败.')
        })
        this.app.messenger.sendToApp('update-node-template', nodeTemplate)
    }
}
