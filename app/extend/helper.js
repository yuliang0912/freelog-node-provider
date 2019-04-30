/**
 * Created by yuliang on 2017/10/16.
 */

'use strict'

const policyCompiler = require('./policy-compiler/index')
const nodeDomainCheck = require('./helper/nodeDomainCheck')


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
     * 授权语言转换{policyText, languageType, policyName}
     */
    policyCompiler(...args) {
        const {ctx} = this
        return policyCompiler.compiler(ctx, ...args)
    }
}