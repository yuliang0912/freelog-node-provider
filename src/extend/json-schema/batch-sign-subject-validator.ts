import {provide, init, scope} from 'midway';
import {ValidatorResult} from 'jsonschema';
import {IJsonSchemaValidate, CommonJsonSchema} from 'egg-freelog-base';

@scope('Singleton')
@provide()
export class BatchSignSubjectValidator extends CommonJsonSchema implements IJsonSchemaValidate {

    /**
     * 解决依赖资源格式校验
     * @param {object[]} operations 解决依赖资源数据
     * @returns {ValidatorResult}
     */
    validate(operations: object[]): ValidatorResult {
        return super.validate(operations, this.schemas['/signSubjectSchema']);
    }

    /**
     * 注册所有的校验
     * @private
     */
    @init()
    registerValidators() {
        super.addSchema({
            id: '/signSubjectSchema',
            type: 'array',
            uniqueItems: true,
            items: {
                type: 'object',
                required: true,
                additionalProperties: false,
                properties: {
                    subjectId: {type: 'string', required: true, format: 'mongoObjectId'},
                    policyId: {type: 'string', required: true, format: 'md5'}
                }
            }
        });
    }
}
