"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PresentablePolicyValidator = void 0;
const midway_1 = require("midway");
const egg_freelog_base_1 = require("egg-freelog-base");
let PresentablePolicyValidator = class PresentablePolicyValidator extends egg_freelog_base_1.CommonJsonSchema {
    /**
     * 策略格式校验
     * @param {object[]} operations 策略信息
     * @param {boolean} isUpdateMode 是否更新模式
     * @returns {ValidatorResult}
     */
    validate(operations, ...args) {
        const schemaId = args[0] === 'addPolicy' ? '/addPolicySchema' : '/updatePolicySchema';
        return super.validate(operations, this.schemas[schemaId]);
    }
    /**
     * 注册所有的校验
     * @private
     */
    registerValidators() {
        /**
         * 策略名称格式
         * @param input
         * @returns {boolean}
         */
        super.registerCustomFormats('policyName', (input) => {
            input = input.trim();
            return input.length >= 2 && input.length <= 20;
        });
        /**
         * 新增策略格式
         */
        super.addSchema({
            id: '/addPolicySchema',
            type: 'array',
            uniqueItems: true,
            maxItems: 20,
            items: {
                type: 'object',
                required: true,
                additionalProperties: false,
                properties: {
                    policyName: { required: true, minLength: 1, maxLength: 20, type: 'string', format: 'policyName' },
                    policyText: { required: true, type: 'string' },
                    status: { required: false, type: 'integer', enum: [0, 1], minimum: 0, maximum: 1 }
                }
            }
        });
        /**
         * 修改策略格式
         */
        super.addSchema({
            id: '/updatePolicySchema',
            type: 'array',
            uniqueItems: true,
            maxItems: 20,
            items: {
                type: 'object',
                required: true,
                additionalProperties: false,
                properties: {
                    policyId: { required: true, type: 'string', format: 'md5' },
                    // 目前只允许修改上线下状态,名字暂时锁住不让修改
                    status: { required: true, type: 'integer', enum: [0, 1], minimum: 0, maximum: 1 }
                }
            }
        });
    }
};
__decorate([
    midway_1.init(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], PresentablePolicyValidator.prototype, "registerValidators", null);
PresentablePolicyValidator = __decorate([
    midway_1.scope('Singleton'),
    midway_1.provide()
], PresentablePolicyValidator);
exports.PresentablePolicyValidator = PresentablePolicyValidator;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlc2VudGFibGUtcG9saWN5LXZhbGlkYXRvci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3NyYy9leHRlbmQvanNvbi1zY2hlbWEvcHJlc2VudGFibGUtcG9saWN5LXZhbGlkYXRvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7QUFBQSxtQ0FBNEM7QUFFNUMsdURBQXVFO0FBSXZFLElBQWEsMEJBQTBCLEdBQXZDLE1BQWEsMEJBQTJCLFNBQVEsbUNBQWdCO0lBRzVEOzs7OztPQUtHO0lBQ0gsUUFBUSxDQUFDLFVBQW9CLEVBQUUsR0FBRyxJQUFJO1FBQ2xDLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxXQUFXLENBQUMsQ0FBQyxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQyxxQkFBcUIsQ0FBQztRQUN0RixPQUFPLEtBQUssQ0FBQyxRQUFRLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztJQUM5RCxDQUFDO0lBRUQ7OztPQUdHO0lBRUgsa0JBQWtCO1FBQ2Q7Ozs7V0FJRztRQUNILEtBQUssQ0FBQyxxQkFBcUIsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxLQUFLLEVBQUUsRUFBRTtZQUNoRCxLQUFLLEdBQUcsS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ3JCLE9BQU8sS0FBSyxDQUFDLE1BQU0sSUFBSSxDQUFDLElBQUksS0FBSyxDQUFDLE1BQU0sSUFBSSxFQUFFLENBQUM7UUFDbkQsQ0FBQyxDQUFDLENBQUM7UUFHSDs7V0FFRztRQUNILEtBQUssQ0FBQyxTQUFTLENBQUM7WUFDWixFQUFFLEVBQUUsa0JBQWtCO1lBQ3RCLElBQUksRUFBRSxPQUFPO1lBQ2IsV0FBVyxFQUFFLElBQUk7WUFDakIsUUFBUSxFQUFFLEVBQUU7WUFDWixLQUFLLEVBQUU7Z0JBQ0gsSUFBSSxFQUFFLFFBQVE7Z0JBQ2QsUUFBUSxFQUFFLElBQUk7Z0JBQ2Qsb0JBQW9CLEVBQUUsS0FBSztnQkFDM0IsVUFBVSxFQUFFO29CQUNSLFVBQVUsRUFBRSxFQUFDLFFBQVEsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLENBQUMsRUFBRSxTQUFTLEVBQUUsRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsTUFBTSxFQUFFLFlBQVksRUFBQztvQkFDL0YsVUFBVSxFQUFFLEVBQUMsUUFBUSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFDO29CQUM1QyxNQUFNLEVBQUUsRUFBQyxRQUFRLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLE9BQU8sRUFBRSxDQUFDLEVBQUUsT0FBTyxFQUFFLENBQUMsRUFBQztpQkFDbkY7YUFDSjtTQUNKLENBQUMsQ0FBQztRQUVIOztXQUVHO1FBQ0gsS0FBSyxDQUFDLFNBQVMsQ0FBQztZQUNaLEVBQUUsRUFBRSxxQkFBcUI7WUFDekIsSUFBSSxFQUFFLE9BQU87WUFDYixXQUFXLEVBQUUsSUFBSTtZQUNqQixRQUFRLEVBQUUsRUFBRTtZQUNaLEtBQUssRUFBRTtnQkFDSCxJQUFJLEVBQUUsUUFBUTtnQkFDZCxRQUFRLEVBQUUsSUFBSTtnQkFDZCxvQkFBb0IsRUFBRSxLQUFLO2dCQUMzQixVQUFVLEVBQUU7b0JBQ1IsUUFBUSxFQUFFLEVBQUMsUUFBUSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUM7b0JBQ3pELDBCQUEwQjtvQkFDMUIsTUFBTSxFQUFFLEVBQUMsUUFBUSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxPQUFPLEVBQUUsQ0FBQyxFQUFFLE9BQU8sRUFBRSxDQUFDLEVBQUM7aUJBQ2xGO2FBQ0o7U0FDSixDQUFDLENBQUM7SUFDUCxDQUFDO0NBQ0osQ0FBQTtBQXBERztJQURDLGFBQUksRUFBRTs7OztvRUFvRE47QUF0RVEsMEJBQTBCO0lBRnRDLGNBQUssQ0FBQyxXQUFXLENBQUM7SUFDbEIsZ0JBQU8sRUFBRTtHQUNHLDBCQUEwQixDQXVFdEM7QUF2RVksZ0VBQTBCIn0=