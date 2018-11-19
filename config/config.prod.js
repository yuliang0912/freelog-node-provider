/**
 * Created by yuliang on 2017/11/8.
 */

'use strict'

module.exports = {
    /**
     * DB-mysql相关配置
     */
    knex: {
        node: {
            connection: {
                host: '172.18.215.231',
                user: 'root',
                password: 'Ff@233109',
                database: 'fr_node'
            },
            debug: false
        }
    },

    /**
     * api网关内网地址
     */
    gatewayUrl: "http://172.18.215.224:8895",

    /**
     * mongodb连接
     */
    mongoose: {
        url: "mongodb://172.18.215.231:27017/node"
    },

    rabbitMq: {
        connOptions: {
            host: '172.18.215.231',
            port: 5672,
            login: 'prod_user_node',
            password: 'rabbit@freelog',
            authMechanism: 'AMQPLAIN'
        },
    },
}