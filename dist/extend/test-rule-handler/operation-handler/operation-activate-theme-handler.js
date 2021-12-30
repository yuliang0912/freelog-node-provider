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
        if (!activeThemeRuleInfo) {
            return true;
        }
        const targetRuleMatchInfo = testRuleList.find(x => [test_node_interface_1.TestNodeOperationEnum.Add, test_node_interface_1.TestNodeOperationEnum.Alter].includes(x.ruleInfo.operation) && x.ruleInfo.exhibitName === activeThemeRuleInfo.ruleInfo.exhibitName);
        if (targetRuleMatchInfo) {
            // 规则没问题 但是也没生效. 因为目标测试展品自身出现了问题
            if (!targetRuleMatchInfo.isValid) {
                return true;
            }
            const targetResourceType = targetRuleMatchInfo.rootResourceReplacer ? targetRuleMatchInfo.rootResourceReplacer.resourceType : targetRuleMatchInfo.testResourceOriginInfo.resourceType;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3BlcmF0aW9uLWFjdGl2YXRlLXRoZW1lLWhhbmRsZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9zcmMvZXh0ZW5kL3Rlc3QtcnVsZS1oYW5kbGVyL29wZXJhdGlvbi1oYW5kbGVyL29wZXJhdGlvbi1hY3RpdmF0ZS10aGVtZS1oYW5kbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztBQUFBLHNFQUVzQztBQUN0QyxtQ0FBdUM7QUFDdkMsdURBQXFGO0FBSXJGLElBQWEsNkJBQTZCLEdBQTFDLE1BQWEsNkJBQTZCO0lBR3RDLEdBQUcsQ0FBaUI7SUFFcEIsbUJBQW1CLENBQXFDO0lBRWhELDZCQUE2QixHQUEwQjtRQUMzRCxJQUFJLEVBQUUsMkNBQXFCLENBQUMsYUFBYTtRQUN6QyxLQUFLLEVBQUUsQ0FBQztLQUNYLENBQUM7SUFFRjs7OztPQUlHO0lBQ0gsS0FBSyxDQUFDLE1BQU0sQ0FBQyxZQUFpQyxFQUFFLE1BQWM7UUFFMUQsTUFBTSxtQkFBbUIsR0FBRyxZQUFZLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLENBQUMsUUFBUSxDQUFDLFNBQVMsS0FBSywyQ0FBcUIsQ0FBQyxhQUFhLENBQUMsQ0FBQztRQUM5SCxJQUFJLENBQUMsbUJBQW1CLEVBQUU7WUFDdEIsT0FBTyxJQUFJLENBQUM7U0FDZjtRQUVELE1BQU0sbUJBQW1CLEdBQUcsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsMkNBQXFCLENBQUMsR0FBRyxFQUFFLDJDQUFxQixDQUFDLEtBQUssQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxRQUFRLENBQUMsV0FBVyxLQUFLLG1CQUFtQixDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUNuTixJQUFJLG1C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