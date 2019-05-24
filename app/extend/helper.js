/**
 * Created by yuliang on 2017/10/16.
 */

'use strict'

const nodeDomainCheck = require('./helper/node-domain-check')

module.exports = {

    /**
     * 节点域名
     * @param object
     */
    checkNodeDomain(nodeDomain) {

        const {ctx} = this

        return nodeDomainCheck.checkNodeDomain(ctx, nodeDomain)
    }
}