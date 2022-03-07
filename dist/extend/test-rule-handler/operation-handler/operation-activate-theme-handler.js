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
const egg_freelog_base_1 = require("egg-freelog-base");
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
            if (targetResourceType === egg_freelog_base_1.ResourceTypeEnum.THEME) {
                activeThemeRuleInfo.ruleInfo.candidate = {
                    name: targetRuleMatchInfo.testResourceOriginInfo.id,
                    type: targetRuleMatchInfo.testResourceOriginInfo.type
                };
                // 主题资源忽略是否上线,只看是否激活
                targetRuleMatchInfo.themeInfo = {
                    isActivatedTheme: 1, ruleId: activeThemeRuleInfo.id
                };
                targetRuleMatchInfo.efficientInfos.push(this.activeThemeEfficientCountInfo);
                activeThemeRuleInfo.operationAndActionRecords.push({
                    type: test_node_interface_1.TestNodeOperationEnum.ActivateTheme, data: {
                        exhibitName: activeThemeRuleInfo.ruleInfo.exhibitName
                    }
                });
                return true;
            }
            activeThemeRuleInfo.matchErrors.push(this.ctx.gettext(`reflect_rule_pre_excute_error_exhibit_not_theme`, activeThemeRuleInfo.ruleInfo.exhibitName));
            return false;
        }
        const presentableInfo = await this.presentableProvider.findOne({
            nodeId, presentableName: new RegExp(`^${activeThemeRuleInfo.ruleInfo.exhibitName.trim()}$`, 'i')
        });
        if (!presentableInfo) {
            activeThemeRuleInfo.matchErrors.push(this.ctx.gettext(`reflect_rule_pre_excute_error_exhibit_not_existed`, activeThemeRuleInfo.ruleInfo.exhibitName));
            return false;
        }
        else if (presentableInfo.resourceInfo.resourceType !== egg_freelog_base_1.ResourceTypeEnum.THEME) {
            activeThemeRuleInfo.matchErrors.push(this.ctx.gettext(`reflect_rule_pre_excute_error_exhibit_not_theme`, activeThemeRuleInfo.ruleInfo.exhibitName));
            return false;
        }
        activeThemeRuleInfo.ruleInfo.candidate = {
            name: presentableInfo.resourceInfo.resourceId,
            type: test_node_interface_1.TestResourceOriginType.Resource
        };
        activeThemeRuleInfo.efficientInfos.push(this.activeThemeEfficientCountInfo);
        activeThemeRuleInfo.operationAndActionRecords.push({
            type: test_node_interface_1.TestNodeOperationEnum.ActivateTheme, data: {
                exhibitName: activeThemeRuleInfo.ruleInfo.exhibitName
            }
        });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3BlcmF0aW9uLWFjdGl2YXRlLXRoZW1lLWhhbmRsZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9zcmMvZXh0ZW5kL3Rlc3QtcnVsZS1oYW5kbGVyL29wZXJhdGlvbi1oYW5kbGVyL29wZXJhdGlvbi1hY3RpdmF0ZS10aGVtZS1oYW5kbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztBQUFBLHNFQUVzQztBQUN0QyxtQ0FBdUM7QUFDdkMsdURBQXFGO0FBRXJGLG1DQUFnQztBQUdoQyxJQUFhLDZCQUE2QixHQUExQyxNQUFhLDZCQUE2QjtJQUd0QyxHQUFHLENBQWlCO0lBRXBCLG1CQUFtQixDQUFxQztJQUVoRCw2QkFBNkIsR0FBMEI7UUFDM0QsSUFBSSxFQUFFLDJDQUFxQixDQUFDLGFBQWE7UUFDekMsS0FBSyxFQUFFLENBQUM7S0FDWCxDQUFDO0lBRUY7Ozs7T0FJRztJQUNILEtBQUssQ0FBQyxNQUFNLENBQUMsWUFBaUMsRUFBRSxNQUFjO1FBRTFELE1BQU0sbUJBQW1CLEdBQUcsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxDQUFDLFFBQVEsQ0FBQyxTQUFTLEtBQUssMkNBQXFCLENBQUMsYUFBYSxDQUFDLENBQUM7UUFDOUgsSUFBSSxDQUFDLG1CQUFtQixJQUFJLENBQUMsSUFBQSxpQkFBUSxFQUFDLG1CQUFtQixDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsRUFBRTtZQUM3RSxPQUFPLElBQUksQ0FBQztTQUNmO1FBRUQsTUFBTSxtQkFBbUIsR0FBRyxZQUFZLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQywyQ0FBcUIsQ0FBQyxHQUFHLEVBQUUsMkNBQXFCLENBQUMsS0FBSyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFD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