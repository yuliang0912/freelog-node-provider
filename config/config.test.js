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
                host: 'rm-wz9wj9435a0428942.mysql.rds.aliyuncs.com',
                user: 'freelog',
                password: 'Ff@233109',
                database: 'fr_node'
            },
            debug: false
        }
    },
    
    /**
     * mongodb连接
     */
    mongoose: {
        url: "mongodb://root:Ff233109@dds-wz9b5420c30a27941546-pub.mongodb.rds.aliyuncs.com:3717,dds-wz9b5420c30a27942267-pub.mongodb.rds.aliyuncs.com:3717/node?replicaSet=mgset-5016983"
    }
}