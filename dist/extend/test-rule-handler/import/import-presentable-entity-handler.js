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
exports.ImportPresentableEntityHandler = void 0;
const midway_1 = require("midway");
const test_node_interface_1 = require("../../../test-node-interface");
const presentable_common_checker_1 = require("../../presentable-common-checker");
const test_rule_checker_1 = require("../test-rule-checker");
let ImportPresentableEntityHandler = class ImportPresentableEntityHandler {
    ctx;
    testRuleChecker;
    outsideApiService;
    presentableService;
    presentableVersionService;
    presentableCommonChecker;
    /**
     * 从规则中分析需要导入的展品数据
     * @param nodeId
     * @param alterPresentableRules
     */
    async importPresentableEntityDataFromRules(nodeId, alterPresentableRules) {
        const presentableNames = alterPresentableRules.map(x => new RegExp(`^${x.ruleInfo.exhibitName}$`, 'i'));
        const presentables = await this.presentableService.find({
            nodeId, presentableName: { $in: presentableNames }
        });
        const resources = await this.outsideApiService.getResourceListByIds(presentables.map(x => x.resourceInfo.resourceId), {
            projection: 'resourceId,resourceName,resourceType,resourceVersions,coverImages,userId'
        });
        const presentableVersionIds = presentables.map(x => this.presentableCommonChecker.generatePresentableVersionId(x.presentableId, x.version));
        const presentableProperties = await this.presentableVersionService.findByIds(presentableVersionIds, 'presentableId dependencyTree resourceSystemProperty resourceCustomPropertyDescriptors presentableRewriteProperty');
        for (const matchRule of alterPresentableRules) {
            const presentableInfo = presentables.find(x => x.presentableName.toLowerCase() === matchRule.ruleInfo.exhibitName.toLowerCase());
            const resourceInfo = presentableInfo ? resources.find(x => x.resourceId === presentableInfo.resourceInfo.resourceId) : null;
            const presentableVersionInfo = presentableInfo ? presentableProperties.find(x => x.presentableId === presentableInfo.presentableId) : null;
            this._fillRuleEntityInfo(matchRule, presentableInfo, resourceInfo, presentableVersionInfo);
        }
    }
    /**
     * 获取展品依赖树
     * @param presentableId
     * @param flattenPresentableDependencyTree
     */
    getPresentableDependencyTree(presentableId, flattenPresentableDependencyTree) {
        const presentableDependencyTree = this.presentableVersionService.convertPresentableDependencyTree(flattenPresentableDependencyTree, presentableId.substr(0, 12), true, Number.MAX_SAFE_INTEGER);
        function recursionConvertSubNodes(dependencies) {
            if (!Array.isArray(dependencies)) {
                return [];
            }
            return dependencies.map(model => {
                return {
                    nid: model.nid,
                    id: model.resourceId,
                    name: model.resourceName,
                    type: test_node_interface_1.TestResourceOriginType.Resource,
                    resourceType: model.resourceType,
                    version: model.version,
                    versionId: model.versionId,
                    dependencies: recursionConvertSubNodes(model.dependencies)
                };
            });
        }
        return recursionConvertSubNodes(presentableDependencyTree);
    }
    /**
     * 填充实体数据
     * @param matchRule
     * @param presentableInfo
     * @param resourceInfo
     * @param presentableVersionInfo
     */
    _fillRuleEntityInfo(matchRule, presentableInfo, resourceInfo, presentableVersionInfo) {
        if (!presentableInfo) {
            matchRule.matchErrors.push(this.ctx.gettext('reflect_rule_pre_excute_error_exhibit_not_existed', matchRule.ruleInfo.exhibitName));
            return;
        }
        matchRule.testResourceOriginInfo = {
            id: resourceInfo.resourceId,
            ownerUserId: resourceInfo.userId,
            name: resourceInfo.resourceName,
            type: test_node_interface_1.TestResourceOriginType.Resource,
            resourceType: resourceInfo.resourceType ?? '',
            version: presentableInfo.version,
            versions: resourceInfo.resourceVersions.map(x => x.version),
            coverImages: presentableInfo.coverImages ?? []
        };
        this.testRuleChecker.fillEntityPropertyMap(matchRule, presentableVersionInfo.resourceSystemProperty, presentableVersionInfo.resourceCustomPropertyDescriptors, presentableVersionInfo.presentableRewriteProperty);
        matchRule.presentableInfo = presentableInfo;
        // 依赖树
        matchRule.entityDependencyTree = this.getPresentableDependencyTree(presentableVersionInfo.presentableId, presentableVersionInfo.dependencyTree);
    }
};
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", Object)
], ImportPresentableEntityHandler.prototype, "ctx", void 0);
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", test_rule_checker_1.TestRuleChecker)
], ImportPresentableEntityHandler.prototype, "testRuleChecker", void 0);
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", Object)
], ImportPresentableEntityHandler.prototype, "outsideApiService", void 0);
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", Object)
], ImportPresentableEntityHandler.prototype, "presentableService", void 0);
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", Object)
], ImportPresentableEntityHandler.prototype, "presentableVersionService", void 0);
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", presentable_common_checker_1.PresentableCommonChecker)
], ImportPresentableEntityHandler.prototype, "presentableCommonChecker", void 0);
ImportPresentableEntityHandler = __decorate([
    (0, midway_1.provide)()
], ImportPresentableEntityHandler);
exports.ImportPresentableEntityHandler = ImportPresentableEntityHandler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW1wb3J0LXByZXNlbnRhYmxlLWVudGl0eS1oYW5kbGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vc3JjL2V4dGVuZC90ZXN0LXJ1bGUtaGFuZGxlci9pbXBvcnQvaW1wb3J0LXByZXNlbnRhYmxlLWVudGl0eS1oYW5kbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztBQUFBLG1DQUF1QztBQUN2QyxzRUFBbUg7QUFLbkgsaUZBQTBFO0FBRTFFLDREQUFxRDtBQUdyRCxJQUFhLDhCQUE4QixHQUEzQyxNQUFhLDhCQUE4QjtJQUd2QyxHQUFHLENBQWlCO0lBRXBCLGVBQWUsQ0FBa0I7SUFFakMsaUJBQWlCLENBQXFCO0lBRXRDLGtCQUFrQixDQUFzQjtJQUV4Qyx5QkFBeUIsQ0FBNkI7SUFFdEQsd0JBQXdCLENBQTJCO0lBRW5EOzs7O09BSUc7SUFDSCxLQUFLLENBQUMsb0NBQW9DLENBQUMsTUFBYyxFQUFFLHFCQUEwQztRQUVqRyxNQUFNLGdCQUFnQixHQUFHLHFCQUFxQixDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLFFBQVEsQ0FBQyxXQUFXLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQ3hHLE1BQU0sWUFBWSxHQUFHLE1BQU0sSUFBSSxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQztZQUNwRCxNQUFNLEVBQUUsZUFBZSxFQUFFLEVBQUMsR0FBRyxFQUFFLGdCQUFnQixFQUFDO1NBQ25ELENBQUMsQ0FBQztRQUVILE1BQU0sU0FBUyxHQUFHLE1BQU0sSUFBSSxDQUFDLGlCQUFpQixDQUFDLG9CQUFvQixDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLFVBQVUsQ0FBQyxFQUFFO1lBQ2xILFVBQVUsRUFBRSwwRUFBMEU7U0FDekYsQ0FBQyxD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