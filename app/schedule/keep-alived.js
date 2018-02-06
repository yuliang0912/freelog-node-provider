'use strict'

const Subscription = require('egg').Subscription;

module.exports = class UpdateNodeTemplate extends Subscription {

    static get schedule() {
        return {
            cron: '0 */5 * * * * *', //5分钟执行一次
            type: 'worker', // 指定一个 worker需要执行
            immediate: true, //立即执行一次
            disable: true
        };
    }

    async subscribe() {
        //knex-connection-pool自动管理连接池
    }


    /**
     * 保持Mysql连接
     */
    keepAlivedMysql() {
        let {knex, logger} = this.app
        knex.node.raw("select 1").then(() => {
            logger.info('mysql keepalived')
        }).catch(err => {
            logger.error('mysql keepalived error:' + err.toString())
        })
    }
}
