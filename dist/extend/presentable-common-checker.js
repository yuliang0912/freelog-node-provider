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
const semver_1 = require("semver");
let PresentableCommonChecker = class PresentableCommonChecker {
    ctx;
    presentableService;
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
     * @param presentableName
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
     * 生成展品版本ID
     * @param presentableId
     * @param version
     */
    generatePresentableVersionId(presentableId, version) {
        return egg_freelog_base_1.CryptoHelper.md5(`${presentableId}-${version}`);
    }
    /**
     * 生成资源版本ID
     * @param {string} resourceId
     * @param {string} version
     * @returns {string}
     */
    generateResourceVersionId(resourceId, version) {
        return egg_freelog_base_1.CryptoHelper.md5(`${resourceId}-${(0, semver_1.clean)(version)}`);
    }
};
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", Object)
], PresentableCommonChecker.prototype, "ctx", void 0);
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", Object)
], PresentableCommonChecker.prototype, "presentableService", void 0);
PresentableCommonChecker = __decorate([
    (0, midway_1.provide)()
], PresentableCommonChecker);
exports.PresentableCommonChecker = PresentableCommonChecker;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlc2VudGFibGUtY29tbW9uLWNoZWNrZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvZXh0ZW5kL3ByZXNlbnRhYmxlLWNvbW1vbi1jaGVja2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztBQUFBLG1DQUF1QztBQUV2Qyx1REFBZ0Y7QUFDaEYsbUNBQTZCO0FBRzdCLElBQWEsd0JBQXdCLEdBQXJDLE1BQWEsd0JBQXdCO0lBR2pDLEdBQUcsQ0FBaUI7SUFFcEIsa0JBQWtCLENBQXNCO0lBRXhDLEtBQUssQ0FBQyxzQkFBc0IsQ0FBQyxNQUFjLEVBQUUsVUFBa0I7UUFFM0QsTUFBTSxtQkFBbUIsR0FBRyxNQUFNLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPLENBQUM7WUFDOUQsTUFBTSxFQUFFLHlCQUF5QixFQUFFLFVBQVU7U0FDaEQsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUVWLElBQUksbUJBQW1CLEVBQUU7WUFDckIsTUFBTSxJQUFJLG1DQUFnQixDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLDZDQUE2QyxDQUFDLENBQUMsQ0FBQTtTQUM5RjtJQUNMLENBQUM7SUFFRCxLQUFLLENBQUMsNEJBQTRCLENBQUMsTUFBYyxFQUFFLGVBQXVCO1FBQ3RFLE1BQU0sV0FBVyxHQUFHLE1BQU0sSUFBSSxDQUFDLGtCQUFrQixDQUFDLE9BQU8sQ0FBQztZQUN0RCxNQUFNLEVBQUUsZUFBZSxFQUFFLElBQUksTUFBTSxDQUFDLElBQUksZUFBZSxDQUFDLElBQUksRUFBRSxFQUFFLEVBQUUsR0FBRyxDQUFDO1NBQ3pFLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDVixJQUFJLFdBQVcsRUFBRTtZQUNiLE1BQU0sSUFBSSxtQ0FBZ0IsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxzQ0FBc0MsRUFBRSxlQUFlLENBQUMsQ0FBQyxDQUFBO1NBQ3hHO0lBQ0wsQ0FBQztJQUVEOzs7O09BSUc7SUFDSCxLQUFLLENBQUMsb0JBQW9CLENBQUMsTUFBYyxFQUFFLGVBQXVCO1FBQzlELE1BQU0sZ0JBQWdCLEdBQUcsTUFBTSxJQUFJLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDO1lBQ3hELE1BQU0sRUFBRSxlQUFlLEVBQUUsSUFBSSxNQUFNLENBQUMsSUFBSSxlQUFlLENBQUMsSUFBSSxFQUFFLEVBQUUsRUFBRSxHQUFHLENBQUM7U0FDekUsRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO1FBRXRCLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsZUFBZSxDQUFDLFdBQVcsRUFBRSxLQUFLLGVBQWUsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxFQUFFO1lBQzVILE9BQU8sZUFBZSxDQUFDO1NBQzFCO1FBRUQsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLGdCQUFnQixDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtZQUM5QyxJQUFJLGtCQUFrQixHQUFHLEdBQUcsZUFBZSxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQztZQUN4RCxJQUFJLGdCQUFnQixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxlQUFlLENBQUMsV0FBVyxFQUFFLEtBQUssa0JBQWtCLENBQUMsV0FBVyxFQUFFLENBQUMsRUFBRTtnQkFDbEcsU0FBUzthQUNaO1lBQ0QsT0FBTyxrQkFBa0IsQ0FBQztTQUM3QjtJQUNMLENBQUM7SUFFRDs7OztPQUlHO0lBQ0gsNEJBQTRCLENBQUMsYUFBcUIsRUFBRSxPQUFlO1FBQy9ELE9BQU8sK0JBQVksQ0FBQyxHQUFHLENBQUMsR0FBRyxhQUFhLElBQUksT0FBTyxFQUFFLENBQUMsQ0FBQztJQUMzRCxDQUFDO0lBRUQ7Ozs7O09BS0c7SUFDSCx5QkFBeUIsQ0FBQyxVQUFrQixFQUFFLE9BQWU7UUFDekQsT0FBTywrQkFBWSxDQUFDLEdBQUcsQ0FBQyxHQUFHLFVBQVUsSUFBSSxJQUFBLGNBQUssRUFBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDL0QsQ0FBQztDQUNKLENBQUE7QUFqRUc7SUFEQyxJQUFBLGVBQU0sR0FBRTs7cURBQ1c7QUFFcEI7SUFEQyxJQUFBLGVBQU0sR0FBRTs7b0VBQytCO0FBTC9CLHdCQUF3QjtJQURwQyxJQUFBLGdCQUFPLEdBQUU7R0FDRyx3QkFBd0IsQ0FvRXBDO0FBcEVZLDREQUF3QiJ9