import {provide, init, scope} from 'midway';
import {ValidatorResult} from 'jsonschema';
import {IJsonSchemaValidate, CommonJsonSchema} from 'egg-freelog-base';

@scope('Singleton')
@provide()
export class resolveResourcesValidator extends CommonJsonSchema implements IJsonSchemaValidate {

    validate(resolveResources: object[]): ValidatorResult {
        return super.validate(resolveResources, this.schemas['/resolveResourcesSchema'])
    }

    @init()
    registerValidators() {
        super.addSchema({
            id: "/resolveResourcesSchema",
            type: "array",
            uniqueItems: true,
            items: {
                type: "object",
                required: true,
                additionalProperties: false,
                properties: {
                    resourceId: {type: "string", required: true, format: 'mongoObjectId'},
                    contracts: {
                        type: "array",
                        uniqueItems: true,
                        required: true,
                        maxItems: 10,
                        minItems: 1,
                        items: {
                            type: "object",
                            required: true,
                            additionalProperties: false,
                            properties: {
                                policyId: {type: "string", required: true, format: 'md5'}
                            }
                        }
                    }
                }
            }
        })
    }
}

