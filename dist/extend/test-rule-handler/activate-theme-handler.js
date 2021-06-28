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
        if (activeThemeRuleInfo.isValid === false) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWN0aXZhdGUtdGhlbWUtaGFuZGxlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9leHRlbmQvdGVzdC1ydWxlLWhhbmRsZXIvYWN0aXZhdGUtdGhlbWUtaGFuZGxlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7QUFBQSxtQ0FBdUM7QUFDdkMsdURBQXFFO0FBSXJFLElBQWEsb0JBQW9CLEdBQWpDLE1BQWEsb0JBQW9CO0lBQWpDO1FBS1ksa0NBQTZCLEdBQTBCLEVBQUMsSUFBSSxFQUFFLGVBQWUsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFDLENBQUM7SUE0QnJHLENBQUM7SUExQkc7Ozs7T0FJRztJQUNILEtBQUssQ0FBQyxNQUFNLENBQUMsTUFBYyxFQUFFLG1CQUFzQztRQUUvRCxNQUFNLGlCQUFpQixHQUFHLE1BQU0sSUFBSSxDQUFDLHdCQUF3QixDQUFDLE9BQU8sQ0FBQztZQUNsRSxnQkFBZ0IsRUFBRSxJQUFJLE1BQU0sQ0FBQyxJQUFJLG1CQUFtQixDQUFDLFFBQVEsQ0FBQyxTQUFTLEdBQUcsRUFBRSxHQUFHLENBQUM7U0FDbkYsQ0FBQyxDQUFDO1FBQ0gsSUFBSSxtQkFBbUIsQ0FBQyxPQUFPLEtBQUssS0FBSyxFQUFFO1lBQ3ZDLE9BQU8saUJBQWlCLENBQUM7U0FDNUI7UUFDRCxJQUFJLENBQUMsaUJBQWlCLEVBQUU7WUFDcEIsbUJBQW1CLENBQUMsT0FBTyxHQUFHLEtBQUssQ0FBQztZQUNwQyxtQkFBbUIsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssbUJBQW1CLENBQUMsUUFBUSxDQUFDLFNBQVMsYUFBYSxDQUFDLENBQUM7WUFDL0YsT0FBTztTQUNWO2FBQU0sSUFBSSxpQkFBaUIsQ0FBQyxZQUFZLEtBQUssbUNBQWdCLENBQUMsS0FBSyxFQUFFO1lBQ2xFLG1CQUFtQixDQUFDLE9BQU8sR0FBRyxLQUFLLENBQUM7WUFDcEMsbUJBQW1CLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLG1CQUFtQixDQUFDLFFBQVEsQ0FBQyxTQUFTLFlBQVksbUNBQWdCLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQztZQUN2SCxPQUFPO1NBQ1Y7UUFFRCxtQkFBbUIsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDO1FBQzVFLE9BQU8saUJBQWlCLENBQUM7SUFDN0IsQ0FBQztDQUNKLENBQUE7QUE5Qkc7SUFEQyxlQUFNLEVBQUU7O3NFQUNxRDtBQUhyRCxvQkFBb0I7SUFEaEMsZ0JBQU8sRUFBRTtHQUNHLG9CQUFvQixDQWlDaEM7QUFqQ1ksb0RBQW9CIn0=