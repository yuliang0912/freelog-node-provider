/**
 * Created by yuliang on 2017/11/8.
 */

'use strict'

module.exports = {

    cluster: {
        listen: {port: 5005}
    },

    /**
     * mongodb连接
     */
    mongoose: {
        url: "mongodb://172.18.215.231:27018/node"
    },

    rabbitMq: {
        connOptions: {
            host: '172.18.215.231',
            port: 5673,
            login: 'test_user_node',
            password: 'rabbit@freelog',
            authMechanism: 'AMQPLAIN'
        },
    },
}