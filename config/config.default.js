'use strict';

const dbConfig = require('./db_config/dbconfig_local')

module.exports = appInfo => {

    const config = {
        /**
         * mongoDB配置
         */
        mongo: {
            uri: "mongodb://192.168.0.3:27017/node"
        },

        middleware: ['errorHandler', 'identiyAuthentication'],

        /**
         * DB-mysql相关配置
         */
        dbConfig: dbConfig,

        security: {
            xframe: {
                enable: false,
            },
            csrf: {
                enable: false,
            }
        },

        gatewayUrl: "http://192.168.0.3:1201"
    };

    // should change to your own
    config.keys = appInfo.name + '_1502781772068_5353';

    return config;
};
