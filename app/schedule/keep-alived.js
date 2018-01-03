'use strict'

const Subscription = require('egg').Subscription;

module.exports = class UpdateNodeTemplate extends Subscription {

    static get schedule() {
        return {
            cron: '*/5 * * * * * *',  //5秒定时检查一次是否有新的支付事件
            type: 'all', // 指定一个 worker需要执行
            immediate: false, //立即执行一次
        };
    }

    async subscribe() {
        this.keepAlivedMysql()
    }


    /**
     * 保持rabbitMq连接
     */
    keepAlivedMysql() {
        let {knex, logger} = this.app

        knex.node('nodeinfo').first().then(() => {
            logger.info('mysql keepalived')
        }).catch(err => {
            logger.error('mysql keepalived error:' + err.toString())
        })
    }
}
