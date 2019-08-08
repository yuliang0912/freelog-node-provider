/**
 * Created by yuliang on 2017/9/5.
 */

'use strict'

const rabbitClient = require('./helper/rabbit_mq_client')

module.exports = {

    get rabbitClient() {
        return new rabbitClient(this.config.rabbitMq)
    }
}