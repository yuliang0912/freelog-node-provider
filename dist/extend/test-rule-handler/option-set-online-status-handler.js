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
        if (!testRuleInfo.isValid || !['alter', 'add'].includes(ruleInfo.operation)) {
            return;
        }
        if (lodash_1.isBoolean(ruleInfo.online)) {
            testRuleInfo.onlineStatus = { status: ruleInfo.online ? 1 : 0, source: testRuleInfo.id };
            // 用户只有显示声明了上下线状态,才算一次有效匹配
            testRuleInfo.efficientInfos.push(this.setOnlineStatusOptionEfficientCountInfo);
        }
        else if (presentableInfo) {
            testRuleInfo.onlineStatus = { status: presentableInfo.onlineStatus, source: 'presentable' };
        }
        else {
            testRuleInfo.onlineStatus = { status: 0, source: 'default' };
        }
    }
};
OptionSetOnlineStatusHandler = __decorate([
    midway_1.provide()
], OptionSetOnlineStatusHandler);
exports.OptionSetOnlineStatusHandler = OptionSetOnlineStatusHandler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3B0aW9uLXNldC1vbmxpbmUtc3RhdHVzLWhhbmRsZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvZXh0ZW5kL3Rlc3QtcnVsZS1oYW5kbGVyL29wdGlvbi1zZXQtb25saW5lLXN0YXR1cy1oYW5kbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7OztBQUFBLG1DQUErQjtBQUUvQixtQ0FBZ0M7QUFHaEMsSUFBYSw0QkFBNEIsR0FBekMsTUFBYSw0QkFBNEI7SUFBekM7UUFFWSw0Q0FBdUMsR0FBMEIsRUFBQyxJQUFJLEVBQUUsaUJBQWlCLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBQyxDQUFDO0lBdUJqSCxDQUFDO0lBckJHOzs7T0FHRztJQUNILE1BQU0sQ0FBQyxZQUErQjtRQUVsQyxNQUFNLEVBQUMsUUFBUSxFQUFFLGVBQWUsRUFBQyxHQUFHLFlBQVksQ0FBQztRQUNqRCxJQUFJLENBQUMsWUFBWSxDQUFDLE9BQU8sSUFBSSxDQUFDLENBQUMsT0FBTyxFQUFFLEtBQUssQ0FBQyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLEVBQUU7WUFDekUsT0FBTztTQUNWO1FBRUQsSUFBSSxrQkFBUyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsRUFBRTtZQUM1QixZQUFZLENBQUMsWUFBWSxHQUFHLEVBQUMsTUFBTSxFQUFFLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLE1BQU0sRUFBRSxZQUFZLENBQUMsRUFBRSxFQUFDLENBQUM7WUFDdkYsMEJBQTBCO1lBQzFCLFlBQVksQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyx1Q0FBdUMsQ0FBQyxDQUFDO1NBQ2xGO2FBQU0sSUFBSSxlQUFlLEVBQUU7WUFDeEIsWUFBWSxDQUFDLFlBQVksR0FBRyxFQUFDLE1BQU0sRUFBRSxlQUFlLENBQUMsWUFBWSxFQUFFLE1BQU0sRUFBRSxhQUFhLEVBQUMsQ0FBQztTQUM3RjthQUFNO1lBQ0gsWUFBWSxDQUFDLFlBQVksR0FBRyxFQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsTUFBTSxFQUFFLFNBQVMsRUFBQyxDQUFDO1NBQzlEO0lBQ0wsQ0FBQztDQUNKLENBQUE7QUF6QlksNEJBQTRCO0lBRHhDLGdCQUFPLEVBQUU7R0FDRyw0QkFBNEIsQ0F5QnhDO0FBekJZLG9FQUE0QiJ9