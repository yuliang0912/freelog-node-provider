import { IOutsideApiService, ObjectStorageInfo } from "../../interface";
import { TestResourceDependencyTree, TestRuleMatchInfo } from "../../test-node-interface";
export declare class ImportObjectEntityHandler {
    outsideApiService: IOutsideApiService;
    /**
     * 从规则中分析需要导入的资源数据
     * @param testRules
     * @param promiseResults
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
     * @param presentableInfo
     * @param resourceInfo
     * @private
     */
    _fillRuleEntityInfo(matchRule: TestRuleMatchInfo, objectInfo: ObjectStorageInfo, userId: number): void;
}
