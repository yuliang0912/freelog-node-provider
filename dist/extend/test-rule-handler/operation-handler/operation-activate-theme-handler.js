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
exports.OperationActivateThemeHandler = void 0;
const test_node_interface_1 = require("../../../test-node-interface");
const midway_1 = require("midway");
const lodash_1 = require("lodash");
let OperationActivateThemeHandler = class OperationActivateThemeHandler {
    ctx;
    presentableProvider;
    activeThemeEfficientCountInfo = {
        type: test_node_interface_1.TestNodeOperationEnum.ActivateTheme,
        count: 1
    };
    /**
     * 激活主题操作
     * @param testRuleList
     * @param nodeId
     */
    async handle(testRuleList, nodeId) {
        const activeThemeRuleInfo = testRuleList.find(x => x.isValid && x.ruleInfo.operation === test_node_interface_1.TestNodeOperationEnum.ActivateTheme);
        if (!activeThemeRuleInfo || !(0, lodash_1.isString)(activeThemeRuleInfo.ruleInfo.exhibitName)) {
            return true;
        }
        const targetRuleMatchInfo = testRuleList.find(x => [test_node_interface_1.TestNodeOperationEnum.Add, test_node_interface_1.TestNodeOperationEnum.Alter].includes(x.ruleInfo.operation) && x.ruleInfo.exhibitName === activeThemeRuleInfo.ruleInfo.exhibitName);
        if (targetRuleMatchInfo) {
            // 规则没问题 但是也没生效. 因为目标测试展品自身出现了问题
            if (!targetRuleMatchInfo.isValid) {
                return true;
            }
            const targetResourceType = targetRuleMatchInfo.testResourceOriginInfo.resourceType;
            if (targetResourceType.includes('主题')) {
                activeThemeRuleInfo.ruleInfo.candidate = {
                    name: targetRuleMatchInfo.testResourceOriginInfo.id,
                    type: targetRuleMatchInfo.testResourceOriginInfo.type
                };
                // 主题资源忽略是否上线,只看是否激活
                targetRuleMatchInfo.themeInfo = {
                    isActivatedTheme: 1, ruleId: activeThemeRuleInfo.id
                };
                targetRuleMatchInfo.efficientInfos.push(this.activeThemeEfficientCountInfo);
                targetRuleMatchInfo.operationAndActionRecords.push({
                    type: test_node_interface_1.TestNodeOperationEnum.ActivateTheme, data: {
                        exhibitName: activeThemeRuleInfo.ruleInfo.exhibitName
                    }
                });
                return true;
            }
            activeThemeRuleInfo.ruleInfo.warningMsg = this.ctx.gettext(`reflect_rule_pre_excute_error_exhibit_not_theme`, activeThemeRuleInfo.ruleInfo.exhibitName);
            activeThemeRuleInfo.matchWarnings.push(activeThemeRuleInfo.ruleInfo.warningMsg);
            return false;
        }
        const presentableInfo = await this.presentableProvider.findOne({
            nodeId, presentableName: new RegExp(`^${activeThemeRuleInfo.ruleInfo.exhibitName.trim()}$`, 'i')
        });
        if (!presentableInfo) {
            activeThemeRuleInfo.ruleInfo.errorMsg = this.ctx.gettext(`reflect_rule_pre_excute_error_exhibit_not_existed`, activeThemeRuleInfo.ruleInfo.exhibitName);
            activeThemeRuleInfo.matchErrors.push(activeThemeRuleInfo.ruleInfo.errorMsg);
            return false;
        }
        else if (!presentableInfo.resourceInfo.resourceType.includes('主题')) {
            activeThemeRuleInfo.ruleInfo.warningMsg = this.ctx.gettext(`reflect_rule_pre_excute_error_exhibit_not_theme`, activeThemeRuleInfo.ruleInfo.exhibitName);
            activeThemeRuleInfo.matchWarnings.push(activeThemeRuleInfo.ruleInfo.warningMsg);
            return false;
        }
        activeThemeRuleInfo.ruleInfo.candidate = {
            name: presentableInfo.resourceInfo.resourceId,
            type: test_node_interface_1.TestResourceOriginType.Resource
        };
        activeThemeRuleInfo.efficientInfos.push(this.activeThemeEfficientCountInfo);
        return true;
    }
};
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", Object)
], OperationActivateThemeHandler.prototype, "ctx", void 0);
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", Object)
], OperationActivateThemeHandler.prototype, "presentableProvider", void 0);
OperationActivateThemeHandler = __decorate([
    (0, midway_1.provide)()
], OperationActivateThemeHandler);
exports.OperationActivateThemeHandler = OperationActivateThemeHandler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3BlcmF0aW9uLWFjdGl2YXRlLXRoZW1lLWhhbmRsZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9zcmMvZXh0ZW5kL3Rlc3QtcnVsZS1oYW5kbGVyL29wZXJhdGlvbi1oYW5kbGVyL29wZXJhdGlvbi1hY3RpdmF0ZS10aGVtZS1oYW5kbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztBQUFBLHNFQUVzQztBQUN0QyxtQ0FBdUM7QUFHdkMsbUNBQWdDO0FBR2hDLElBQWEsNkJBQTZCLEdBQTFDLE1BQWEsNkJBQTZCO0lBR3RDLEdBQUcsQ0FBaUI7SUFFcEIsbUJBQW1CLENBQXFDO0lBRWhELDZCQUE2QixHQUEwQjtRQUMzRCxJQUFJLEVBQUUsMkNBQXFCLENBQUMsYUFBYTtRQUN6QyxLQUFLLEVBQUUsQ0FBQztLQUNYLENBQUM7SUFFRjs7OztPQUlHO0lBQ0gsS0FBSyxDQUFDLE1BQU0sQ0FBQyxZQUFpQyxFQUFFLE1BQWM7UUFFMUQsTUFBTSxtQkFBbUIsR0FBRyxZQUFZLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLENBQUMsUUFBUSxDQUFDLFNBQVMsS0FBSywyQ0FBcUIsQ0FBQyxhQUFhLENBQUMsQ0FBQztRQUM5SCxJQUFJLENBQUMsbUJBQW1CLElBQUksQ0FBQyxJQUFBLGlCQUFRLEVBQUMsbUJBQW1CLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxFQUFFO1lBQzdFLE9BQU8sSUFBSSxDQUFDO1NBQ2Y7UUFFRCxNQUFNLG1CQUFtQixHQUFHLFlBQVksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLDJDQUFxQixDQUFDLEdBQUcsRUFBRSwyQ0FBcUIsQ0FBQyxLQUFLLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsUUFBUSxDQUFDLFdB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