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
        const presentableProperties = await this.presentableVersionService.findByIds(presentableVersionIds, 'presentableId resourceSystemProperty resourceCustomPropertyDescriptors presentableRewriteProperty');
        for (const matchRule of alterPresentableRules) {
            const presentableInfo = presentables.find(x => x.presentableName.toLowerCase() === matchRule.ruleInfo.exhibitName.toLowerCase());
            const resourceInfo = presentableInfo ? resources.find(x => x.resourceId === presentableInfo.resourceInfo.resourceId) : null;
            const presentableProperty = presentableProperties.find(x => x.presentableId === presentableInfo.presentableId);
            this._fillRuleEntityInfo(matchRule, presentableInfo, resourceInfo, presentableProperty);
        }
    }
    /**
     * 获取展品依赖树
     * @param presentableId
     * @param version
     */
    async getPresentableDependencyTree(presentableId, version) {
        const presentableVersion = await this.presentableVersionService.findById(presentableId, version, 'dependencyTree');
        const presentableDependencyTree = this.presentableVersionService.convertPresentableDependencyTree(presentableVersion.dependencyTree, presentableId.substr(0, 12), true, Number.MAX_SAFE_INTEGER);
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
     * @private
     */
    _fillRuleEntityInfo(matchRule, presentableInfo, resourceInfo, presentableProperty) {
        if (!presentableInfo) {
            matchRule.isValid = false;
            matchRule.matchErrors.push(`节点中不存在名称为${matchRule.ruleInfo.exhibitName}的展品`);
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
            systemProperty: presentableProperty.resourceSystemProperty,
            customPropertyDescriptors: presentableProperty.resourceCustomPropertyDescriptors
        };
        matchRule.presentableRewriteProperty = presentableProperty.presentableRewriteProperty;
        matchRule.presentableInfo = presentableInfo;
    }
};
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW1wb3J0LXByZXNlbnRhYmxlLWVudGl0eS1oYW5kbGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2V4dGVuZC90ZXN0LXJ1bGUtaGFuZGxlci9pbXBvcnQtcHJlc2VudGFibGUtZW50aXR5LWhhbmRsZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0FBQUEsbUNBQXVDO0FBQ3ZDLG1FQUFnSDtBQUtoSCw4RUFBdUU7QUFHdkUsSUFBYSw4QkFBOEIsR0FBM0MsTUFBYSw4QkFBOEI7SUFXdkM7Ozs7T0FJRztJQUNILEtBQUssQ0FBQyxvQ0FBb0MsQ0FBQyxNQUFjLEVBQUUscUJBQTBDO1FBRWpHLE1BQU0sZ0JBQWdCLEdBQUcscUJBQXFCLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsUUFBUSxDQUFDLFdBQVcsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDeEcsTUFBTSxZQUFZLEdBQUcsTUFBTSxJQUFJLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDO1lBQ3BELE1BQU0sRUFBRSxlQUFlLEVBQUUsRUFBQyxHQUFHLEVBQUUsZ0JBQWdCLEVBQUM7U0FDbkQsQ0FBQyxDQUFDO1FBRUgsTUFBTSxTQUFTLEdBQUcsTUFBTSxJQUFJLENBQUMsaUJBQWlCLENBQUMsb0JBQW9CLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsVUFBVSxDQUFDLEVBQUU7WUFDbEgsVUFBVSxFQUFFLG1FQUFtRTtTQUNsRixDQUFDLENBQUM7UUFFSCxNQUFNLHFCQUFxQixHQUFHLFlBQVksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsd0JBQXdCLENBQUMsNEJBQTRCLENBQUMsQ0FBQyxDQUFDLGFBQWEsRUFBRSxDQUFDLENBQUMsT0FB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