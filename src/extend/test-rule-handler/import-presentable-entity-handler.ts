import {provide, inject} from 'midway';
import {TestRuleMatchInfo, TestResourceOriginType, TestResourceDependencyTree} from "../../test-node-interface";
import {
    IOutsideApiService, IPresentableService, IPresentableVersionService,
    PresentableInfo, PresentableVersionDependencyTreeInfo, ResourceInfo
} from "../../interface";

@provide()
export class ImportPresentableEntityHandler {

    @inject()
    outsideApiService: IOutsideApiService;
    @inject()
    presentableService: IPresentableService;
    @inject()
    presentableVersionService: IPresentableVersionService;

    /**
     * 从规则中分析需要导入的展品数据
     * @param nodeId
     * @param testRules
     * @param promiseResults
     */
    async importPresentableEntityDataFromRules(nodeId: number, alterPresentableRules: TestRuleMatchInfo[]) {

        const presentableNames = alterPresentableRules.map(x => new RegExp(`^${x.ruleInfo.presentableName}$`, 'i'));
        const presentables = await this.presentableService.find({
            nodeId, presentableName: {$in: presentableNames}
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
    async getPresentableDependencyTree(presentableId, version): Promise<TestResourceDependencyTree[]> {

        const presentableVersion = await this.presentableVersionService.findById(presentableId, version, 'dependencyTree');
        const presentableDependencyTree = this.presentableVersionService.buildPresentableDependencyTree(presentableVersion.dependencyTree, presentableId.substr(0, 12), true, Number.MAX_SAFE_INTEGER);

        function recursionConvertSubNodes(dependencies: PresentableVersionDependencyTreeInfo[]): TestResourceDependencyTree[] {
            if (!Array.isArray(dependencies)) {
                return [];
            }
            return dependencies.map(model => Object({
                nid: model.nid,
                id: model.resourceId,
                name: model.resourceName,
                type: TestResourceOriginType.Resource,
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
    _fillRuleEntityInfo(matchRule: TestRuleMatchInfo, presentableInfo: PresentableInfo, resourceInfo: ResourceInfo) {

        if (!presentableInfo) {
            matchRule.isValid = false
            matchRule.matchErrors.push(`节点中不存在名称为${matchRule.ruleInfo.presentableName}的展品`);
            return
        }

        matchRule.testResourceOriginInfo = {
            id: resourceInfo.resourceId,
            name: resourceInfo.resourceName,
            type: TestResourceOriginType.Resource,
            resourceType: resourceInfo.resourceType ?? '',
            version: presentableInfo.version,
            versions: resourceInfo.resourceVersions.map(x => x.version),
            coverImages: resourceInfo.coverImages ?? [],
            intro: resourceInfo.intro ?? ''
            // _originInfo: resourceInfo
        };

        matchRule.presentableInfo = presentableInfo;
    }
}