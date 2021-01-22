import {maxSatisfying} from 'semver';
import {provide, inject} from 'midway';
import {IOutsideApiService, ResourceDependencyTree, ResourceInfo} from "../../interface";
import {TestRuleMatchInfo, TestResourceOriginType, TestResourceDependencyTree} from "../../test-node-interface";
import {PresentableCommonChecker} from "../presentable-common-checker";

@provide()
export class ImportResourceEntityHandler {

    @inject()
    outsideApiService: IOutsideApiService;
    @inject()
    presentableCommonChecker: PresentableCommonChecker;

    /**
     * 从规则中分析需要导入的资源数据
     * @param addResourceRules
     */
    async importResourceEntityDataFromRules(addResourceRules: TestRuleMatchInfo[]) {

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
                    versionId: model.versionId,
                    fileSha1: model.fileSha1,
                    dependencies: recursionConvertSubNodes(model.dependencies)
                }
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
        if (!versionRange || versionRange === "latest") {
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
            type: TestResourceOriginType.Resource,
            resourceType: resourceInfo.resourceType ?? '',
            version: resourceVersion.version,
            versions: resourceInfo.resourceVersions.map(x => x.version),
            coverImages: resourceInfo.coverImages,
        }
        matchRule.efficientInfos.push({type: 'add', count: 1});
    }

    /**
     * 填充资源对应版本的属性信息
     * @param matchRule
     * @param resourceProperty
     */
    _fillRuleEntityProperty(matchRule: TestRuleMatchInfo, resourceProperty: any): void {

        if (!matchRule.isValid || !resourceProperty) {
            return;
        }
        matchRule.testResourceOriginInfo.systemProperty = resourceProperty.systemProperty;
        matchRule.testResourceOriginInfo.customPropertyDescriptors = resourceProperty.customPropertyDescriptors;
    }
}
