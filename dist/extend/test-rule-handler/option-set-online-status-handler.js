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
exports.OptionSetOnlineStatusHandler = void 0;
const midway_1 = require("midway");
const test_node_interface_1 = require("../../test-node-interface");
const lodash_1 = require("lodash");
const egg_freelog_base_1 = require("egg-freelog-base");
let OptionSetOnlineStatusHandler = class OptionSetOnlineStatusHandler {
    ctx;
    setOnlineStatusOptionEfficientCountInfo = { type: 'setOnlineStatus', count: 1 };
    /**
     * 执行替换操作
     * @param testRuleInfo
     */
    handle(testRuleInfo) {
        const { ruleInfo, presentableInfo } = testRuleInfo;
        if (!testRuleInfo.isValid || ![test_node_interface_1.TestNodeOperationEnum.Add, test_node_interface_1.TestNodeOperationEnum.Alter].includes(ruleInfo.operation)) {
            return;
        }
        if (lodash_1.isBoolean(ruleInfo.online)) {
            if (testRuleInfo.testResourceOriginInfo.resourceType === egg_freelog_base_1.ResourceTypeEnum.THEME) {
                testRuleInfo.matchErrors.push(this.ctx.gettext(`reflect_rule_pre_excute_error_show_hide_unavailable_for_theme`, testRuleInfo.ruleInfo.exhibitName));
                return;
            }
            testRuleInfo.onlineStatusInfo = { status: ruleInfo.online ? 1 : 0, source: testRuleInfo.id };
            // 用户只有显示声明了上下线状态,才算一次有效匹配
            testRuleInfo.efficientInfos.push(this.setOnlineStatusOptionEfficientCountInfo);
        }
        else if (presentableInfo) {
            testRuleInfo.onlineStatusInfo = { status: presentableInfo.onlineStatus, source: 'default' };
        }
        else {
            testRuleInfo.onlineStatusInfo = { status: 0, source: 'default' };
        }
    }
};
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], OptionSetOnlineStatusHandler.prototype, "ctx", void 0);
OptionSetOnlineStatusHandler = __decorate([
    midway_1.provide()
], OptionSetOnlineStatusHandler);
exports.OptionSetOnlineStatusHandler = OptionSetOnlineStatusHandler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3B0aW9uLXNldC1vbmxpbmUtc3RhdHVzLWhhbmRsZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvZXh0ZW5kL3Rlc3QtcnVsZS1oYW5kbGVyL29wdGlvbi1zZXQtb25saW5lLXN0YXR1cy1oYW5kbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztBQUFBLG1DQUF1QztBQUN2QyxtRUFBMEc7QUFDMUcsbUNBQWlDO0FBQ2pDLHVEQUFrRTtBQUdsRSxJQUFhLDRCQUE0QixHQUF6QyxNQUFhLDRCQUE0QjtJQUdyQyxHQUFHLENBQWlCO0lBRVosdUNBQXVDLEdBQTBCLEVBQUMsSUFBSSxFQUFFLGlCQUFpQixFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUMsQ0FBQztJQUU3Rzs7O09BR0c7SUFDSCxNQUFNLENBQUMsWUFBK0I7UUFFbEMsTUFBTSxFQUFDLFFBQVEsRUFBRSxlQUFlLEVBQUMsR0FBRyxZQUFZLENBQUM7UUFDakQsSUFBSSxDQUFDLFlBQVksQ0FBQyxPQUFPLElBQUksQ0FBQyxDQUFDLDJDQUFxQixDQUFDLEdBQUcsRUFBRSwyQ0FBcUIsQ0FBQyxLQUFLLENBQUMsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxFQUFFO1lBQ2pILE9BQU87U0FDVjtRQUVELElBQUksa0JBQVMsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEVBQUU7WUFDNUIsSUFBSSxZQUFZLENBQUMsc0JBQXNCLENBQUMsWUFBWSxLQUFLLG1DQUFnQixDQUFDLEtBQUssRUFBRTtnQkFDN0UsWUFBWSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsK0RBQStELEVBQUUsWUFBWSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDO2dCQUNwSixPQUFPO2FBQ1Y7WUFDRCxZQUFZLENBQUMsZ0JBQWdCLEdBQUcsRUFBQyxNQUFNLEVBQUUsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsTUFBTSxFQUFFLFlBQVksQ0FBQyxFQUFFLEVBQUMsQ0FBQztZQUMzRiwwQkFBMEI7WUFDMUIsWUFBWSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLHVDQUF1QyxDQUFDLENBQUM7U0FDbEY7YUFBTSxJQUFJLGVBQWUsRUFBRTtZQUN4QixZQUFZLENBQUMsZ0JBQWdCLEdBQUcsRUFBQyxNQUFNLEVBQUUsZUFBZSxDQUFDLFlBQVksRUFBRSxNQUFNLEVBQUUsU0FBUyxFQUFDLENBQUM7U0FDN0Y7YUFBTTtZQUNILFlBQVksQ0FBQyxnQkFBZ0IsR0FBRyxFQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsTUFBTSxFQUFFLFNBQVMsRUFBQyxDQUFDO1NBQ2xFO0lBQ0wsQ0FBQztDQUNKLENBQUE7QUE3Qkc7SUFEQyxlQUFNLEVBQUU7O3lEQUNXO0FBSFgsNEJBQTRCO0lBRHhDLGdCQUFPLEVBQUU7R0FDRyw0QkFBNEIsQ0FnQ3hDO0FBaENZLG9FQUE0QiJ9