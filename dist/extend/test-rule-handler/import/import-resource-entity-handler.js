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
const test_node_interface_1 = require("../../../test-node-interface");
const presentable_common_checker_1 = require("../../presentable-common-checker");
const test_rule_checker_1 = require("../test-rule-checker");
let ImportResourceEntityHandler = class ImportResourceEntityHandler {
    ctx;
    outsideApiService;
    testRuleChecker;
    presentableCommonChecker;
    /**
     * 从规则中分析需要导入的资源数据
     * @param addResourceRules
     */
    async importResourceEntityDataFromRules(addResourceRules) {
        const resourceNames = addResourceRules.map(x => x.ruleInfo.candidate.name);
        const resources = await this.outsideApiService.getResourceListByNames(resourceNames, {
            projection: 'resourceId,resourceName,resourceType,latestVersion,resourceVersions,coverImages,userId'
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
            this.testRuleChecker.fillEntityPropertyMap(matchRule, resourceProperty.systemProperty, resourceProperty.customPropertyDescriptors);
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
                    versions: model.versions,
                    versionRange: model.versionRange,
                    versionId: model.versionId,
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
        if (!versionRange || versionRange === 'latest') {
            return resourceVersions.find(x => x.version === latestVersion);
        }
        const version = (0, semver_1.maxSatisfying)(resourceVersions.map(x => x.version), versionRange);
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
            matchRule.ruleInfo.errorMsg = this.ctx.gettext('reflect_rule_pre_excute_error_resource_not_existed', matchRule.ruleInfo.candidate.name);
            matchRule.matchErrors.push(matchRule.ruleInfo.errorMsg);
            return;
        }
        const resourceVersion = this.matchResourceVersion(resourceInfo, matchRule.ruleInfo.candidate.versionRange);
        if (!resourceVersion) {
            matchRule.ruleInfo.errorMsg = this.ctx.gettext('reflect_rule_pre_excute_error_version_invalid', matchRule.ruleInfo.candidate.name, matchRule.ruleInfo.candidate.versionRange);
            matchRule.matchErrors.push(matchRule.ruleInfo.errorMsg);
            return;
        }
        matchRule.testResourceOriginInfo = {
            id: resourceInfo.resourceId,
            ownerUserId: resourceInfo.userId,
            versionRange: matchRule.ruleInfo.candidate.versionRange,
            name: resourceInfo.resourceName,
            type: test_node_interface_1.TestResourceOriginType.Resource,
            resourceType: resourceInfo.resourceType ?? [],
            version: resourceVersion.version,
            versions: resourceInfo.resourceVersions.map(x => x.version),
            coverImages: resourceInfo.coverImages ?? [],
        };
        if (!matchRule.testResourceOriginInfo.coverImages.length) {
            matchRule.testResourceOriginInfo.coverImages = ['http://static.testfreelog.com/static/default_cover.png'];
        }
    }
};
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", Object)
], ImportResourceEntityHandler.prototype, "ctx", void 0);
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", Object)
], ImportResourceEntityHandler.prototype, "outsideApiService", void 0);
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", test_rule_checker_1.TestRuleChecker)
], ImportResourceEntityHandler.prototype, "testRuleChecker", void 0);
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", presentable_common_checker_1.PresentableCommonChecker)
], ImportResourceEntityHandler.prototype, "presentableCommonChecker", void 0);
ImportResourceEntityHandler = __decorate([
    (0, midway_1.provide)()
], ImportResourceEntityHandler);
exports.ImportResourceEntityHandler = ImportResourceEntityHandler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW1wb3J0LXJlc291cmNlLWVudGl0eS1oYW5kbGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vc3JjL2V4dGVuZC90ZXN0LXJ1bGUtaGFuZGxlci9pbXBvcnQvaW1wb3J0LXJlc291cmNlLWVudGl0eS1oYW5kbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztBQUFBLG1DQUFxQztBQUNyQyxtQ0FBdUM7QUFFdkMsc0VBSXNDO0FBQ3RDLGlGQUEwRTtBQUUxRSw0REFBcUQ7QUFHckQsSUFBYSwyQkFBMkIsR0FBeEMsTUFBYSwyQkFBMkI7SUFHcEMsR0FBRyxDQUFpQjtJQUVwQixpQkFBaUIsQ0FBcUI7SUFFdEMsZUFBZSxDQUFrQjtJQUVqQyx3QkFBd0IsQ0FBMkI7SUFFbkQ7OztPQUdHO0lBQ0gsS0FBSyxDQUFDLGlDQUFpQyxDQUFDLGdCQUFxQztRQUV6RSxNQUFNLGFBQWEsR0FBRyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUMzRSxNQUFNLFNBQVMsR0FBRyxNQUFNLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxzQkFBc0IsQ0FBQyxhQUFhLEVBQUU7WUFDakYsVUFBVSxFQUFFLHdGQUF3RjtTQUN2RyxDQUFDLENBQUM7UUFFSCxNQUFNLGtCQUFrQixHQUFHLEVBQUUsQ0FBQztRQUM5QixnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLEVBQUU7WUFDakMsTUFBTSxZQUFZLEdBQUcsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsV0FBVyxFQUFFLEtBQUssU0FBUyxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUM7WUFDM0gsSUFBSSxDQUFDLG1CQUFtQixDQUFDLFNB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