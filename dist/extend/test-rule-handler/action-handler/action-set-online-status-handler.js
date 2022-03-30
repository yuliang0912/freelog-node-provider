"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActionSetOnlineStatusHandler = void 0;
const lodash_1 = require("lodash");
const midway_1 = require("midway");
const test_node_interface_1 = require("../../../test-node-interface");
const egg_freelog_base_1 = require("egg-freelog-base");
const injection_1 = require("injection");
let ActionSetOnlineStatusHandler = class ActionSetOnlineStatusHandler {
    /**
     * 执行替换操作
     * @param ctx
     * @param testRuleInfo
     * @param action
     */
    async handle(ctx, testRuleInfo, action) {
        if (!(0, lodash_1.isBoolean)(action?.content)) {
            return false;
        }
        const operationAndActionRecord = {
            type: test_node_interface_1.ActionOperationEnum.Online, data: {
                exhibitName: testRuleInfo.ruleInfo.exhibitName,
                onlineStatus: action.content
            }
        };
        testRuleInfo.operationAndActionRecords.push(operationAndActionRecord);
        // 主题不允许上下线操作.只能通过激活操作
        if (testRuleInfo.testResourceOriginInfo.resourceType === egg_freelog_base_1.ResourceTypeEnum.THEME) {
            operationAndActionRecord.warningMsg = action.warningMsg = ctx.gettext(`reflect_rule_pre_excute_error_show_hide_unavailable_for_theme`, testRuleInfo.ruleInfo.exhibitName);
            testRuleInfo.matchWarnings.push(action.warningMsg);
            return false;
        }
        testRuleInfo.onlineStatusInfo = { status: action.content ? 1 : 0, source: testRuleInfo.id };
        return true;
    }
};
ActionSetOnlineStatusHandler = __decorate([
    (0, midway_1.provide)(),
    (0, midway_1.scope)(injection_1.ScopeEnum.Singleton)
], ActionSetOnlineStatusHandler);
exports.ActionSetOnlineStatusHandler = ActionSetOnlineStatusHandler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWN0aW9uLXNldC1vbmxpbmUtc3RhdHVzLWhhbmRsZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9zcmMvZXh0ZW5kL3Rlc3QtcnVsZS1oYW5kbGVyL2FjdGlvbi1oYW5kbGVyL2FjdGlvbi1zZXQtb25saW5lLXN0YXR1cy1oYW5kbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7OztBQUFBLG1DQUFpQztBQUNqQyxtQ0FBc0M7QUFDdEMsc0VBTXNDO0FBQ3RDLHVEQUFrRTtBQUNsRSx5Q0FBb0M7QUFJcEMsSUFBYSw0QkFBNEIsR0FBekMsTUFBYSw0QkFBNEI7SUFFckM7Ozs7O09BS0c7SUFDSCxLQUFLLENBQUMsTUFBTSxDQUFDLEdBQW1CLEVBQUUsWUFBK0IsRUFBRSxNQUFnQztRQUUvRixJQUFJLENBQUMsSUFBQSxrQkFBUyxFQUFDLE1BQU0sRUFBRSxPQUFPLENBQUMsRUFBRTtZQUM3QixPQUFPLEtBQUssQ0FBQztTQUNoQjtRQUVELE1BQU0sd0JBQXdCLEdBQUc7WUFDN0IsSUFBSSxFQUFFLHlDQUFtQixDQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUU7Z0JBQ3BDLFdBQVcsRUFBRSxZQUFZLENBQUMsUUFBUSxDQUFDLFdBQVc7Z0JBQzlDLFlBQVksRUFBRSxNQUFNLENBQUMsT0FBTzthQUMvQjtTQUNHLENBQUM7UUFDVCxZQUFZLENBQUMseUJBQXlCLENBQUMsSUFBSSxDQUFDLHdCQUF3QixDQUFDLENBQUM7UUFDdEUsc0JBQXNCO1FBQ3RCLElBQUksWUFBWSxDQUFDLHNCQUFzQixDQUFDLFlBQVksS0FBSyxtQ0FBZ0IsQ0FBQyxLQUFLLEVBQUU7WUFDN0Usd0JBQXdCLENBQUMsVUFBVSxHQUFHLE1BQU0sQ0FBQyxVQUFVLEdBQUcsR0FBRyxDQUFDLE9BQU8sQ0FBQywrREFBK0QsRUFBRSxZQUFZLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1lBQzFLLFlBQVksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQztZQUNuRCxPQUFPLEtBQUssQ0FBQztTQUNoQjtRQUVELFlBQVksQ0FBQyxnQkFBZ0IsR0FBRyxFQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxNQUFNLEVBQUUsWUFBWSxDQUFDLEVBQUUsRUFBQyxDQUFDO1FBQzFGLE9BQU8sSUFBSSxDQUFDO0lBQ2hCLENBQUM7Q0FDSixDQUFBO0FBL0JZLDRCQUE0QjtJQUZ4QyxJQUFBLGdCQUFPLEdBQUU7SUFDVCxJQUFBLGNBQUssRUFBQyxxQkFBUyxDQUFDLFNBQVMsQ0FBQztHQUNkLDRCQUE0QixDQStCeEM7QUEvQlksb0VBQTRCIn0=