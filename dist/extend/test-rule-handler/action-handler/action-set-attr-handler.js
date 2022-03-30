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
const test_node_interface_1 = require("../../../test-node-interface");
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
        const operationAndActionRecord = {
            type: test_node_interface_1.ActionOperationEnum.AddAttr, data: {
                exhibitName: testRuleInfo.ruleInfo.exhibitName,
                attrKey: action.content.key,
                attrValue: action.content.value,
                attrDescription: action.content.description
            }
        };
        testRuleInfo.operationAndActionRecords.push(operationAndActionRecord);
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
            operationAndActionRecord.warningMsg = action.warningMsg = ctx.gettext('reflect_rule_pre_excute_error_value_access_limited', action.content.key);
            testRuleInfo.matchWarnings.push(action.warningMsg);
            return false;
        }
        // 是下拉框,但是设定的值不在规定范围内.
        if (propertyInfo.type === 'select' && !propertyInfo.candidateItems?.includes(action.content.value)) {
            operationAndActionRecord.warningMsg = action.warningMsg = ctx.gettext('reflect_rule_pre_excute_error_value_not_match', action.content.key);
            testRuleInfo.matchWarnings.push(action.warningMsg);
            return false;
        }
        propertyInfo.value = action.content.value;
        propertyInfo.remark = action.content.description;
        testRuleInfo.attrInfo = { source: testRuleInfo.id };
        testRuleInfo.operationAndActionRecords.push({
            type: test_node_interface_1.ActionOperationEnum.AddAttr, data: {
                exhibitName: testRuleInfo.ruleInfo.exhibitName,
                attrKey: action.content.key,
                attrValue: action.content.value,
                attrDescription: action.content.description
            }
        });
        return true;
    }
};
ActionSetAttrHandler = __decorate([
    (0, midway_1.provide)(),
    (0, midway_1.scope)(injection_1.ScopeEnum.Singleton)
], ActionSetAttrHandler);
exports.ActionSetAttrHandler = ActionSetAttrHandler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWN0aW9uLXNldC1hdHRyLWhhbmRsZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9zcmMvZXh0ZW5kL3Rlc3QtcnVsZS1oYW5kbGVyL2FjdGlvbi1oYW5kbGVyL2FjdGlvbi1zZXQtYXR0ci1oYW5kbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7OztBQUFBLG1DQUFzQztBQUN0QyxzRUFFc0M7QUFFdEMsbUNBQWdDO0FBQ2hDLHlDQUFvQztBQUlwQyxJQUFhLG9CQUFvQixHQUFqQyxNQUFhLG9CQUFvQjtJQUU3Qjs7Ozs7T0FLRztJQUNILEtBQUssQ0FBQyxNQUFNLENBQUMsR0FBbUIsRUFBRSxZQUErQixFQUFFLE1BQThCO1FBRTdGLElBQUksQ0FBQyxJQUFBLGlCQUFRLEVBQUMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxFQUFFO1lBQzVCLE9BQU8sS0FBSyxDQUFDO1NBQ2hCO1FBRUQsTUFBTSx3QkFBd0IsR0FBRztZQUM3QixJQUFJLEVBQUUseUNBQW1CLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRTtnQkFDckMsV0FBVyxFQUFFLFlBQVksQ0FBQyxRQUFRLENBQUMsV0FBVztnQkFDOUMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxPQUFPLENBQUMsR0FBRztnQkFDM0IsU0FBUyxFQUFFLE1BQU0sQ0FBQyxPQUFPLENBQUMsS0FBSztnQkFDL0IsZUFBZSxFQUFFLE1BQU0sQ0FBQyxPQUFPLENBQUMsV0FBVzthQUM5QztTQUNHLENBQUM7UUFDVCxZQUFZLENBQUMseUJBQXlCLENBQUMsSUFBSSxDQUFDLHdCQUF3QixDQUFDLENBQUM7UUFFdEUsTUFBTSxZQUFZLEdBQUcsWUFBWSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUN0RSxJQUFJLENBQUMsWUFBWSxFQUFFO1lBQ2YsWUFBWSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLE9B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