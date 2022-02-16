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
        if (!propertyInfo) {
            testRuleInfo.propertyMap.set(action.content.key, {
                key: action.content.key,
                value: action.content.value,
                type: 'editableText',
                isRuleSet: true,
                isRuleAdd: true,
                authority: 6,
                remark: action.content.description
            });
            testRuleInfo.attrInfo = { source: testRuleInfo.id };
            return true;
        }
        // 不具备编辑权限(主要是系统属性以及自定义的只读属性).
        if ((propertyInfo.authority & 2) !== 2) {
            testRuleInfo.matchErrors.push(ctx.gettext('reflect_rule_pre_excute_error_value_access_limited', action.content.key));
            return false;
        }
        // 是下拉框,但是设定的值不在规定范围内.
        if (propertyInfo.type === 'select' && !propertyInfo.candidateItems?.includes(action.content.value)) {
            testRuleInfo.matchErrors.push(ctx.gettext('reflect_rule_pre_excute_error_value_not_match', action.content.key));
            return false;
        }
        propertyInfo.value = action.content.value;
        propertyInfo.remark = action.content.description;
        testRuleInfo.attrInfo = { source: testRuleInfo.id };
        return true;
    }
};
ActionSetAttrHandler = __decorate([
    (0, midway_1.provide)(),
    (0, midway_1.scope)(injection_1.ScopeEnum.Singleton)
], ActionSetAttrHandler);
exports.ActionSetAttrHandler = ActionSetAttrHandler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWN0aW9uLXNldC1hdHRyLWhhbmRsZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9zcmMvZXh0ZW5kL3Rlc3QtcnVsZS1oYW5kbGVyL2FjdGlvbi1oYW5kbGVyL2FjdGlvbi1zZXQtYXR0ci1oYW5kbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7OztBQUFBLG1DQUFzQztBQUt0QyxtQ0FBZ0M7QUFDaEMseUNBQW9DO0FBSXBDLElBQWEsb0JBQW9CLEdBQWpDLE1BQWEsb0JBQW9CO0lBRTdCOzs7OztPQUtHO0lBQ0gsS0FBSyxDQUFDLE1BQU0sQ0FBQyxHQUFtQixFQUFFLFlBQStCLEVBQUUsTUFBOEI7UUFFN0YsSUFBSSxDQUFDLElBQUEsaUJBQVEsRUFBQyxNQUFNLEVBQUUsT0FBTyxDQUFDLEVBQUU7WUFDNUIsT0FBTyxLQUFLLENBQUM7U0FDaEI7UUFFRCxNQUFNLFlBQVksR0FBRyxZQUFZLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ3RFLElBQUksQ0FBQyxZQUFZLEVBQUU7WUFDZixZQUFZLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRTtnQkFDN0MsR0FBRyxFQUFFLE1BQU0sQ0FBQyxPQUFPLENBQUMsR0FBRztnQkFDdkIsS0FBSyxFQUFFLE1BQU0sQ0FBQyxPQUFPLENBQUMsS0FBSztnQkFDM0IsSUFBSSxFQUFFLGNBQWM7Z0JBQ3BCLFNBQVMsRUFBRSxJQUFJO2dCQUNmLFNBQVMsRUFBRSxJQUFJO2dCQUNmLFNBQVMsRUFBRSxDQUFDO2dCQUNaLE1BQU0sRUFBRSxNQUFNLENBQUMsT0FBTyxDQUFDLFdBQVc7YUFDckMsQ0FBQyxDQUFDO1lBQ0gsWUFBWSxDQUFDLFFBQVEsR0FBRyxFQUFDLE1BQU0sRUFBRSxZQUFZLENBQUMsRUFBRSxFQUFDLENBQUM7WUFDbEQsT0FBTyxJQUFJLENBQUM7U0FDZjtRQUVELDhCQUE4QjtRQUM5QixJQUFJLENBQUMsWUFBWSxDQUFDLFNBQVMsR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQUU7WUFDcEMsWUFBWSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxvREFBb0QsRUFBRSxNQUFNLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDckgsT0FBTyxLQUFLLENBQUM7U0FDaEI7UUFDRCxzQkFBc0I7UUFDdEIsSUFBSSxZQUFZLENBQUMsSUFBSSxLQUFLLFFBQVEsSUFBSSxDQUFDLFlBQVksQ0FBQyxjQUFjLEVBQUUsUUFBUSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEVBQUU7WUFDaEcsWUFBWSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQywrQ0FBK0MsRUFBRSxNQUFNLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDaEgsT0FBTyxLQUFLLENBQUM7U0FDaEI7UUFDRCxZQUFZLENBQUMsS0FBSyxHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDO1FBQzFDLFlBQVksQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUM7UUFDakQsWUFBWSxDQUFDLFFBQVEsR0FBRyxFQUFDLE1BQU0sRUFBRSxZQUFZLENBQUMsRUFBRSxFQUFDLENBQUM7UUFFbEQsT0FBTyxJQUFJLENBQUM7SUFDaEIsQ0FBQztDQUNKLENBQUE7QUE3Q1ksb0JBQW9CO0lBRmhDLElBQUEsZ0JBQU8sR0FBRTtJQUNULElBQUEsY0FBSyxFQUFDLHFCQUFTLENBQUMsU0FBUyxDQUFDO0dBQ2Qsb0JBQW9CLENBNkNoQztBQTdDWSxvREFBb0IifQ==