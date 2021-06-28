import { ValidatorResult } from 'jsonschema';
import { IJsonSchemaValidate, CommonJsonSchema } from 'egg-freelog-base';
export declare class resolveResourcesValidator extends CommonJsonSchema implements IJsonSchemaValidate {
    validate(resolveResources: object[]): ValidatorResult;
    registerValidators(): void;
}
