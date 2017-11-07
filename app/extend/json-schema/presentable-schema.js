/**
 * Created by yuliang on 2017/11/3.
 */

'use strict'

const v = require('validator')
const is = require('egg-freelog-base/app/extend/application').type
const commonRegex = require('egg-freelog-base/app/extend/helper/common_regex')
const Validator = require('jsonschema').Validator

let validator = new Validator();

let presentableSchema = {
    id: "/presentableSchema",
    type: "object",
    properties: {
        name: {type: "string", format: 'presentableName'},
        contractId: {type: "string", format: 'mongoObjectId'},
        policyText: {type: "string", format: 'base64'},
        userDefinedTags: {type: "string"},
    },
    required: ["policyText"]
}

let presentableListSchema = {
    id: "/presentableListSchema",
    type: "array",
    items: {$ref: "/presentableSchema"}
}

/**
 * 校验presentableName
 * @param input
 * @returns {*|boolean}
 */
Validator.prototype.customFormats.presentableName = function (input) {
    return is.string(input) && input.length >= 2 && input.length <= 50
};

/**
 * mongoObjectId
 * @param input
 * @returns {*|boolean}
 */
Validator.prototype.customFormats.mongoObjectId = function (input) {
    return is.string(input) && commonRegex.mongoObjectId.test(input)
};

/**
 * 校验languageType
 * @param input
 * @returns {*|boolean}
 */
Validator.prototype.customFormats.languageType = function (input) {
    return is.string(input) && input === 'freelog_policy_lang'
};

/**
 * 校验base64
 * @param input
 * @returns {*|boolean}
 */
Validator.prototype.customFormats.base64 = function (input) {
    return v.isBase64(input)
};

validator.addSchema(presentableSchema, '/presentableSchema')
validator.addSchema(presentableListSchema, '/presentableListSchema')

module.exports = {
    validator,
    presentableSchema,
    presentableListSchema
}
