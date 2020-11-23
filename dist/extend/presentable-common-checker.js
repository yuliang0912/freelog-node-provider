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
     * 生成资源版本ID
     * @param presentableId
     * @param version
     */
    generatePresentableVersionId(presentableId, version) {
        return egg_freelog_base_1.CryptoHelper.md5(`${presentableId}-${version}`);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlc2VudGFibGUtY29tbW9uLWNoZWNrZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvZXh0ZW5kL3ByZXNlbnRhYmxlLWNvbW1vbi1jaGVja2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztBQUFBLG1DQUF1QztBQUV2Qyx1REFBZ0Y7QUFHaEYsSUFBYSx3QkFBd0IsR0FBckMsTUFBYSx3QkFBd0I7SUFPakMsS0FBSyxDQUFDLHNCQUFzQixDQUFDLE1BQWMsRUFBRSxVQUFrQjtRQUUzRCxNQUFNLG1CQUFtQixHQUFHLE1BQU0sSUFBSSxDQUFDLGtCQUFrQixDQUFDLE9BQU8sQ0FBQztZQUM5RCxNQUFNLEVBQUUseUJBQXlCLEVBQUUsVUFBVTtTQUNoRCxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRVYsSUFBSSxtQkFBbUIsRUFBRTtZQUNyQixNQUFNLElBQUksbUNBQWdCLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsNkNBQTZDLENBQUMsQ0FBQyxDQUFBO1NBQzlGO0lBQ0wsQ0FBQztJQUVELEtBQUssQ0FBQyw0QkFBNEIsQ0FBQyxNQUFjLEVBQUUsZUFBdUI7UUFDdEUsTUFBTSxXQUFXLEdBQUcsTUFBTSxJQUFJLENBQUMsa0JBQWtCLENBQUMsT0FBTyxDQUFDO1lBQ3RELE1BQU0sRUFBRSxlQUFlLEVBQUUsSUFBSSxNQUFNLENBQUMsSUFBSSxlQUFlLENBQUMsSUFBSSxFQUFFLEVBQUUsRUFBRSxHQUFHLENBQUM7U0FDekUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNWLElBQUksV0FBVyxFQUFFO1lBQ2IsTUFBTSxJQUFJLG1DQUFnQixDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLHNDQUFzQyxFQUFFLGVBQWUsQ0FBQyxDQUFDLENBQUE7U0FDeEc7SUFDTCxDQUFDO0lBRUQ7Ozs7T0FJRztJQUNILEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyxNQUFjLEVBQUUsZUFBdUI7UUFDOUQsTUFBTSxnQkFBZ0IsR0FBRyxNQUFNLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUM7WUFDeEQsTUFBTSxFQUFFLGVBQWUsRUFBRSxJQUFJLE1BQU0sQ0FBQyxJQUFJLGVBQWUsQ0FBQyxJQUFJLEVBQUUsRUFBRSxFQUFFLEdBQUcsQ0FBQztTQUN6RSxFQUFFLGlCQUFpQixDQUFDLENBQUM7UUFFdEIsSUFBSSxDQUFDLGdCQUFnQixDQUFDLE1BQU0sSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxlQUFlLENBQUMsV0FBVyxFQUFFLEtBQUssZUFBZSxDQUFDLFdBQVcsRUFBRSxDQUFDLEVBQUU7WUFDNUgsT0FBTyxlQUFlLENBQUM7U0FDMUI7UUFFRCxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsZ0JBQWdCLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO1lBQzlDLElBQUksa0JBQWtCLEdBQUcsR0FBRyxlQUFlLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDO1lBQ3hELElBQUksZ0JBQWdCLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxXQUFXLEVBQUUsS0FBSyxrQkFBa0IsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxFQUFFO2dCQUNsRyxTQUFTO2FBQ1o7WUFDRCxPQUFPLGtCQUFrQixDQUFDO1NBQzdCO0lBQ0wsQ0FBQztJQUVEOzs7O09BSUc7SUFDSCw0QkFBNEIsQ0FBQyxhQUFxQixFQUFFLE9BQWU7UUFDL0QsT0FBTywrQkFBWSxDQUFDLEdBQUcsQ0FBQyxHQUFHLGFBQWEsSUFBSSxPQUFPLEVBQUUsQ0FBQyxDQUFDO0lBQzNELENBQUM7Q0FDSixDQUFBO0FBdkRHO0lBREMsZUFBTSxFQUFFOztxREFDVztBQUVwQjtJQURDLGVBQU0sRUFBRTs7b0VBQytCO0FBTC9CLHdCQUF3QjtJQURwQyxnQkFBTyxFQUFFO0dBQ0csd0JBQXdCLENBMERwQztBQTFEWSw0REFBd0IifQ==