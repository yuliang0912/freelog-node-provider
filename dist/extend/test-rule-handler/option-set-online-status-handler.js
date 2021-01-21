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
        if (lodash_1.isBoolean(ruleInfo.online)) {
            testRuleInfo.onlineStatusInfo = { status: ruleInfo.online ? 1 : 0, source: testRuleInfo.id };
            // 用户只有显示声明了上下线状态,才算一次有效匹配
            testRuleInfo.efficientInfos.push(this.setOnlineStatusOptionEfficientCountInfo);
        }
        else if (presentableInfo) {
            testRuleInfo.onlineStatusInfo = { status: presentableInfo.onlineStatus, source: 'presentable' };
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3B0aW9uLXNldC1vbmxpbmUtc3RhdHVzLWhhbmRsZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvZXh0ZW5kL3Rlc3QtcnVsZS1oYW5kbGVyL29wdGlvbi1zZXQtb25saW5lLXN0YXR1cy1oYW5kbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7OztBQUFBLG1DQUErQjtBQUMvQixtRUFBMEc7QUFDMUcsbUNBQWdDO0FBR2hDLElBQWEsNEJBQTRCLEdBQXpDLE1BQWEsNEJBQTRCO0lBQXpDO1FBRVksNENBQXVDLEdBQTBCLEVBQUMsSUFBSSxFQUFFLGlCQUFpQixFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUMsQ0FBQztJQXVCakgsQ0FBQztJQXJCRzs7O09BR0c7SUFDSCxNQUFNLENBQUMsWUFBK0I7UUFFbEMsTUFBTSxFQUFDLFFBQVEsRUFBRSxlQUFlLEVBQUMsR0FBRyxZQUFZLENBQUM7UUFDakQsSUFBSSxDQUFDLFlBQVksQ0FBQyxPQUFPLElBQUksQ0FBQyxDQUFDLDJDQUFxQixDQUFDLEdBQUcsRUFBRSwyQ0FBcUIsQ0FBQyxLQUFLLENBQUMsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxFQUFFO1lBQ2pILE9BQU87U0FDVjtRQUVELElBQUksa0JBQVMsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEVBQUU7WUFDNUIsWUFBWSxDQUFDLGdCQUFnQixHQUFHLEVBQUMsTUFBTSxFQUFFLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLE1BQU0sRUFBRSxZQUFZLENBQUMsRUFBRSxFQUFDLENBQUM7WUFDM0YsMEJBQTBCO1lBQzFCLFlBQVksQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyx1Q0FBdUMsQ0FBQyxDQUFDO1NBQ2xGO2FBQU0sSUFBSSxlQUFlLEVBQUU7WUFDeEIsWUFBWSxDQUFDLGdCQUFnQixHQUFHLEVBQUMsTUFBTSxFQUFFLGVBQWUsQ0FBQyxZQUFZLEVBQUUsTUFBTSxFQUFFLGFBQWEsRUFBQyxDQUFDO1NBQ2pHO2FBQU07WUFDSCxZQUFZLENBQUMsZ0JBQWdCLEdBQUcsRUFBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUMsQ0FBQztTQUNsRTtJQUNMLENBQUM7Q0FDSixDQUFBO0FBekJZLDRCQUE0QjtJQUR4QyxnQkFBTyxFQUFFO0dBQ0csNEJBQTRCLENBeUJ4QztBQXpCWSxvRUFBNEIifQ==