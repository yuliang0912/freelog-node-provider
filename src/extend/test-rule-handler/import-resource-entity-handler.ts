import {maxSatisfying} from 'semver';
import {provide, inject} from 'midway';
import {IOutsideApiService, ResourceDependencyTreeInfo, ResourceInfo} from "../../interface";
import {TestRuleMatchInfo, TestResourceOriginType, TestResourceDependencyTree} from "../../test-node-interface";

@provide()
export class ImportResourceEntityHandler {

    @inject()
    outsideApiService: IOutsideApiService;

    /**
     * 从规则中分析需要导入的资源数据
     * @param testRules
     * @param promiseResults
     */
    async importResourceEntityDataFromRules(addResourceRules: TestRuleMatchInfo[]) {

        const resourceNames = addResourceRules.map(x => x.ruleInfo.candidate.name);
        const resources = await this.outsideApiService.getResourceListByNames(resourceNames, {
            projection: 'resourceId,resourceName,resourceType,resourceVersions,coverImages'
        });

        addResourceRules.forEach(matchRule => {
            const resourceInfo = resources.find(x => x.resourceName.toLowerCase() === matchRule.ruleInfo.candidate.name.toLowerCase());
            this._fillRuleEntityInfo(matchRule, resourceInfo);
        })
    }

    /**
     * 获取展品依赖树
     * @param resourceId
     * @param version
     */
    async getResourceDependencyTree(resourceIdOrName: string, version: string): Promise<TestResourceDependencyTree[]> {

        const resourceDependencyTree = await this.outsideApiService.getResourceDependencyTree(resourceIdOrName, {
            isContainRootNode: 1,
            version
        });

        function recursionConvertSubNodes(dependencies: ResourceDependencyTreeInfo[]): TestResourceDependencyTree[] {
            if (!Array.isArray(dependencies)) {
                return [];
            }
            return dependencies.map(model => Object({
                id: model.resourceId,
                name: model.resourceName,
                type: TestResourceOriginType.Resource,
                resourceType: model.resourceType,
                version: model.version,
                versionId: model.versionId,
                dependencies: recursionConvertSubNodes(model.dependencies)
            }));
        }

        return recursionConvertSubNodes(resourceDependencyTree);
    }

    /**
     * 填充实体数据
     * @param matchRule
     * @param resourceInfo
     * @private
     */
    _fillRuleEntityInfo(matchRule: TestRuleMatchInfo, resourceInfo: ResourceInfo) {

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
            coverImages: resourceInfo.coverImages
            // _originInfo: resourceInfo
        }
    }

    /**
     * 匹配发行版本
     * @param releaseInfo
     * @param versionRange
     * @returns {*}
     */
    matchResourceVersion(resourceInfo: ResourceInfo, versionRange: string) {

        const {resourceVersions, latestVersion} = resourceInfo;
        if (!versionRange || versionRange === "latest") {
            return resourceVersions.find(x => x.version === latestVersion);
        }

        const version = maxSatisfying(resourceVersions.map(x => x.version), versionRange);
        return resourceVersions.find(x => x.version === version);
    }
}