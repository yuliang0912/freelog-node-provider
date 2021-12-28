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
            matchRule.matchErrors.push(this.ctx.gettext('reflect_rule_pre_excute_error_resource_not_existed', matchRule.ruleInfo.candidate.name));
            return;
        }
        const resourceVersion = this.matchResourceVersion(resourceInfo, matchRule.ruleInfo.candidate.versionRange);
        if (!resourceVersion) {
            matchRule.matchErrors.push(this.ctx.gettext('reflect_rule_pre_excute_error_version_invalid', matchRule.ruleInfo.candidate.name, matchRule.ruleInfo.candidate.versionRange));
            return;
        }
        matchRule.testResourceOriginInfo = {
            id: resourceInfo.resourceId,
            versionRange: matchRule.ruleInfo.candidate.versionRange,
            name: resourceInfo.resourceName,
            type: test_node_interface_1.TestResourceOriginType.Resource,
            resourceType: resourceInfo.resourceType ?? '',
            version: resourceVersion.version,
            versions: resourceInfo.resourceVersions.map(x => x.version),
            coverImages: resourceInfo.coverImages,
        };
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW1wb3J0LXJlc291cmNlLWVudGl0eS1oYW5kbGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vc3JjL2V4dGVuZC90ZXN0LXJ1bGUtaGFuZGxlci9pbXBvcnQvaW1wb3J0LXJlc291cmNlLWVudGl0eS1oYW5kbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztBQUFBLG1DQUFxQztBQUNyQyxtQ0FBdUM7QUFFdkMsc0VBSXNDO0FBQ3RDLGlGQUEwRTtBQUUxRSw0REFBcUQ7QUFHckQsSUFBYSwyQkFBMkIsR0FBeEMsTUFBYSwyQkFBMkI7SUFHcEMsR0FBRyxDQUFpQjtJQUVwQixpQkFBaUIsQ0FBcUI7SUFFdEMsZUFBZSxDQUFrQjtJQUVqQyx3QkFBd0IsQ0FBMkI7SUFFbkQ7OztPQUdHO0lBQ0gsS0FBSyxDQUFDLGlDQUFpQyxDQUFDLGdCQUFxQztRQUV6RSxNQUFNLGFBQWEsR0FBRyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUMzRSxNQUFNLFNBQVMsR0FBRyxNQUFNLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxzQkFBc0IsQ0FBQyxhQUFhLEVBQUU7WUFDakYsVUFBVSxFQUFFLGlGQUFpRjtTQUNoRyxDQUFDLENBQUM7UUFFSCxNQUFNLGtCQUFrQixHQUFHLEVBQUUsQ0FBQztRQUM5QixnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLEVBQUU7WUFDakMsTUFBTSxZQUFZLEdBQUcsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsV0FBVyxFQUFFLEtBQUssU0FBUyxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUM7WUFDM0gsSUFBSSxDQUFDLG1CQUFtQixDQUFDLFNB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