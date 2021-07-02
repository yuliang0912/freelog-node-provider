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
const test_node_interface_1 = require("../../test-node-interface");
const presentable_common_checker_1 = require("../presentable-common-checker");
let ImportPresentableEntityHandler = class ImportPresentableEntityHandler {
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
            projection: 'resourceId,resourceName,resourceType,resourceVersions,coverImages'
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
                    fileSha1: model.fileSha1,
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
            name: resourceInfo.resourceName,
            type: test_node_interface_1.TestResourceOriginType.Resource,
            resourceType: resourceInfo.resourceType ?? '',
            version: presentableInfo.version,
            versions: resourceInfo.resourceVersions.map(x => x.version),
            coverImages: resourceInfo.coverImages ?? [],
            systemProperty: presentableVersionInfo.resourceSystemProperty,
            customPropertyDescriptors: presentableVersionInfo.resourceCustomPropertyDescriptors
        };
        matchRule.presentableRewriteProperty = presentableVersionInfo.presentableRewriteProperty;
        matchRule.presentableInfo = presentableInfo;
        // 依赖树
        matchRule.entityDependencyTree = this.getPresentableDependencyTree(presentableVersionInfo.presentableId, presentableVersionInfo.dependencyTree);
        matchRule.efficientInfos.push({ type: 'alter', count: 1 });
    }
};
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], ImportPresentableEntityHandler.prototype, "ctx", void 0);
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], ImportPresentableEntityHandler.prototype, "outsideApiService", void 0);
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], ImportPresentableEntityHandler.prototype, "presentableService", void 0);
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], ImportPresentableEntityHandler.prototype, "presentableVersionService", void 0);
__decorate([
    midway_1.inject(),
    __metadata("design:type", presentable_common_checker_1.PresentableCommonChecker)
], ImportPresentableEntityHandler.prototype, "presentableCommonChecker", void 0);
ImportPresentableEntityHandler = __decorate([
    midway_1.provide()
], ImportPresentableEntityHandler);
exports.ImportPresentableEntityHandler = ImportPresentableEntityHandler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW1wb3J0LXByZXNlbnRhYmxlLWVudGl0eS1oYW5kbGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2V4dGVuZC90ZXN0LXJ1bGUtaGFuZGxlci9pbXBvcnQtcHJlc2VudGFibGUtZW50aXR5LWhhbmRsZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0FBQUEsbUNBQXVDO0FBQ3ZDLG1FQUFnSDtBQUtoSCw4RUFBdUU7QUFJdkUsSUFBYSw4QkFBOEIsR0FBM0MsTUFBYSw4QkFBOEI7SUFhdkM7Ozs7T0FJRztJQUNILEtBQUssQ0FBQyxvQ0FBb0MsQ0FBQyxNQUFjLEVBQUUscUJBQTBDO1FBRWpHLE1BQU0sZ0JBQWdCLEdBQUcscUJBQXFCLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsUUFBUSxDQUFDLFdBQVcsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDeEcsTUFBTSxZQUFZLEdBQUcsTUFBTSxJQUFJLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDO1lBQ3BELE1BQU0sRUFBRSxlQUFlLEVBQUUsRUFBQyxHQUFHLEVBQUUsZ0JBQWdCLEVBQUM7U0FDbkQsQ0FBQyxDQUFDO1FBRUgsTUFBTSxTQUFTLEdBQUcsTUFBTSxJQUFJLENBQUMsaUJBQWlCLENBQUMsb0JBQW9CLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsVUFBVSxDQUFDLEVBQUU7WUFDbEgsVUFBVSxFQUFFLG1FQUFtRTtTQUNsRixDQUFDLENBQUM7UUFFSCxNQUFNLHFCQUFxQixHQUFHLFlBQVksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsd0JBQXdCLENBQUMsNEJBQTRCLENBQUMsQ0FBQyxDQUFDLGFBQWEsRUFBRSxDQUFDLENBQUMsT0FB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