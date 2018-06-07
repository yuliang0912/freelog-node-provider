/**
 * Created by yuliang on 2017/11/2.
 */

'use strict'

module.exports = {

    /**
     * 允许跨域
     */
    allowCors(credentials = 'true', methods = '*', origin = '*') {

        this.set('Access-Control-Allow-credentials', credentials)
        this.set('Access-Control-Allow-Methods', methods)
        this.set('Access-Control-Allow-Origin', origin)

        return this
    },

    /**
     * 校验presnetableList schema
     * @param data
     * @returns {exports}
     */
    validatePresentableList(data) {

        let presentableSchemaValidate = this.helper.jsonSchema.presentableSchema

        let result =
            presentableSchemaValidate.validator.validate(data, presentableSchemaValidate.presentableListSchema)

        if (result.errors.length) {
            this.error({msg: "body-json-schema校验失败", data: result, errCode: this.app.errCodeEnum.paramValidateError})
        }

        return this
    },

    get webApi() {
        return this.app.webApi
    }
}