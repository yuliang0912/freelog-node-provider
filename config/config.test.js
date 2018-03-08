/**
 * Created by yuliang on 2017/11/8.
 */

'use strict'

module.exports = {

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

    mongoose: {
        url: "mongodb://119.23.63.19:27017/node"
    },
}