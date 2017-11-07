/**
 * Created by yuliang on 2017/10/16.
 */

'use strict'

const nodeDomainCheck = require('./helper/nodeDomainCheck')
const nodeTemplateHelper = require('./helper/node-template-helper')
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
     * node pb生成
     */
    nodeTemplateHelper,

    jsonSchema: require('./json-schema/index')
}