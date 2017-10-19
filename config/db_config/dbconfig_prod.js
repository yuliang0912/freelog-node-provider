/**
 * Created by yuliang on 2017-06-28.
 * 生产环境DB配置
 */


module.exports = {
    /**
     * 用户相关DB配置
     */
    node: {
        client: 'mysql2',
        connection: {
            host: '192.168.0.3',
            user: 'root',
            password: 'yuliang@@',
            database: 'fr_node',
            charset: 'utf8',
            timezone: '+08:00',
            bigNumberStrings: true,
            supportBigNumbers: true,
            //dateStrings: true,
            connectTimeout: 10000
        },
        pool: {
            maxConnections: 50,
            minConnections: 1,
        },
        acquireConnectionTimeout: 10000,
        debug: true
    },
}