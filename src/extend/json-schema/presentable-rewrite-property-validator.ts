import {provide, init, scope} from 'midway';
import {ValidatorResult} from 'jsonschema';
import {IJsonSchemaValidate, CommonJsonSchema} from 'egg-freelog-base';

/**
 * http://json-schema.org/understanding-json-schema/
 */
@scope('Singleton')
@provide('presentableRewritePropertyValidator')
export class PresentableRewritePropertyValidator extends CommonJsonSchema implements IJsonSchemaValidate {

    /**
     * 资源自定义属性格式校验
     * @param {object[]} operations 依赖资源数据
     * @returns {ValidatorResult}
     */
    validate(operations: object[]): ValidatorResult {
        return super.validate(operations, this.schemas['/presentableCustomPropertySchema']);
    }

    /**
     * 注册所有的校验
     * @private
     */
    @init()
    registerValidators() {
        super.addSchema({
            id: '/presentableCustomPropertySchema',
            type: 'array',
            uniqueItems: true,
            maxItems: 30, // 最多允许填写30个自定义字段
            items: {
                type: 'object',
                required: true,
                additionalProperties: false,
                properties: {
                    key: {
                        type: 'string', required: true, minLength: 1, maxLength: 20,
                        pattern: '^[a-zA-Z0-9_]{1,20}$'
                    },
                    value: {
                        // 考虑到UI文本框输入,目前限定为字符串.后期可能修改为any
                        type: 'string', required: true, minLength: 1, maxLength: 30
                    },
                    remark: {type: 'string', required: true, minLength: 0, maxLength: 50},
                }
            }
        });
    }
}
