/**
 * Created by yuliang on 2017/10/16.
 */

'use strict'

const uuid = require('uuid')
const {ArgumentError} = require('egg-freelog-base/error')
const nodeDomainCheck = require('./helper/node-domain-check')

module.exports = {

    /**
     * 节点域名
     * @param object
     */
    checkNodeDomain(nodeDomain) {

        const {ctx} = this

        return nodeDomainCheck.checkNodeDomain(ctx, nodeDomain)
    },

    /**
     * 生成随机字符串,最大长度32位
     * @param length
     * @returns {string}
     */
    generateRandomStr(length = 12) {
        if (length < 1) {
            throw new ArgumentError('param:length must be great than 0')
        }
        return uuid.v4().replace(/-/g, '').substr(0, length > 0 ? length : 32)
    }
}