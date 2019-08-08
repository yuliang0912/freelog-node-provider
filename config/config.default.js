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

        middleware: ['errorHandler', 'identityAuthentication'],

        security: {
            xframe: {enable: false},
            csrf: {enable: false}
        },

        i18n: {
            enable: true,
            defaultLocale: 'zh-CN'
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

        customFileLoader: ['app/event-handler', 'app/mq-service'],

        rabbitMq: {
            connOptions: {
                host: '192.168.164.165',
                port: 5672,
                login: 'guest',
                password: 'guest',
                authMechanism: 'AMQPLAIN',
                heartbeat: 120  //每2分钟保持一次连接
            },
            implOptions: {
                reconnect: true,
                reconnectBackoffTime: 20000  //10秒尝试连接一次
            },
            exchange: {
                name: 'freelog-node-exchange',
            },
            queues: [
                {
                    name: 'node#presentable-auth-changed-queue',
                    options: {autoDelete: false, durable: true},
                    routingKeys: [
                        {
                            exchange: 'freelog-contract-exchange',
                            routingKey: 'auth.presentable.authStatus.changed'
                        }
                    ]
                },
            ]
        },

        clientCredentialInfo: {
            clientId: 1004,
            publicKey: 'c8724fd977542b155abac77664093770',
            privateKey: 'e8739ff716660a4c942724d306216612'
        },

        keys: 'freelog-node-provider-1502781772068_5353'
    }
}
