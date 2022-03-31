import {maxSatisfying} from 'semver';
import {provide, inject} from 'midway';
import {IOutsideApiService, ResourceDependencyTree, ResourceInfo} from '../../../interface';
import {
    TestRuleMatchInfo,
    TestResourceOriginType,
    TestResourceDependencyTree
} from '../../../test-node-interface';
import {PresentableCommonChecker} from '../../presentable-common-checker';
import {FreelogContext} from 'egg-freelog-base';
import {TestRuleChecker} from '../test-rule-checker';

@provide()
export class ImportResourceEntityHandler {

    @inject()
    ctx: FreelogContext;
    @inject()
    outsideApiService: IOutsideApiService;
    @inject()
    testRuleChecker: TestRuleChecker;
    @inject()
    presentableCommonChecker: PresentableCommonChecker;

    /**
     * 从规则中分析需要导入的资源数据
     * @param addResourceRules
     */
    async importResourceEntityDataFromRules(addResourceRules: TestRuleMatchInfo[]) {

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
    async getResourceDependencyTree(resourceIdOrName: string, version: string): Promise<TestResourceDependencyTree[]> {

        const resourceDependencyTree = await this.outsideApiService.getResourceDependencyTree(resourceIdOrName, {
            isContainRootNode: 1, version
        });

        function recursionConvertSubNodes(dependencies: ResourceDependencyTree[]): TestResourceDependencyTree[] {
            if (!Array.isArray(dependencies)) {
                return [];
            }
            return dependencies.map(model => {
                return {
                    id: model.resourceId,
                    name: model.resourceName,
                    type: TestResourceOriginType.Resource,
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
    matchResourceVersion(resourceInfo: ResourceInfo, versionRange: string) {

        const {resourceVersions, latestVersion} = resourceInfo;
        if (!versionRange || versionRange === 'latest') {
            return resourceVersions.find(x => x.version === latestVersion);
        }

        const version = maxSatisfying(resourceVersions.map(x => x.version), versionRange);
        return resourceVersions.find(x => x.version === version);
    }

    /**
     * 填充实体数据
     * @param matchRule
     * @param resourceInfo
     * @private
     */
    _fillRuleEntityInfo(matchRule: TestRuleMatchInfo, resourceInfo: ResourceInfo): void {

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
            type: TestResourceOriginType.Resource,
            resourceType: resourceInfo.resourceType ?? '',
            version: resourceVersion.version,
            versions: resourceInfo.resourceVersions.map(x => x.version),
            coverImages: resourceInfo.coverImages ?? [],
        };

        if (!matchRule.testResourceOriginInfo.coverImages.length) {
            matchRule.testResourceOriginInfo.coverImages = ['http://static.testfreelog.com/static/default_cover.png'];
        }
    }
}
