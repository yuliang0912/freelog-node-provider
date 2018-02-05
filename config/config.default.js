'use strict';

module.exports = appInfo => {

    const config = {
        /**
         * mongoDB配置
         */
        mongoose: {
            url: "mongodb://192.168.0.99:27017/node",
        },

        middleware: ['errorHandler', 'identiyAuthentication'],

        /**
         * DB-mysql相关配置
         */
        knex: {
            node: {
                client: 'mysql',
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
                    max: 10, min: 2,
                    afterCreate: (conn, done) => {
                        conn.on('error', err => {
                            console.log(`mysql connection error : ${err.toString()}`)
                            err.fatal && globalInfo.app.knex.resource.client.pool.destroy(conn)
                        })
                        done()
                    }
                },
                acquireConnectionTimeout: 800,
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
    };

    // should change to your own
    config.keys = appInfo.name + '_1502781772068_5353';

    return config;
};
