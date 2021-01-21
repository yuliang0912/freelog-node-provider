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
const presentable_common_checker_1 = require("../presentable-common-checker");
let ImportResourceEntityHandler = class ImportResourceEntityHandler {
    /**
     * 从规则中分析需要导入的资源数据
     * @param addResourceRules
     */
    async importResourceEntityDataFromRules(addResourceRules) {
        const resourceNames = addResourceRules.map(x => x.ruleInfo.candidate.name);
        const resources = await this.outsideApiService.getResourceListByNames(resourceNames, {
            projection: 'resourceId,resourceName,resourceType,latestVersion,resourceVersions,coverImages'
        });
        const resourceVersionIds = [];
        addResourceRules.forEach(matchRule => {
            const resourceInfo = resources.find(x => x.resourceName.toLowerCase() === matchRule.ruleInfo.candidate.name.toLowerCase());
            this._fillRuleEntityInfo(matchRule, resourceInfo);
            if (matchRule.isValid) {
                resourceVersionIds.push(this.presentableCommonChecker.generateResourceVersionId(matchRule.testResourceOriginInfo.id, matchRule.testResourceOriginInfo.version));
            }
        });
        const resourceProperties = await this.outsideApiService.getResourceVersionList(resourceVersionIds, {
            projection: 'resourceId,systemProperty,customPropertyDescriptors'
        });
        for (const matchRule of addResourceRules) {
            if (!matchRule.isValid) {
                continue;
            }
            const resourceProperty = resourceProperties.find(x => x.resourceId === matchRule.testResourceOriginInfo.id);
            this._fillRuleEntityProperty(matchRule, resourceProperty);
        }
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
            coverImages: resourceInfo.coverImages,
        };
    }
    /**
     * 填充资源对应版本的属性信息
     * @param matchRule
     * @param resourceProperty
     */
    _fillRuleEntityProperty(matchRule, resourceProperty) {
        if (!matchRule.isValid || !resourceProperty) {
            return;
        }
        matchRule.testResourceOriginInfo.systemProperty = resourceProperty.systemProperty;
        matchRule.testResourceOriginInfo.customPropertyDescriptors = resourceProperty.customPropertyDescriptors;
    }
};
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], ImportResourceEntityHandler.prototype, "outsideApiService", void 0);
__decorate([
    midway_1.inject(),
    __metadata("design:type", presentable_common_checker_1.PresentableCommonChecker)
], ImportResourceEntityHandler.prototype, "presentableCommonChecker", void 0);
ImportResourceEntityHandler = __decorate([
    midway_1.provide()
], ImportResourceEntityHandler);
exports.ImportResourceEntityHandler = ImportResourceEntityHandler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW1wb3J0LXJlc291cmNlLWVudGl0eS1oYW5kbGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2V4dGVuZC90ZXN0LXJ1bGUtaGFuZGxlci9pbXBvcnQtcmVzb3VyY2UtZW50aXR5LWhhbmRsZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0FBQUEsbUNBQXFDO0FBQ3JDLG1DQUF1QztBQUV2QyxtRUFBZ0g7QUFDaEgsOEVBQXVFO0FBR3ZFLElBQWEsMkJBQTJCLEdBQXhDLE1BQWEsMkJBQTJCO0lBT3BDOzs7T0FHRztJQUNILEtBQUssQ0FBQyxpQ0FBaUMsQ0FBQyxnQkFBcUM7UUFFekUsTUFBTSxhQUFhLEdBQUcsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDM0UsTUFBTSxTQUFTLEdBQUcsTUFBTSxJQUFJLENBQUMsaUJBQWlCLENBQUMsc0JBQXNCLENBQUMsYUFBYSxFQUFFO1lBQ2pGLFVBQVUsRUFBRSxpRkFBaUY7U0FDaEcsQ0FBQyxDQUFDO1FBRUgsTUFBTSxrQkFBa0IsR0FBRyxFQUFFLENBQUM7UUFDOUIsZ0JBQWdCLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxFQUFFO1lBQ2pDLE1BQU0sWUFBWSxHQUFHLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLFdBQVcsRUFBRSxLQUFLLFNBQVMsQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDO1lBQzNILElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxTQUFTLEVBQUUsWUFBWSxDQUFDLENBQUM7WUFDbEQsSUFBSSxTQUFTLENBQUMsT0FBTyxFQUFFO2dCQUNuQixrQkFBa0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLHdC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