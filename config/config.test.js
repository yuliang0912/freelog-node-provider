/**
 * Created by yuliang on 2017/11/8.
 */

'use strict'

module.exports = {

    knex: {
        node: {
            connection: {
                host: 'rm-wz93t7g809kthrub7.mysql.rds.aliyuncs.com',
                user: 'freelog_test',
                password: 'Ff@233109',
                database: 'fr_node'
            },
            debug: false
        }
    },

    mongoose: {
        url: "mongodb://172.18.215.229/node"
    },
}