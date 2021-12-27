import {inject, provide} from 'midway';
import {IOutsideApiService, ObjectStorageInfo} from '../../../interface';
import {
    ObjectDependencyTreeInfo, TestResourceDependencyTree,
    TestResourceOriginType, TestRuleMatchInfo
} from '../../../test-node-interface';
import {FreelogContext} from 'egg-freelog-base';
import {TestRuleChecker} from '../test-rule-checker';

@provide()
export class ImportObjectEntityHandler {

    @inject()
    ctx: FreelogContext;
    @inject()
    testRuleChecker: TestRuleChecker;
    @inject()
    outsideApiService: IOutsideApiService;

    /**
     * 从规则中分析需要导入的资源数据
     * @param userId
     * @param addObjectRules
     */
    async importObjectEntityDataFromRules(userId: number, addObjectRules: TestRuleMatchInfo[]) {

        const objectNames = addObjectRules.map(x => x.ruleInfo.candidate.name);
        const objects = await this.outsideApiService.getObjectListByFullNames(objectNames, {
            projection: 'bucketId,bucketName,objectName,userId,resourceType,systemProperty,customPropertyDescriptors'
        });
        for (const matchRule of addObjectRules) {
            const objectInfo = objects.find(x => `${x.bucketName}/${x.objectName}`.toLowerCase() === matchRule.ruleInfo.candidate.name.toLowerCase());
            this._fillRuleEntityInfo(matchRule, objectInfo, userId);
        }
    }

    /**
     * 获取存储对象依赖树
     * @param objectIdOrName
     */
    async getObjectDependencyTree(objectIdOrName: string): Promise<TestResourceDependencyTree[]> {

        const objectDependencyTree = await this.outsideApiService.getObjectDependencyTree(objectIdOrName, {
            isContainRootNode: 1
        });

        function recursionConvertSubNodes(dependencies: ObjectDependencyTreeInfo[]): TestResourceDependencyTree[] {
            if (!Array.isArray(dependencies)) {
                return [];
            }
            return dependencies.map(model => {
                return {
                    id: model.id,
                    name: model.name,
                    type: model.type as TestResourceOriginType,
                    resourceType: model.resourceType,
                    version: model.version,
                    versions: model.versions,
                    versionRange: model.versionRange,
                    versionId: model.versionId,
                    dependencies: recursionConvertSubNodes(model.dependencies)
                };
            });
        }

        return recursionConvertSubNodes(objectDependencyTree);
    }

    /**
     * 填充实体数据
     * @param matchRule
     * @param objectInfo
     * @param userId
     */
    _fillRuleEntityInfo(matchRule: TestRuleMatchInfo, objectInfo: ObjectStorageInfo, userId: number) {

        if (!objectInfo) {
            matchRule.matchErrors.push(this.ctx.gettext('reflect_rule_pre_excute_error_object_not_existed', matchRule.ruleInfo.candidate.name));
            return;
        }

        if (objectInfo.userId && objectInfo.userId !== userId) {
            matchRule.matchErrors.push(this.ctx.gettext('reflect_rule_pre_excute_error_access_limited', matchRule.ruleInfo.candidate.name));
            return;
        }

        if ((objectInfo.resourceType ?? '').trim() === '') {
            matchRule.matchErrors.push(this.ctx.gettext('reflect_rule_pre_excute_error_no_resource_type', matchRule.ruleInfo.candidate.name));
            return;
        }

        matchRule.testResourceOriginInfo = {
            id: objectInfo.objectId,
            name: matchRule.ruleInfo.candidate.name,
            type: TestResourceOriginType.Object,
            resourceType: objectInfo.resourceType ?? '',
            version: null,
            versions: [],
            coverImages: []
            // systemProperty: objectInfo.systemProperty,
            // customPropertyDescriptors: objectInfo.customPropertyDescriptors
        };

        this.testRuleChecker.fillEntityPropertyMap(matchRule, objectInfo.systemProperty, objectInfo.customPropertyDescriptors);
    }
}
