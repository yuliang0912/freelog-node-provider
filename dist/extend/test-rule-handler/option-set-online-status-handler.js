"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OptionSetOnlineStatusHandler = void 0;
const midway_1 = require("midway");
const test_node_interface_1 = require("../../test-node-interface");
const lodash_1 = require("lodash");
const egg_freelog_base_1 = require("egg-freelog-base");
let OptionSetOnlineStatusHandler = class OptionSetOnlineStatusHandler {
    constructor() {
        this.setOnlineStatusOptionEfficientCountInfo = { type: 'setOnlineStatus', count: 1 };
    }
    /**
     * 执行替换操作
     * @param testRuleInfo
     */
    handle(testRuleInfo) {
        const { ruleInfo, presentableInfo } = testRuleInfo;
        if (!testRuleInfo.isValid || ![test_node_interface_1.TestNodeOperationEnum.Add, test_node_interface_1.TestNodeOperationEnum.Alter].includes(ruleInfo.operation)) {
            return;
        }
        if (testRuleInfo.testResourceOriginInfo.resourceType === egg_freelog_base_1.ResourceTypeEnum.THEME && ruleInfo.online) {
            testRuleInfo.matchErrors.push('主题类型的展品不允许设置上下线状态');
            return;
        }
        if (lodash_1.isBoolean(ruleInfo.online)) {
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
OptionSetOnlineStatusHandler = __decorate([
    midway_1.provide()
], OptionSetOnlineStatusHandler);
exports.OptionSetOnlineStatusHandler = OptionSetOnlineStatusHandler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3B0aW9uLXNldC1vbmxpbmUtc3RhdHVzLWhhbmRsZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvZXh0ZW5kL3Rlc3QtcnVsZS1oYW5kbGVyL29wdGlvbi1zZXQtb25saW5lLXN0YXR1cy1oYW5kbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7OztBQUFBLG1DQUErQjtBQUMvQixtRUFBMEc7QUFDMUcsbUNBQWdDO0FBQ2hDLHVEQUFrRDtBQUdsRCxJQUFhLDRCQUE0QixHQUF6QyxNQUFhLDRCQUE0QjtJQUF6QztRQUVZLDRDQUF1QyxHQUEwQixFQUFDLElBQUksRUFBRSxpQkFBaUIsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFDLENBQUM7SUE0QmpILENBQUM7SUExQkc7OztPQUdHO0lBQ0gsTUFBTSxDQUFDLFlBQStCO1FBRWxDLE1BQU0sRUFBQyxRQUFRLEVBQUUsZUFBZSxFQUFDLEdBQUcsWUFBWSxDQUFDO1FBQ2pELElBQUksQ0FBQyxZQUFZLENBQUMsT0FBTyxJQUFJLENBQUMsQ0FBQywyQ0FBcUIsQ0FBQyxHQUFHLEVBQUUsMkNBQXFCLENBQUMsS0FBSyxDQUFDLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsRUFBRTtZQUNqSCxPQUFPO1NBQ1Y7UUFFRCxJQUFJLFlBQVksQ0FBQyxzQkFBc0IsQ0FBQyxZQUFZLEtBQUssbUNBQWdCLENBQUMsS0FBSyxJQUFJLFFBQVEsQ0FBQyxNQUFNLEVBQUU7WUFDaEcsWUFBWSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsbUJBQW1CLENBQUMsQ0FBQztZQUNuRCxPQUFPO1NBQ1Y7UUFFRCxJQUFJLGtCQUFTLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFO1lBQzVCLFlBQVksQ0FBQyxnQkFBZ0IsR0FBRyxFQUFDLE1BQU0sRUFBRSxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxNQUFNLEVBQUUsWUFBWSxDQUFDLEVBQUUsRUFBQyxDQUFDO1lBQzNGLDBCQUEwQjtZQUMxQixZQUFZLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsdUNBQXVDLENBQUMsQ0FBQztTQUNsRjthQUFNLElBQUksZUFBZSxFQUFFO1lBQ3hCLFlBQVksQ0FBQyxnQkFBZ0IsR0FBRyxFQUFDLE1BQU0sRUFBRSxlQUFlLENBQUMsWUFBWSxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUMsQ0FBQztTQUM3RjthQUFNO1lBQ0gsWUFBWSxDQUFDLGdCQUFnQixHQUFHLEVBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxNQUFNLEVBQUUsU0FBUyxFQUFDLENBQUM7U0FDbEU7SUFDTCxDQUFDO0NBQ0osQ0FBQTtBQTlCWSw0QkFBNEI7SUFEeEMsZ0JBQU8sRUFBRTtHQUNHLDRCQUE0QixDQThCeEM7QUE5Qlksb0VBQTRCIn0=