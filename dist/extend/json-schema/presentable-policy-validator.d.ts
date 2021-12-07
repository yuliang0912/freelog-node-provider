import { ValidatorResult } from 'jsonschema';
import { IJsonSchemaValidate, CommonJsonSchema } from 'egg-freelog-base';
export declare class PresentablePolicyValidator extends CommonJsonSchema implements IJsonSchemaValidate {
    /**
     * 策略格式校验
     * @param operations
     * @param args
     */
    validate(operations: object[], ...args: any[]): ValidatorResult;
    /**
     * 注册所有的校验
     * @private
     */
    registerValidators(): void;
}
