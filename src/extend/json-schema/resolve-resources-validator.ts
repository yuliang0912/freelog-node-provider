import {provide, init, scope} from 'midway';
import {ValidatorResult} from 'jsonschema';
import {IJsonSchemaValidate} from '../../interface';
import * as freelogCommonJsonSchema from 'egg-freelog-base/app/extend/json-schema/common-json-schema';

@scope('Singleton')
@provide('resolveResourcesValidator')
export class resolveResourcesValidator extends freelogCommonJsonSchema implements IJsonSchemaValidate {

    validate(resolveResources: object[]): ValidatorResult {
        return super.validate(resolveResources, super.getSchema('/resolveResourcesSchema'))
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

