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
exports.ActivateThemeHandler = void 0;
const midway_1 = require("midway");
const egg_freelog_base_1 = require("egg-freelog-base");
let ActivateThemeHandler = class ActivateThemeHandler {
    constructor() {
        this.activeThemeEfficientCountInfo = { type: 'activateTheme', count: 1 };
    }
    /**
     * 激活主题操作(此规则需要后置单独处理)
     * @param nodeId
     * @param activeThemeRuleInfo
     */
    async handle(nodeId, activeThemeRuleInfo) {
        const themeResourceInfo = await this.nodeTestResourceProvider.findOne({
            testResourceName: new RegExp(`^${activeThemeRuleInfo.ruleInfo.themeName}$`, 'i')
        });
        if (!activeThemeRuleInfo.isValid) {
            return themeResourceInfo;
        }
        if (!themeResourceInfo) {
            activeThemeRuleInfo.isValid = false;
            activeThemeRuleInfo.matchErrors.push(`展品${activeThemeRuleInfo.ruleInfo.themeName}不是一个有效的主题资源`);
            return;
        }
        else if (themeResourceInfo.resourceType !== egg_freelog_base_1.ResourceTypeEnum.THEME) {
            activeThemeRuleInfo.isValid = false;
            activeThemeRuleInfo.matchErrors.push(`展品${activeThemeRuleInfo.ruleInfo.themeName}资源类型不是主题(${egg_freelog_base_1.ResourceTypeEnum.THEME})`);
            return;
        }
        activeThemeRuleInfo.efficientInfos.push(this.activeThemeEfficientCountInfo);
        return themeResourceInfo;
    }
};
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], ActivateThemeHandler.prototype, "nodeTestResourceProvider", void 0);
ActivateThemeHandler = __decorate([
    midway_1.provide()
], ActivateThemeHandler);
exports.ActivateThemeHandler = ActivateThemeHandler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWN0aXZhdGUtdGhlbWUtaGFuZGxlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9leHRlbmQvdGVzdC1ydWxlLWhhbmRsZXIvYWN0aXZhdGUtdGhlbWUtaGFuZGxlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7QUFBQSxtQ0FBdUM7QUFDdkMsdURBQXFFO0FBSXJFLElBQWEsb0JBQW9CLEdBQWpDLE1BQWEsb0JBQW9CO0lBQWpDO1FBS1ksa0NBQTZCLEdBQTBCLEVBQUMsSUFBSSxFQUFFLGVBQWUsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFDLENBQUM7SUE0QnJHLENBQUM7SUExQkc7Ozs7T0FJRztJQUNILEtBQUssQ0FBQyxNQUFNLENBQUMsTUFBYyxFQUFFLG1CQUFzQztRQUUvRCxNQUFNLGlCQUFpQixHQUFHLE1BQU0sSUFBSSxDQUFDLHdCQUF3QixDQUFDLE9BQU8sQ0FBQztZQUNsRSxnQkFBZ0IsRUFBRSxJQUFJLE1BQU0sQ0FBQyxJQUFJLG1CQUFtQixDQUFDLFFBQVEsQ0FBQyxTQUFTLEdBQUcsRUFBRSxHQUFHLENBQUM7U0FDbkYsQ0FBQyxDQUFDO1FBQ0gsSUFBSSxDQUFDLG1CQUFtQixDQUFDLE9BQU8sRUFBRTtZQUM5QixPQUFPLGlCQUFpQixDQUFDO1NBQzVCO1FBQ0QsSUFBSSxDQUFDLGlCQUFpQixFQUFFO1lBQ3BCLG1CQUFtQixDQUFDLE9BQU8sR0FBRyxLQUFLLENBQUM7WUFDcEMsbUJBQW1CLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLG1CQUFtQixDQUFDLFFBQVEsQ0FBQyxTQUFTLGFBQWEsQ0FBQyxDQUFDO1lBQy9GLE9BQU87U0FDVjthQUFNLElBQUksaUJBQWlCLENBQUMsWUFBWSxLQUFLLG1DQUFnQixDQUFDLEtBQUssRUFBRTtZQUNsRSxtQkFBbUIsQ0FBQyxPQUFPLEdBQUcsS0FBSyxDQUFDO1lBQ3BDLG1CQUFtQixDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxtQkFBbUIsQ0FBQyxRQUFRLENBQUMsU0FBUyxZQUFZLG1DQUFnQixDQUFDLEtBQUssR0FBRyxDQUFDLENBQUM7WUFDdkgsT0FBTztTQUNWO1FBRUQsbUJBQW1CLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsNkJBQTZCLENBQUMsQ0FBQztRQUM1RSxPQUFPLGlCQUFpQixDQUFDO0lBQzdCLENBQUM7Q0FDSixDQUFBO0FBOUJHO0lBREMsZUFBTSxFQUFFOztzRUFDcUQ7QUFIckQsb0JBQW9CO0lBRGhDLGdCQUFPLEVBQUU7R0FDRyxvQkFBb0IsQ0FpQ2hDO0FBakNZLG9EQUFvQiJ9