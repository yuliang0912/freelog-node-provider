'use strict'

const FreelogCommonJsonSchema = require('./freelog-common-json-schema')

class PresentableContractJsonSchemaValidator extends FreelogCommonJsonSchema {

    constructor() {
        super()
        this.__initial__()
    }

    /**
     * presentable-contract更新校验
     * @returns {ActiveX.ISchema}
     */
    get presentableContractsValidator() {
        return super.getSchema('/presentableContractsSchema')
    }

    /**
     * 初始化函数
     * @private
     */
    __initial__() {
        this.__registerValidators__()
    }

    /**
     * 注册所有的校验
     * @private
     */
    __registerValidators__() {

        super.addSchema({
            id: "/presentableContractsSchema",
            type: "array",
            uniqueItems: true,
            maxItems: 100,
            items: {$ref: "/presentableContractSchema"}
        })

        super.addSchema({
            id: "/presentableContractSchema",
            type: "object",
            additionalProperties: false,
            properties: {
                resourceId: {required: true, type: "string", format: "resourceId"},
                policySegmentId: {type: "string", format: 'md5'},
                authSchemeId: {type: "string", format: 'mongoObjectId'},
                contractId: {type: "string", format: 'mongoObjectId'}
            }
        })
    }
}

module.exports = new PresentableContractJsonSchemaValidator()

