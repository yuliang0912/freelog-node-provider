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
    ctx;
    outsideApiService;
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
                    versions: model.versions,
                    versionRange: model.versionRange,
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
        matchRule.efficientInfos.push({ type: 'add', count: 1 });
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
    (0, midway_1.inject)(),
    __metadata("design:type", Object)
], ImportResourceEntityHandler.prototype, "ctx", void 0);
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", Object)
], ImportResourceEntityHandler.prototype, "outsideApiService", void 0);
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", presentable_common_checker_1.PresentableCommonChecker)
], ImportResourceEntityHandler.prototype, "presentableCommonChecker", void 0);
ImportResourceEntityHandler = __decorate([
    (0, midway_1.provide)()
], ImportResourceEntityHandler);
exports.ImportResourceEntityHandler = ImportResourceEntityHandler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW1wb3J0LXJlc291cmNlLWVudGl0eS1oYW5kbGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2V4dGVuZC90ZXN0LXJ1bGUtaGFuZGxlci9pbXBvcnQtcmVzb3VyY2UtZW50aXR5LWhhbmRsZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0FBQUEsbUNBQXFDO0FBQ3JDLG1DQUF1QztBQUV2QyxtRUFBZ0g7QUFDaEgsOEVBQXVFO0FBSXZFLElBQWEsMkJBQTJCLEdBQXhDLE1BQWEsMkJBQTJCO0lBR3BDLEdBQUcsQ0FBaUI7SUFFcEIsaUJBQWlCLENBQXFCO0lBRXRDLHdCQUF3QixDQUEyQjtJQUVuRDs7O09BR0c7SUFDSCxLQUFLLENBQUMsaUNBQWlDLENBQUMsZ0JBQXFDO1FBRXpFLE1BQU0sYUFBYSxHQUFHLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQzNFLE1BQU0sU0FBUyxHQUFHLE1BQU0sSUFBSSxDQUFDLGlCQUFpQixDQUFDLHNCQUFzQixDQUFDLGFBQWEsRUFBRTtZQUNqRixVQUFVLEVBQUUsaUZBQWlGO1NBQ2hHLENBQUMsQ0FBQztRQUVILE1BQU0sa0JBQWtCLEdBQUcsRUFBRSxDQUFDO1FBQzlCLGdCQUFnQixDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsRUFBRTtZQUNqQyxNQUFNLFlBQVksR0FBRyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxXQUFXLEVBQUUsS0FBSyxTQUFTLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQztZQUMzSCxJQUFJLENBQUMsbUJBQW1CLENBQUMsU0FBUyxFQUFFLFlBQVksQ0FBQyxDQUFDO1lBQ2xELElBQUksU0FBUyxD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