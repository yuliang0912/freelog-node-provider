'use strict';

module.exports = appInfo => {

    const config = {
        /**
         * mongoDB配置
         */
        mongo: {
            uri: "mongodb://192.168.0.99:27017/node",
        },

        middleware: ['errorHandler', 'identiyAuthentication'],

        /**
         * DB-mysql相关配置
         */
        dbConfig: {
            node: {
                client: 'mysql2',
                connection: {
                    host: '192.168.0.99',
                    user: 'root',
                    password: 'yuliang@@',
                    database: 'fr_node',
                    charset: 'utf8',
                    timezone: '+08:00',
                    bigNumberStrings: true,
                    supportBigNumbers: true,
                    connectTimeout: 10000
                },
                pool: {
                    maxConnections: 50,
                    minConnections: 1,
                },
                acquireConnectionTimeout: 10000,
                debug: false
            },
        },

        security: {
            xframe: {
                enable: false,
            },
            csrf: {
                enable: false,
            }
        },

        /**
         * API网关地址
         */
        gatewayUrl: "http://api.freelog.com",

        /**
         * 节点首页模板文件地址
         */
        nodeHomePageTemplateUrl: "http://static.freelog.com/web-components/index.html"
    };

    // should change to your own
    config.keys = appInfo.name + '_1502781772068_5353';

    return config;
};
