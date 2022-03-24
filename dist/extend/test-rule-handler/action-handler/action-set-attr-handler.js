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
        // 不具备编辑权限(主要是系统属性以及自定义的只读属性).
        if ((propertyInfo.authority & 2) !== 2) {
            action.warningMsg = ctx.gettext('reflect_rule_pre_excute_error_value_access_limited', action.content.key);
            testRuleInfo.matchWarnings.push(action.warningMsg);
            return false;
        }
        // 是下拉框,但是设定的值不在规定范围内.
        if (propertyInfo.type === 'select' && !propertyInfo.candidateItems?.includes(action.content.value)) {
            action.warningMsg = ctx.gettext('reflect_rule_pre_excute_error_value_not_match', action.content.key);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWN0aW9uLXNldC1hdHRyLWhhbmRsZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9zcmMvZXh0ZW5kL3Rlc3QtcnVsZS1oYW5kbGVyL2FjdGlvbi1oYW5kbGVyL2FjdGlvbi1zZXQtYXR0ci1oYW5kbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7OztBQUFBLG1DQUFzQztBQUN0QyxzRUFFc0M7QUFFdEMsbUNBQWdDO0FBQ2hDLHlDQUFvQztBQUlwQyxJQUFhLG9CQUFvQixHQUFqQyxNQUFhLG9CQUFvQjtJQUU3Qjs7Ozs7T0FLRztJQUNILEtBQUssQ0FBQyxNQUFNLENBQUMsR0FBbUIsRUFBRSxZQUErQixFQUFFLE1BQThCO1FBRTdGLElBQUksQ0FBQyxJQUFBLGlCQUFRLEVBQUMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxFQUFFO1lBQzVCLE9BQU8sS0FBSyxDQUFDO1NBQ2hCO1FBRUQsTUFBTSxZQUFZLEdBQUcsWUFBWSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUN0RSxJQUFJLENBQUMsWUFBWSxFQUFFO1lBQ2YsWUFBWSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUU7Z0JBQzdDLEdBQUcsRUFBRSxNQUFNLENBQUMsT0FBTyxDQUFDLEdBQUc7Z0JBQ3ZCLEtBQUssRUFBRSxNQUFNLENBQUMsT0FBTyxDQUFDLEtBQUs7Z0JBQzNCLElBQUksRUFBRSxjQUFjO2dCQUNwQixTQUFTLEVBQUUsSUFBSTtnQkFDZixTQUFTLEVBQUUsSUFBSTtnQkFDZixTQUFTLEVBQUUsQ0FBQztnQkFDWixNQUFNLEVBQUUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxXQUFXO2FBQ3JDLENBQUMsQ0FBQztZQUNILFlBQVksQ0FBQyxRQUFRLEdBQUcsRUFBQyxNQUFNLEVBQUUsWUFBWSxDQUFDLEVBQUUsRUFBQyxDQUFDO1lBQ2xELFlBQVksQ0FBQyx5QkFBeUIsQ0FBQyxJQUFJLENBQUM7Z0JBQ3hDLElBQUksRUFBRSx5Q0FBbUIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFO29CQUNyQyxXQUFXLEVBQUUsWUFBWSxDQUFDLFFBQVEsQ0FBQyxXQUFXO29CQUM5QyxPQUFPLEVBQUUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxHQUFHO29CQUMzQixTQUFTLEVBQUUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxLQUFLO29CQUMvQixlQUFlLEVBQUUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxXQUFXO2lCQUM5QzthQUNKLENBQUMsQ0FBQztZQUNILE9BQU8sSUFBSSxDQUFDO1NBQ2Y7UUFFRCw4QkFBOEI7UUFDOUIsSUFBSSxDQUFDLFlBQVksQ0FBQyxTQUFTLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFO1lBQ3BDLE1BQU0sQ0FBQyxVQUFVLEdBQUcsR0FBRyxDQUFDLE9BQU8sQ0FBQyxvREFBb0QsRUFBRSxNQUFNLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQzFHLFlBQVksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQztZQUNuRCxPQUFPLEtBQUssQ0FBQztTQUNoQjtRQUNELHNCQUFzQjtRQUN0QixJQUFJLFlBQVksQ0FBQyxJQUFJLEtBQUssUUFBUSxJQUFJLENBQUMsWUFBWSxDQUFDLGNBQWMsRUFBRSxRQUFRLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsRUFBRTtZQUNoRyxNQUFNLENBQUMsVUFBVSxHQUFHLEdBQUcsQ0FBQyxPQUFPLENBQUMsK0NBQStDLEVBQUUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUNyRyxZQUFZLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUM7WUFDbkQsT0FBTyxLQUFLLENBQUM7U0FDaEI7UUFDRCxZQUFZLENBQUMsS0FBSyxHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDO1FBQzFDLFlBQVksQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUM7UUFDakQsWUFBWSxDQUFDLFFBQVEsR0FBRyxFQUFDLE1BQU0sRUFBRSxZQUFZLENBQUMsRUFBRSxFQUFDLENBQUM7UUFDbEQsWUFBWSxDQUFDLHlCQUF5QixDQUFDLElBQUksQ0FBQztZQUN4QyxJQUFJLEVBQUUseUNBQW1CLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRTtnQkFDckMsV0FBVyxFQUFFLFlBQVksQ0FBQyxRQUFRLENBQUMsV0FBVztnQkFDOUMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxPQUFPLENBQUMsR0FBRztnQkFDM0IsU0FBUyxFQUFFLE1BQU0sQ0FBQyxPQUFPLENBQUMsS0FBSztnQkFDL0IsZUFBZSxFQUFFLE1BQU0sQ0FBQyxPQUFPLENBQUMsV0FBVzthQUM5QztTQUNKLENBQUMsQ0FBQztRQUNILE9BQU8sSUFBSSxDQUFDO0lBQ2hCLENBQUM7Q0FDSixDQUFBO0FBOURZLG9CQUFvQjtJQUZoQyxJQUFBLGdCQUFPLEdBQUU7SUFDVCxJQUFBLGNBQUssRUFBQyxxQkFBUyxDQUFDLFNBQVMsQ0FBQztHQUNkLG9CQUFvQixDQThEaEM7QUE5RFksb0RBQW9CIn0=