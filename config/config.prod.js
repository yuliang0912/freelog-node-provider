/**
 * Created by yuliang on 2017/11/8.
 */

'use strict'


module.exports = {

    mongoose: {
        url: "mongodb://mongo-prod.common:27017/node"
    },

    rabbitMq: {
        connOptions: {
            host: 'rabbitmq-prod.common',
            port: 5672,
            login: 'prod_user_node',
            password: 'rabbit@freelog',
            authMechanism: 'AMQPLAIN'
        },
    },
}