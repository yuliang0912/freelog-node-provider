"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActionDeleteAttrHandler = void 0;
const midway_1 = require("midway");
const test_node_interface_1 = require("../../../test-node-interface");
const lodash_1 = require("lodash");
const injection_1 = require("injection");
let ActionDeleteAttrHandler = class ActionDeleteAttrHandler {
    /**
     * 替换自定义属性操作
     * @param ctx
     * @param testRuleInfo
     * @param action
     */
    async handle(ctx, testRuleInfo, action) {
        if (!(0, lodash_1.isString)(action?.content?.key)) {
            return false;
        }
        const propertyInfo = testRuleInfo.propertyMap.get(action.content.key);
        if (!propertyInfo) {
            return true;
        }
        // 没有操作权限
        if ((propertyInfo.authority & 4) !== 4) {
            testRuleInfo.matchWarnings.push(ctx.gettext('reflect_rule_pre_excute_error_attribute_access_limited', action.content.key));
            return false;
        }
        // 删除的属性不存在
        if (!propertyInfo) {
            testRuleInfo.matchWarnings.push(ctx.gettext('reflect_rule_pre_excute_error_attribute_not_exist', action.content.key));
            return false;
        }
        testRuleInfo.propertyMap.delete(action.content.key);
        testRuleInfo.attrInfo = { source: testRuleInfo.id };
        testRuleInfo.operationAndActionRecords.push({
            type: test_node_interface_1.ActionOperationEnum.DeleteAttr, data: {
                exhibitName: testRuleInfo.ruleInfo.exhibitName,
                attrKey: action.content.key
            }
        });
        return true;
    }
};
ActionDeleteAttrHandler = __decorate([
    (0, midway_1.provide)(),
    (0, midway_1.scope)(injection_1.ScopeEnum.Singleton)
], ActionDeleteAttrHandler);
exports.ActionDeleteAttrHandler = ActionDeleteAttrHandler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWN0aW9uLWRlbGV0ZS1hdHRyLWhhbmRsZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9zcmMvZXh0ZW5kL3Rlc3QtcnVsZS1oYW5kbGVyL2FjdGlvbi1oYW5kbGVyL2FjdGlvbi1kZWxldGUtYXR0ci1oYW5kbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7OztBQUFBLG1DQUFzQztBQUN0QyxzRUFFc0M7QUFFdEMsbUNBQWdDO0FBQ2hDLHlDQUFvQztBQUlwQyxJQUFhLHVCQUF1QixHQUFwQyxNQUFhLHVCQUF1QjtJQUVoQzs7Ozs7T0FLRztJQUNILEtBQUssQ0FBQyxNQUFNLENBQUMsR0FBbUIsRUFBRSxZQUErQixFQUFFLE1BQWlDO1FBRWhHLElBQUksQ0FBQyxJQUFBLGlCQUFRLEVBQUMsTUFBTSxFQUFFLE9BQU8sRUFBRSxHQUFHLENBQUMsRUFBRTtZQUNqQyxPQUFPLEtBQUssQ0FBQztTQUNoQjtRQUVELE1BQU0sWUFBWSxHQUFHLFlBQVksQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDdEUsSUFBSSxDQUFDLFlBQVksRUFBRTtZQUNmLE9BQU8sSUFBSSxDQUFDO1NBQ2Y7UUFDRCxTQUFTO1FBQ1QsSUFBSSxDQUFDLFlBQVksQ0FBQyxTQUFTLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFO1lBQ3BDLFlBQVksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsd0RBQXdELEVBQUUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQzNILE9BQU8sS0FBSyxDQUFDO1NBQ2hCO1FBQ0QsV0FBVztRQUNYLElBQUksQ0FBQyxZQUFZLEVBQUU7WUFDZixZQUFZLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLG1EQUFtRCxFQUFFLE1BQU0sQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUN0SCxPQUFPLEtBQUssQ0FBQztTQUNoQjtRQUVELFlBQVksQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDcEQsWUFBWSxDQUFDLFFBQVEsR0FBRyxFQUFDLE1BQU0sRUFBRSxZQUFZLENBQUMsRUFBRSxFQUFDLENBQUM7UUFDbEQsWUFBWSxDQUFDLHlCQUF5QixDQUFDLElBQUksQ0FBQztZQUN4QyxJQUFJLEVBQUUseUNBQW1CLENBQUMsVUFBVSxFQUFFLElBQUksRUFBRTtnQkFDeEMsV0FBVyxFQUFFLFlBQVksQ0FBQyxRQUFRLENBQUMsV0FBVztnQkFDOUMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxPQUFPLENBQUMsR0FBRzthQUM5QjtTQUNKLENBQUMsQ0FBQztRQUNILE9BQU8sSUFBSSxDQUFDO0lBQ2hCLENBQUM7Q0FDSixDQUFBO0FBdkNZLHVCQUF1QjtJQUZuQyxJQUFBLGdCQUFPLEdBQUU7SUFDVCxJQUFBLGNBQUssRUFBQyxxQkFBUyxDQUFDLFNBQVMsQ0FBQztHQUNkLHVCQUF1QixDQXVDbkM7QUF2Q1ksMERBQXVCIn0=