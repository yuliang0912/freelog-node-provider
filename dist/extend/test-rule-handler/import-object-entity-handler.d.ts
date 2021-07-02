import { IOutsideApiService, ObjectStorageInfo } from '../../interface';
import { TestResourceDependencyTree, TestRuleMatchInfo } from '../../test-node-interface';
import { FreelogContext } from 'egg-freelog-base';
export declare class ImportObjectEntityHandler {
    ctx: FreelogContext;
    outsideApiService: IOutsideApiService;
    /**
     * 从规则中分析需要导入的资源数据
     * @param userId
     * @param addObjectRules
     */
    importObjectEntityDataFromRules(userId: number, addObjectRules: TestRuleMatchInfo[]): Promise<void>;
    /**
     * 获取存储对象依赖树
     * @param objectIdOrName
     */
    getObjectDependencyTree(objectIdOrName: string): Promise<TestResourceDependencyTree[]>;
    /**
     * 填充实体数据
     * @param matchRule
     * @param objectInfo
     * @param userId
     */
    _fillRuleEntityInfo(matchRule: TestRuleMatchInfo, objectInfo: ObjectStorageInfo, userId: number): void;
}
