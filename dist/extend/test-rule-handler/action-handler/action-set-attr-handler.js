"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActionSetAttrHandler = void 0;
const midway_1 = require("midway");
const lodash_1 = require("lodash");
const injection_1 = require("injection");
let ActionSetAttrHandler = class ActionSetAttrHandler {
    /**
     * 替换自定义属性操作
     * @param ctx
     * @param testRuleInfo
     * @param action
     */
    async handle(ctx, testRuleInfo, action) {
        if (!(0, lodash_1.isObject)(action?.content)) {
            return false;
        }
        const propertyInfo = testRuleInfo.propertyMap.get(action.content.key);
        // 不具备编辑权限(主要是系统属性以及自定义的只读属性).
        if (propertyInfo && (propertyInfo.authority & 2) !== 2) {
            testRuleInfo.matchErrors.push(ctx.gettext('reflect_rule_pre_excute_error_value_access_limited', action.content.key));
            return false;
        }
        // 是下拉框,但是设定的值不在规定范围内.
        if (propertyInfo?.type === 'select' && !propertyInfo.candidateItems?.includes(action.content.value)) {
            testRuleInfo.matchErrors.push(ctx.gettext('reflect_rule_pre_excute_error_value_not_match', action.content.key));
            return false;
        }
        testRuleInfo.propertyMap.set(action.content.key, {
            key: action.content.key,
            value: action.content.value,
            isRuleSet: true,
            isRuleAdd: propertyInfo ? propertyInfo.isRuleAdd : true,
            authority: 6,
            remark: action.content.description
        });
        testRuleInfo.attrInfo = { source: testRuleInfo.id };
        return true;
    }
};
ActionSetAttrHandler = __decorate([
    (0, midway_1.provide)(),
    (0, midway_1.scope)(injection_1.ScopeEnum.Singleton)
], ActionSetAttrHandler);
exports.ActionSetAttrHandler = ActionSetAttrHandler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWN0aW9uLXNldC1hdHRyLWhhbmRsZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9zcmMvZXh0ZW5kL3Rlc3QtcnVsZS1oYW5kbGVyL2FjdGlvbi1oYW5kbGVyL2FjdGlvbi1zZXQtYXR0ci1oYW5kbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7OztBQUFBLG1DQUFzQztBQUt0QyxtQ0FBZ0M7QUFDaEMseUNBQW9DO0FBSXBDLElBQWEsb0JBQW9CLEdBQWpDLE1BQWEsb0JBQW9CO0lBRTdCOzs7OztPQUtHO0lBQ0gsS0FBSyxDQUFDLE1BQU0sQ0FBQyxHQUFtQixFQUFFLFlBQStCLEVBQUUsTUFBOEI7UUFFN0YsSUFBSSxDQUFDLElBQUEsaUJBQVEsRUFBQyxNQUFNLEVBQUUsT0FBTyxDQUFDLEVBQUU7WUFDNUIsT0FBTyxLQUFLLENBQUM7U0FDaEI7UUFFRCxNQUFNLFlBQVksR0FBRyxZQUFZLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ3RFLDhCQUE4QjtRQUM5QixJQUFJLFlBQVksSUFBSSxDQUFDLFlBQVksQ0FBQyxTQUFTLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFO1lBQ3BELFlBQVksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsb0RBQW9ELEVBQUUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQ3JILE9BQU8sS0FBSyxDQUFDO1NBQ2hCO1FBQ0Qsc0JBQXNCO1FBQ3RCLElBQUksWUFBWSxFQUFFLElBQUksS0FBSyxRQUFRLElBQUksQ0FBQyxZQUFZLENBQUMsY0FBYyxFQUFFLFFBQVEsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxFQUFFO1lBQ2pHLFlBQVksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsK0NBQStDLEVBQUUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQ2hILE9BQU8sS0FBSyxDQUFDO1NBQ2hCO1FBRUQsWUFBWSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUU7WUFDN0MsR0FBRyxFQUFFLE1BQU0sQ0FBQyxPQUFPLENBQUMsR0FBRztZQUN2QixLQUFLLEVBQUUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxLQUFLO1lBQzNCLFNBQVMsRUFBRSxJQUFJO1lBQ2YsU0FBUyxFQUFFLFlBQVksQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsSUFBSTtZQUN2RCxTQUFTLEVBQUUsQ0FBQztZQUNaLE1BQU0sRUFBRSxNQUFNLENBQUMsT0FBTyxDQUFDLFdBQVc7U0FDckMsQ0FBQyxDQUFDO1FBRUgsWUFBWSxDQUFDLFFBQVEsR0FBRyxFQUFDLE1BQU0sRUFBRSxZQUFZLENBQUMsRUFBRSxFQUFDLENBQUM7UUFFbEQsT0FBTyxJQUFJLENBQUM7SUFDaEIsQ0FBQztDQUNKLENBQUE7QUF2Q1ksb0JBQW9CO0lBRmhDLElBQUEsZ0JBQU8sR0FBRTtJQUNULElBQUEsY0FBSyxFQUFDLHFCQUFTLENBQUMsU0FBUyxDQUFDO0dBQ2Qsb0JBQW9CLENBdUNoQztBQXZDWSxvREFBb0IifQ==