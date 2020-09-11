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
let ImportPresentableEntityHandler = class ImportPresentableEntityHandler {
    /**
     * 从规则中分析需要导入的展品数据
     * @param nodeId
     * @param testRules
     * @param promiseResults
     */
    async importPresentableEntityDataFromRules(nodeId, alterPresentableRules) {
        const presentableNames = alterPresentableRules.map(x => new RegExp(`^${x.ruleInfo.presentableName}$`, 'i'));
        const presentables = await this.presentableService.find({
            nodeId, presentableName: { $in: presentableNames }
        });
        const resources = await this.outsideApiService.getResourceListByIds(presentables.map(x => x.resourceInfo.resourceId), {
            projection: 'resourceId,resourceName,resourceType,resourceVersions,coverImages,intro'
        });
        alterPresentableRules.forEach(matchRule => {
            const presentableInfo = presentables.find(x => x.presentableName.toLowerCase() === matchRule.ruleInfo.presentableName.toLowerCase());
            const resourceInfo = presentableInfo ? resources.find(x => x.resourceId === presentableInfo.resourceInfo.resourceId) : null;
            this._fillRuleEntityInfo(matchRule, presentableInfo, resourceInfo);
        });
    }
    /**
     * 获取展品依赖树
     * @param presentableId
     * @param version
     */
    async getPresentableDependencyTree(presentableId, version) {
        const presentableVersion = await this.presentableVersionService.findById(presentableId, version, 'dependencyTree');
        const presentableDependencyTree = this.presentableVersionService.buildPresentableDependencyTree(presentableVersion.dependencyTree, presentableId.substr(0, 12), true, Number.MAX_SAFE_INTEGER);
        function recursionConvertSubNodes(dependencies) {
            if (!Array.isArray(dependencies)) {
                return [];
            }
            return dependencies.map(model => Object({
                nid: model.nid,
                id: model.resourceId,
                name: model.resourceName,
                type: test_node_interface_1.TestResourceOriginType.Resource,
                resourceType: model.resourceType,
                version: model.version,
                versionId: model.versionId,
                dependencies: recursionConvertSubNodes(model.dependencies)
            }));
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
    _fillRuleEntityInfo(matchRule, presentableInfo, resourceInfo) {
        if (!presentableInfo) {
            matchRule.isValid = false;
            matchRule.matchErrors.push(`节点中不存在名称为${matchRule.ruleInfo.presentableName}的展品`);
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
            intro: resourceInfo.intro ?? ''
            // _originInfo: resourceInfo
        };
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
ImportPresentableEntityHandler = __decorate([
    midway_1.provide()
], ImportPresentableEntityHandler);
exports.ImportPresentableEntityHandler = ImportPresentableEntityHandler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW1wb3J0LXByZXNlbnRhYmxlLWVudGl0eS1oYW5kbGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2V4dGVuZC90ZXN0LXJ1bGUtaGFuZGxlci9pbXBvcnQtcHJlc2VudGFibGUtZW50aXR5LWhhbmRsZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0FBQUEsbUNBQXVDO0FBQ3ZDLG1FQUFnSDtBQU9oSCxJQUFhLDhCQUE4QixHQUEzQyxNQUFhLDhCQUE4QjtJQVN2Qzs7Ozs7T0FLRztJQUNILEtBQUssQ0FBQyxvQ0FBb0MsQ0FBQyxNQUFjLEVBQUUscUJBQTBDO1FBRWpHLE1BQU0sZ0JBQWdCLEdBQUcscUJBQXFCLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsUUFBUSxDQUFDLGVBQWUsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDNUcsTUFBTSxZQUFZLEdBQUcsTUFBTSxJQUFJLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDO1lBQ3BELE1BQU0sRUFBRSxlQUFlLEVBQUUsRUFBQyxHQUFHLEVBQUUsZ0JBQWdCLEVBQUM7U0FDbkQsQ0FBQyxDQUFDO1FBRUgsTUFBTSxTQUFTLEdBQUcsTUFBTSxJQUFJLENBQUMsaUJBQWlCLENBQUMsb0JBQW9CLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsVUFBVSxDQUFDLEVBQUU7WUFDbEgsVUFBVSxFQUFFLHlFQUF5RTtTQUN4RixDQUFDLENBQUM7UUFFSCxxQkFBcUIsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLEVBQUU7WUFDdEMsTUFBTSxlQUFlLEdBQUcsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxlQUFlLENBQUMsV0FBVyxFQUFFLEtBQUssU0FB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