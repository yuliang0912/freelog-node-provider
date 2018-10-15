'use strict';

const path = require('path')

module.exports = app => {
    return {
        cluster: {
            listen: {port: 7005}
        },

        /**
         * mongoDB配置
         */
        mongoose: {
            url: "mongodb://127.0.0.1:27017/node",
        },

        middleware: ['errorHandler', 'identiyAuthentication'],

        /**
         * DB-mysql相关配置
         */
        knex: {
            node: {
                client: 'mysql',
                connection: {
                    host: '127.0.0.1',
                    user: 'root',
                    password: 'yuliang@@',
                    database: 'fr_node',
                    charset: 'utf8',
                    timezone: '+08:00',
                    bigNumberStrings: true,
                    supportBigNumbers: true,
                    connectTimeout: 1500,
                    typeCast: (field, next) => {
                        if (field.type === 'JSON') {
                            return JSON.parse(field.string())
                        }
                        return next()
                    },
                },
                pool: {max: 10, min: 2},
                acquireConnectionTimeout: 500,
                debug: false
            },
        },

        security: {
            xframe: {enable: false},
            csrf: {enable: false}
        },

        logger: {
            consoleLevel: 'NONE',
            level: 'ERROR',
        },

        //错误日志500MB自动分割
        logrotator: {
            filesRotateBySize: [
                path.join(app.root, 'logs', app.name, 'common-error.log'),
            ],
            maxFileSize: 1024 * 1024 * 1024 * 0.5,
        },

        customLoader: [{
            name: 'eventHandler', dir: 'app/event-handler'
        }],

        /**
         * API网关地址
         */
        gatewayUrl: "https://api.freelog.com",

        keys: 'freelog-node-provider-1502781772068_5353'
    }
}
