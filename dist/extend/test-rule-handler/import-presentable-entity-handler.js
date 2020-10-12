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
            projection: 'resourceId,resourceName,resourceType,resourceVersions,coverImages'
        });
        for (const matchRule of alterPresentableRules) {
            const presentableInfo = presentables.find(x => x.presentableName.toLowerCase() === matchRule.ruleInfo.presentableName.toLowerCase());
            const resourceInfo = presentableInfo ? resources.find(x => x.resourceId === presentableInfo.resourceInfo.resourceId) : null;
            this._fillRuleEntityInfo(matchRule, presentableInfo, resourceInfo);
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
            coverImages: resourceInfo.coverImages ?? []
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW1wb3J0LXByZXNlbnRhYmxlLWVudGl0eS1oYW5kbGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2V4dGVuZC90ZXN0LXJ1bGUtaGFuZGxlci9pbXBvcnQtcHJlc2VudGFibGUtZW50aXR5LWhhbmRsZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0FBQUEsbUNBQXVDO0FBQ3ZDLG1FQUFnSDtBQU9oSCxJQUFhLDhCQUE4QixHQUEzQyxNQUFhLDhCQUE4QjtJQVN2Qzs7Ozs7T0FLRztJQUNILEtBQUssQ0FBQyxvQ0FBb0MsQ0FBQyxNQUFjLEVBQUUscUJBQTBDO1FBRWpHLE1BQU0sZ0JBQWdCLEdBQUcscUJBQXFCLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsUUFBUSxDQUFDLGVBQWUsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDNUcsTUFBTSxZQUFZLEdBQUcsTUFBTSxJQUFJLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDO1lBQ3BELE1BQU0sRUFBRSxlQUFlLEVBQUUsRUFBQyxHQUFHLEVBQUUsZ0JBQWdCLEVBQUM7U0FDbkQsQ0FBQyxDQUFDO1FBRUgsTUFBTSxTQUFTLEdBQUcsTUFBTSxJQUFJLENBQUMsaUJBQWlCLENBQUMsb0JBQW9CLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsVUFBVSxDQUFDLEVBQUU7WUFDbEgsVUFBVSxFQUFFLG1FQUFtRTtTQUNsRixDQUFDLENBQUM7UUFFSCxLQUFLLE1BQU0sU0FBUyxJQUFJLHFCQUFxQixFQUFFO1lBQzNDLE1BQU0sZUFBZSxHQUFHLFlBQVksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsZUFBZSxDQUFDLFdBQVcsRUFBRSxLQUFLLFNBQVMsQ0FB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