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
exports.ImportResourceEntityHandler = void 0;
const semver_1 = require("semver");
const midway_1 = require("midway");
const test_node_interface_1 = require("../../test-node-interface");
let ImportResourceEntityHandler = class ImportResourceEntityHandler {
    /**
     * 从规则中分析需要导入的资源数据
     * @param addResourceRules
     */
    async importResourceEntityDataFromRules(addResourceRules) {
        const resourceNames = addResourceRules.map(x => x.ruleInfo.candidate.name);
        const resources = await this.outsideApiService.getResourceListByNames(resourceNames, {
            projection: 'resourceId,resourceName,resourceType,resourceVersions,coverImages'
        });
        addResourceRules.forEach(matchRule => {
            const resourceInfo = resources.find(x => x.resourceName.toLowerCase() === matchRule.ruleInfo.candidate.name.toLowerCase());
            this._fillRuleEntityInfo(matchRule, resourceInfo);
        });
    }
    /**
     * 获取展品依赖树
     * @param resourceIdOrName
     * @param version
     */
    async getResourceDependencyTree(resourceIdOrName, version) {
        const resourceDependencyTree = await this.outsideApiService.getResourceDependencyTree(resourceIdOrName, {
            isContainRootNode: 1, version
        });
        function recursionConvertSubNodes(dependencies) {
            if (!Array.isArray(dependencies)) {
                return [];
            }
            return dependencies.map(model => {
                return {
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
        return recursionConvertSubNodes(resourceDependencyTree);
    }
    /**
     * 填充实体数据
     * @param matchRule
     * @param resourceInfo
     * @private
     */
    _fillRuleEntityInfo(matchRule, resourceInfo) {
        if (!resourceInfo) {
            matchRule.isValid = false;
            matchRule.matchErrors.push(`资源市场中不存在资源${matchRule.ruleInfo.candidate.name}`);
            return;
        }
        const resourceVersion = this.matchResourceVersion(resourceInfo, matchRule.ruleInfo.candidate.versionRange);
        if (!resourceVersion) {
            matchRule.isValid = false;
            matchRule.matchErrors.push(`资源${matchRule.ruleInfo.candidate.name}版本范围${matchRule.ruleInfo.candidate.versionRange}设置无效,无法匹配到有效版本`);
            return;
        }
        matchRule.testResourceOriginInfo = {
            id: resourceInfo.resourceId,
            name: resourceInfo.resourceName,
            type: test_node_interface_1.TestResourceOriginType.Resource,
            resourceType: resourceInfo.resourceType ?? '',
            version: resourceVersion.version,
            versions: resourceInfo.resourceVersions.map(x => x.version),
            coverImages: resourceInfo.coverImages
            // _originInfo: resourceInfo
        };
    }
    /**
     * 匹配发行版本
     * @param resourceInfo
     * @param versionRange
     */
    matchResourceVersion(resourceInfo, versionRange) {
        const { resourceVersions, latestVersion } = resourceInfo;
        if (!versionRange || versionRange === "latest") {
            return resourceVersions.find(x => x.version === latestVersion);
        }
        const version = semver_1.maxSatisfying(resourceVersions.map(x => x.version), versionRange);
        return resourceVersions.find(x => x.version === version);
    }
};
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], ImportResourceEntityHandler.prototype, "outsideApiService", void 0);
ImportResourceEntityHandler = __decorate([
    midway_1.provide()
], ImportResourceEntityHandler);
exports.ImportResourceEntityHandler = ImportResourceEntityHandler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW1wb3J0LXJlc291cmNlLWVudGl0eS1oYW5kbGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2V4dGVuZC90ZXN0LXJ1bGUtaGFuZGxlci9pbXBvcnQtcmVzb3VyY2UtZW50aXR5LWhhbmRsZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0FBQUEsbUNBQXFDO0FBQ3JDLG1DQUF1QztBQUV2QyxtRUFBZ0g7QUFHaEgsSUFBYSwyQkFBMkIsR0FBeEMsTUFBYSwyQkFBMkI7SUFLcEM7OztPQUdHO0lBQ0gsS0FBSyxDQUFDLGlDQUFpQyxDQUFDLGdCQUFxQztRQUV6RSxNQUFNLGFBQWEsR0FBRyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUMzRSxNQUFNLFNBQVMsR0FBRyxNQUFNLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxzQkFBc0IsQ0FBQyxhQUFhLEVBQUU7WUFDakYsVUFBVSxFQUFFLG1FQUFtRTtTQUNsRixDQUFDLENBQUM7UUFFSCxnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLEVBQUU7WUFDakMsTUFBTSxZQUFZLEdBQUcsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsV0FBVyxFQUFFLEtBQUssU0FBUyxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUM7WUFDM0gsSUFBSSxDQUFDLG1CQUFtQixDQUFDLFNBQVMsRUFBRSxZQUFZLENBQUMsQ0FBQztRQUN0RCxDQUFDLENBQUMsQ0FBQztJQUNQLENBQUM7SUFFRDs7OztPQUlHO0lBQ0gsS0FBSyxDQUFDLHlCQUF5QixDQUFDLGdCQUF3QixFQUFFLE9BQWU7UUFFckUsTUFBTSxzQkFBc0IsR0FBRyxNQUFNLElB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