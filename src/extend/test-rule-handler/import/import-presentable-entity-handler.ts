import {provide, inject} from 'midway';
import {TestRuleMatchInfo, TestResourceOriginType, TestResourceDependencyTree} from '../../../test-node-interface';
import {
    IOutsideApiService, IPresentableService, IPresentableVersionService,
    PresentableInfo, PresentableDependencyTree, ResourceInfo, FlattenPresentableDependencyTree, PresentableVersionInfo
} from '../../../interface';
import {PresentableCommonChecker} from '../../presentable-common-checker';
import {FreelogContext} from 'egg-freelog-base';
import {TestRuleChecker} from '../test-rule-checker';

@provide()
export class ImportPresentableEntityHandler {

    @inject()
    ctx: FreelogContext;
    @inject()
    testRuleChecker: TestRuleChecker;
    @inject()
    outsideApiService: IOutsideApiService;
    @inject()
    presentableService: IPresentableService;
    @inject()
    presentableVersionService: IPresentableVersionService;
    @inject()
    presentableCommonChecker: PresentableCommonChecker;

    /**
     * 从规则中分析需要导入的展品数据
     * @param nodeId
     * @param alterPresentableRules
     */
    async importPresentableEntityDataFromRules(nodeId: number, alterPresentableRules: TestRuleMatchInfo[]) {

        const presentableNames = alterPresentableRules.map(x => new RegExp(`^${x.ruleInfo.exhibitName}$`, 'i'));
        const presentables = await this.presentableService.find({
            nodeId, presentableName: {$in: presentableNames}
        });

        const resources = await this.outsideApiService.getResourceListByIds(presentables.map(x => x.resourceInfo.resourceId), {
            projection: 'resourceId,resourceName,resourceType,resourceVersions,coverImages,userId'
        });

        const presentableVersionIds = presentables.map(x => this.presentableCommonChecker.generatePresentableVersionId(x.presentableId, x.version));
        const presentableProperties = await this.presentableVersionService.findByIds(presentableVersionIds, 'presentableId dependencyTree resourceSystemProperty resourceCustomPropertyDescriptors presentableRewriteProperty');

        for (const matchRule of alterPresentableRules) {
            const presentableInfo = presentables.find(x => x.presentableName.toLowerCase() === matchRule.ruleInfo.exhibitName.toLowerCase());
            const resourceInfo = presentableInfo ? resources.find(x => x.resourceId === presentableInfo.resourceInfo.resourceId) : null;
            const presentableVersionInfo = presentableInfo ? presentableProperties.find(x => x.presentableId === presentableInfo.presentableId) : null;
            this._fillRuleEntityInfo(matchRule, presentableInfo, resourceInfo, presentableVersionInfo);
        }
    }

    /**
     * 获取展品依赖树
     * @param presentableId
     * @param flattenPresentableDependencyTree
     */
    getPresentableDependencyTree(presentableId: string, flattenPresentableDependencyTree: FlattenPresentableDependencyTree[]): TestResourceDependencyTree[] {

        const presentableDependencyTree = this.presentableVersionService.convertPresentableDependencyTree(flattenPresentableDependencyTree, presentableId.substr(0, 12), true, Number.MAX_SAFE_INTEGER);

        function recursionConvertSubNodes(dependencies: PresentableDependencyTree[]): TestResourceDependencyTree[] {
            if (!Array.isArray(dependencies)) {
                return [];
            }
            return dependencies.map(model => {
                return {
                    nid: model.nid,
                    id: model.resourceId,
                    name: model.resourceName,
                    type: TestResourceOriginType.Resource,
                    resourceType: model.resourceType,
                    version: model.version,
                    versionId: model.versionId,
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
     * @param presentableVersionInfo
     */
    _fillRuleEntityInfo(matchRule: TestRuleMatchInfo, presentableInfo: PresentableInfo, resourceInfo: ResourceInfo, presentableVersionInfo: PresentableVersionInfo) {

        if (!presentableInfo) {
            matchRule.matchErrors.push(this.ctx.gettext('reflect_rule_pre_excute_error_exhibit_not_existed', matchRule.ruleInfo.exhibitName));
            return;
        }

        matchRule.testResourceOriginInfo = {
            id: resourceInfo.resourceId,
            ownerUserId: resourceInfo.userId,
            name: resourceInfo.resourceName,
            type: TestResourceOriginType.Resource,
            resourceType: resourceInfo.resourceType ?? '',
            version: presentableInfo.version,
            versions: resourceInfo.resourceVersions.map(x => x.version),
            coverImages: presentableInfo.coverImages ?? []
        };

        if (!matchRule.testResourceOriginInfo.coverImages.length) {
            matchRule.testResourceOriginInfo.coverImages = ['http://static.testfreelog.com/static/default_cover.png'];
        }

        this.testRuleChecker.fillEntityPropertyMap(matchRule, presentableVersionInfo.resourceSystemProperty, presentableVersionInfo.resourceCustomPropertyDescriptors, presentableVersionInfo.presentableRewriteProperty);

        matchRule.presentableInfo = presentableInfo;

        // 依赖树
        matchRule.entityDependencyTree = this.getPresentableDependencyTree(presentableVersionInfo.presentableId, presentableVersionInfo.dependencyTree);
    }
}
