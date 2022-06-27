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
        if ((0, lodash_1.first)(testRuleInfo.testResourceOriginInfo.resourceType) === '主题') {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWN0aW9uLXNldC1vbmxpbmUtc3RhdHVzLWhhbmRsZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9zcmMvZXh0ZW5kL3Rlc3QtcnVsZS1oYW5kbGVyL2FjdGlvbi1oYW5kbGVyL2FjdGlvbi1zZXQtb25saW5lLXN0YXR1cy1oYW5kbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7OztBQUFBLG1DQUF3QztBQUN4QyxtQ0FBc0M7QUFDdEMsc0VBTXNDO0FBRXRDLHlDQUFvQztBQUlwQyxJQUFhLDRCQUE0QixHQUF6QyxNQUFhLDRCQUE0QjtJQUVyQzs7Ozs7T0FLRztJQUNILEtBQUssQ0FBQyxNQUFNLENBQUMsR0FBbUIsRUFBRSxZQUErQixFQUFFLE1BQWdDO1FBRS9GLElBQUksQ0FBQyxJQUFBLGtCQUFTLEVBQUMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxFQUFFO1lBQzdCLE9BQU8sS0FBSyxDQUFDO1NBQ2hCO1FBRUQsTUFBTSx3QkFBd0IsR0FBRztZQUM3QixJQUFJLEVBQUUseUNBQW1CLENBQUMsTUFBTSxFQUFFLElBQUksRUFBRTtnQkFDcEMsV0FBVyxFQUFFLFlBQVksQ0FBQyxRQUFRLENBQUMsV0FBVztnQkFDOUMsWUFBWSxFQUFFLE1BQU0sQ0FBQyxPQUFPO2FBQy9CO1NBQ0csQ0FBQztRQUNULFlBQVksQ0FBQyx5QkFBeUIsQ0FBQyxJQUFJLENBQUMsd0JBQXdCLENBQUMsQ0FBQztRQUN0RSxzQkFBc0I7UUFDdEIsSUFBSSxJQUFBLGNBQUssRUFBUyxZQUFZLENBQUMsc0JBQXNCLENBQUMsWUFBWSxDQUFDLEtBQUssSUFBSSxFQUFFO1lBQzFFLHdCQUF3QixDQUFDLFVBQVUsR0FBRyxNQUFNLENBQUMsVUFBVSxHQUFHLEdBQUcsQ0FBQyxPQUFPLENBQUMsK0RBQStELEVBQUUsWUFBWSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsQ0FBQztZQUMxSyxZQUFZLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUM7WUFDbkQsT0FBTyxLQUFLLENBQUM7U0FDaEI7UUFFRCxZQUFZLENBQUMsZ0JBQWdCLEdBQUcsRUFBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsTUFBTSxFQUFFLFlBQVksQ0FBQyxFQUFFLEVBQUMsQ0FBQztRQUMxRixPQUFPLElBQUksQ0FBQztJQUNoQixDQUFDO0NBQ0osQ0FBQTtBQS9CWSw0QkFBNEI7SUFGeEMsSUFBQSxnQkFBTyxHQUFFO0lBQ1QsSUFBQSxjQUFLLEVBQUMscUJBQVMsQ0FBQyxTQUFTLENBQUM7R0FDZCw0QkFBNEIsQ0ErQnhDO0FBL0JZLG9FQUE0QiJ9