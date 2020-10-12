import {inject, provide} from "midway";
import {IOutsideApiService, ObjectStorageInfo} from "../../interface";
import {
    ObjectDependencyTreeInfo,
    TestResourceDependencyTree,
    TestResourceOriginType,
    TestRuleMatchInfo
} from "../../test-node-interface";

@provide()
export class ImportObjectEntityHandler {

    @inject()
    outsideApiService: IOutsideApiService;

    /**
     * 从规则中分析需要导入的资源数据
     * @param testRules
     * @param promiseResults
     */
    async importObjectEntityDataFromRules(userId: number, addObjectRules: TestRuleMatchInfo[]) {

        const objectNames = addObjectRules.map(x => x.ruleInfo.candidate.name);
        const objects = await this.outsideApiService.getObjectListByFullNames(objectNames, {
            projection: 'bucketId,bucketName,objectName,userId,resourceType'
        });

        addObjectRules.forEach(matchRule => {
            const objectInfo = objects.find(x => `${x.bucketName}/${x.objectName}`.toLowerCase() === matchRule.ruleInfo.candidate.name.toLowerCase());
            this._fillRuleEntityInfo(matchRule, objectInfo, userId);
        });
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
                    versionId: model.versionId,
                    fileSha1: model.fileSha1,
                    dependencies: recursionConvertSubNodes(model.dependencies)
                }
            });
        }

        return recursionConvertSubNodes(objectDependencyTree);
    }

    /**
     * 填充实体数据
     * @param matchRule
     * @param presentableInfo
     * @param resourceInfo
     * @private
     */
    _fillRuleEntityInfo(matchRule: TestRuleMatchInfo, objectInfo: ObjectStorageInfo, userId: number) {

        if (!objectInfo) {
            matchRule.isValid = false;
            matchRule.matchErrors.push(`存储空间中不存在名称为${matchRule.ruleInfo.candidate.name}的对象`);
            return;
        }

        if (objectInfo.userId && objectInfo.userId !== userId) {
            matchRule.isValid = false;
            matchRule.matchErrors.push(`没有权限导入名称为${matchRule.ruleInfo.candidate.name}的存储对象`);
            return;
        }

        if ((objectInfo.resourceType ?? '').trim() === '') {
            matchRule.isValid = false;
            matchRule.matchErrors.push(`名称为${matchRule.ruleInfo.candidate.name}的存储对象暂未设置资源类型,无法被使用`);
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
            // _originInfo: objectInfo
        }
    }
}