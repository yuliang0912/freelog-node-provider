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
            nodeId,
            testResourceName: new RegExp(`^${activeThemeRuleInfo.ruleInfo.themeName}$`, 'i')
        });
        if (activeThemeRuleInfo?.isValid === false) {
            return themeResourceInfo;
        }
        if (!themeResourceInfo) {
            activeThemeRuleInfo.matchErrors.push(this.ctx.gettext(`reflect_rule_pre_excute_error_exhibit_not_existed`, activeThemeRuleInfo.ruleInfo.themeName));
            return;
        }
        else if (themeResourceInfo.resourceType !== egg_freelog_base_1.ResourceTypeEnum.THEME) {
            activeThemeRuleInfo.matchErrors.push(this.ctx.gettext(`reflect_rule_pre_excute_error_exhibit_not_theme`, activeThemeRuleInfo.ruleInfo.themeName));
            return;
        }
        activeThemeRuleInfo.efficientInfos.push(this.activeThemeEfficientCountInfo);
        return themeResourceInfo;
    }
};
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], ActivateThemeHandler.prototype, "ctx", void 0);
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], ActivateThemeHandler.prototype, "nodeTestResourceProvider", void 0);
ActivateThemeHandler = __decorate([
    midway_1.provide()
], ActivateThemeHandler);
exports.ActivateThemeHandler = ActivateThemeHandler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWN0aXZhdGUtdGhlbWUtaGFuZGxlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9leHRlbmQvdGVzdC1ydWxlLWhhbmRsZXIvYWN0aXZhdGUtdGhlbWUtaGFuZGxlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7QUFBQSxtQ0FBdUM7QUFDdkMsdURBQXFGO0FBSXJGLElBQWEsb0JBQW9CLEdBQWpDLE1BQWEsb0JBQW9CO0lBQWpDO1FBT1ksa0NBQTZCLEdBQTBCLEVBQUMsSUFBSSxFQUFFLGVBQWUsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFDLENBQUM7SUEyQnJHLENBQUM7SUF6Qkc7Ozs7T0FJRztJQUNILEtBQUssQ0FBQyxNQUFNLENBQUMsTUFBYyxFQUFFLG1CQUFzQztRQUUvRCxNQUFNLGlCQUFpQixHQUFHLE1BQU0sSUFBSSxDQUFDLHdCQUF3QixDQUFDLE9BQU8sQ0FBQztZQUNsRSxNQUFNO1lBQ04sZ0JBQWdCLEVBQUUsSUFBSSxNQUFNLENBQUMsSUFBSSxtQkFBbUIsQ0FBQyxRQUFRLENBQUMsU0FBUyxHQUFHLEVBQUUsR0FBRyxDQUFDO1NBQ25GLENBQUMsQ0FBQztRQUNILElBQUksbUJBQW1CLEVBQUUsT0FBTyxLQUFLLEtBQUssRUFBRTtZQUN4QyxPQUFPLGlCQUFpQixDQUFDO1NBQzVCO1FBQ0QsSUFBSSxDQUFDLGlCQUFpQixFQUFFO1lBQ3BCLG1CQUFtQixDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsbURBQW1ELEVBQUUsbUJBQW1CLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7WUFDcEosT0FBTztTQUNWO2FBQU0sSUFBSSxpQkFBaUIsQ0FBQyxZQUFZLEtBQUssbUNBQWdCLENBQUMsS0FBSyxFQUFFO1lBQ2xFLG1CQUFtQixDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsaURBQWlELEVBQUUsbUJBQW1CLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7WUFDbEosT0FBTztTQUNWO1FBRUQsbUJBQW1CLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsNkJBQTZCLENBQUMsQ0FBQztRQUM1RSxPQUFPLGlCQUFpQixDQUFDO0lBQzdCLENBQUM7Q0FDSixDQUFBO0FBL0JHO0lBREMsZUFBTSxFQUFFOztpREFDVztBQUVwQjtJQURDLGVBQU0sRUFBRTs7c0VBQ3FEO0FBTHJELG9CQUFvQjtJQURoQyxnQkFBTyxFQUFFO0dBQ0csb0JBQW9CLENBa0NoQztBQWxDWSxvREFBb0IifQ==