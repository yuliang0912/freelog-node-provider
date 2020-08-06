import { ValidatorResult } from 'jsonschema';
import { IJsonSchemaValidate } from '../../interface';
import * as freelogCommonJsonSchema from 'egg-freelog-base/app/extend/json-schema/common-json-schema';
export declare class resolveResourcesValidator extends freelogCommonJsonSchema implements IJsonSchemaValidate {
    validate(resolveResources: object[]): ValidatorResult;
    registerValidators(): void;
}
