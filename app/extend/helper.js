/**
 * Created by yuliang on 2017/10/16.
 */

'use strict'

const nodeDomainCheck = require('./helper/nodeDomainCheck')
const polifyParseFactory = require('./helper/policy_parse_factory')

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
     * json格式校验
     */
    jsonSchema: require('./json-schema/index')
}