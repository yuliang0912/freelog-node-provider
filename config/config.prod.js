/**
 * Created by yuliang on 2017/11/8.
 */

'use strict'

module.exports = {

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