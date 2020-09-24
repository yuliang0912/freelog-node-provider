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
exports.PresentableCommonChecker = void 0;
const midway_1 = require("midway");
const egg_freelog_base_1 = require("egg-freelog-base");
const crypto_helper_1 = require("egg-freelog-base/app/extend/helper/crypto_helper");
let PresentableCommonChecker = class PresentableCommonChecker {
    async checkResourceIsCreated(nodeId, resourceId) {
        const existingPresentable = await this.presentableService.findOne({
            nodeId, 'resourceInfo.resourceId': resourceId
        }, '_id');
        if (existingPresentable) {
            throw new egg_freelog_base_1.ApplicationError(this.ctx.gettext('presentable-release-repetition-create-error'));
        }
    }
    async checkPresentableNameIsUnique(nodeId, presentableName) {
        const presentable = await this.presentableService.findOne({
            nodeId, presentableName: new RegExp(`^${presentableName.trim()}`, 'i')
        }, '_id');
        if (presentable) {
            throw new egg_freelog_base_1.ApplicationError(this.ctx.gettext('presentable-name-has-already-existed', presentableName));
        }
    }
    /**
     * 系统自动生成presentableName,如果不存在名称,则直接默认使用资源名称,否则会在后面递增追加序号
     * @param nodeId
     * @param resourceName
     * @returns {Promise<any>}
     */
    async buildPresentableName(nodeId, presentableName) {
        const presentableNames = await this.presentableService.find({
            nodeId, presentableName: new RegExp(`^${presentableName.trim()}`, 'i')
        }, 'presentableName');
        if (!presentableNames.length || !presentableNames.some(x => x.presentableName.toUpperCase() === presentableName.toUpperCase())) {
            return presentableName;
        }
        for (let i = 0; i < presentableNames.length; i++) {
            let newPresentableName = `${presentableName}(${i + 1})`;
            if (presentableNames.some(x => x.presentableName.toUpperCase() === newPresentableName.toUpperCase())) {
                continue;
            }
            return newPresentableName;
        }
    }
    /**
     * 生成资源版本ID
     * @param {string} resourceId
     * @param {string} version
     * @returns {string}
     */
    generatePresentableVersionId(presentableId, version) {
        return crypto_helper_1.md5(`${presentableId}-${version}`);
    }
};
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], PresentableCommonChecker.prototype, "ctx", void 0);
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], PresentableCommonChecker.prototype, "presentableService", void 0);
PresentableCommonChecker = __decorate([
    midway_1.provide()
], PresentableCommonChecker);
exports.PresentableCommonChecker = PresentableCommonChecker;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlc2VudGFibGUtY29tbW9uLWNoZWNrZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvZXh0ZW5kL3ByZXNlbnRhYmxlLWNvbW1vbi1jaGVja2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztBQUFBLG1DQUF1QztBQUV2Qyx1REFBa0Q7QUFDbEQsb0ZBQXFFO0FBR3JFLElBQWEsd0JBQXdCLEdBQXJDLE1BQWEsd0JBQXdCO0lBT2pDLEtBQUssQ0FBQyxzQkFBc0IsQ0FBQyxNQUFjLEVBQUUsVUFBa0I7UUFFM0QsTUFBTSxtQkFBbUIsR0FBRyxNQUFNLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPLENBQUM7WUFDOUQsTUFBTSxFQUFFLHlCQUF5QixFQUFFLFVBQVU7U0FDaEQsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUVWLElBQUksbUJBQW1CLEVBQUU7WUFDckIsTUFBTSxJQUFJLG1DQUFnQixDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLDZDQUE2QyxDQUFDLENBQUMsQ0FBQTtTQUM5RjtJQUNMLENBQUM7SUFFRCxLQUFLLENBQUMsNEJBQTRCLENBQUMsTUFBYyxFQUFFLGVBQXVCO1FBQ3RFLE1BQU0sV0FBVyxHQUFHLE1BQU0sSUFBSSxDQUFDLGtCQUFrQixDQUFDLE9BQU8sQ0FBQztZQUN0RCxNQUFNLEVBQUUsZUFBZSxFQUFFLElBQUksTUFBTSxDQUFDLElBQUksZUFBZSxDQUFDLElBQUksRUFBRSxFQUFFLEVBQUUsR0FBRyxDQUFDO1NBQ3pFLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDVixJQUFJLFdBQVcsRUFBRTtZQUNiLE1BQU0sSUFBSSxtQ0FBZ0IsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxzQ0FBc0MsRUFBRSxlQUFlLENBQUMsQ0FBQyxDQUFBO1NBQ3hHO0lBQ0wsQ0FBQztJQUVEOzs7OztPQUtHO0lBQ0gsS0FBSyxDQUFDLG9CQUFvQixDQUFDLE1BQWMsRUFBRSxlQUF1QjtRQUM5RCxNQUFNLGdCQUFnQixHQUFHLE1BQU0sSUFBSSxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQztZQUN4RCxNQUFNLEVBQUUsZUFBZSxFQUFFLElBQUksTUFBTSxDQUFDLElBQUksZUFBZSxDQUFDLElBQUksRUFBRSxFQUFFLEVBQUUsR0FBRyxDQUFDO1NBQ3pFLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztRQUV0QixJQUFJLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxXQUFXLEVBQUUsS0FBSyxlQUFlLENBQUMsV0FBVyxFQUFFLENBQUMsRUFBRTtZQUM1SCxPQUFPLGVBQWUsQ0FBQztTQUMxQjtRQUVELEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxnQkFBZ0IsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7WUFDOUMsSUFBSSxrQkFBa0IsR0FBRyxHQUFHLGVBQWUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUM7WUFDeEQsSUFBSSxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsZUFBZSxDQUFDLFdBQVcsRUFBRSxLQUFLLGtCQUFrQixDQUFDLFdBQVcsRUFBRSxDQUFDLEVBQUU7Z0JBQ2xHLFNBQVM7YUFDWjtZQUNELE9BQU8sa0JBQWtCLENBQUM7U0FDN0I7SUFDTCxDQUFDO0lBRUQ7Ozs7O09BS0c7SUFDSCw0QkFBNEIsQ0FBQyxhQUFxQixFQUFFLE9BQWU7UUFDL0QsT0FBTyxtQkFBRyxDQUFDLEdBQUcsYUFBYSxJQUFJLE9BQU8sRUFBRSxDQUFDLENBQUM7SUFDOUMsQ0FBQztDQUNKLENBQUE7QUF6REc7SUFEQyxlQUFNLEVBQUU7O3FEQUNMO0FBRUo7SUFEQyxlQUFNLEVBQUU7O29FQUMrQjtBQUwvQix3QkFBd0I7SUFEcEMsZ0JBQU8sRUFBRTtHQUNHLHdCQUF3QixDQTREcEM7QUE1RFksNERBQXdCIn0=