/**
 * Created by yuliang on 2017/10/16.
 */

'use strict'

const nodeDomainCheck = require('./helper/nodeDomainCheck')
const polifyParseFactory = require('./helper/policy_parse_factory')
const policyCompiler = new (require('./policy-compiler/index'))

module.exports = {

    /**
     * 节点域名
     * @param object
     */
    nodeDomain: nodeDomainCheck,

    /**
     * 授权语言转换
     */
    policyParse: polifyParseFactory.parse,

    /**
     * 授权语言转换{policyText, languageType, policyName}
     */
    policyCompiler(...args) {
        return policyCompiler.compiler(...args)
    }
}