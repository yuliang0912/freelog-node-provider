import { TestRuleMatchInfo, TestResourceDependencyTree } from "../../test-node-interface";
import { IOutsideApiService, IPresentableService, IPresentableVersionService, PresentableInfo, ResourceInfo } from "../../interface";
export declare class ImportPresentableEntityHandler {
    outsideApiService: IOutsideApiService;
    presentableService: IPresentableService;
    presentableVersionService: IPresentableVersionService;
    /**
     * 从规则中分析需要导入的展品数据
     * @param nodeId
     * @param testRules
     * @param promiseResults
     */
    importPresentableEntityDataFromRules(nodeId: number, alterPresentableRules: TestRuleMatchInfo[]): Promise<void>;
    /**
     * 获取展品依赖树
     * @param presentableId
     * @param version
     */
    getPresentableDependencyTree(presentableId: any, version: any): Promise<TestResourceDependencyTree[]>;
    /**
     * 填充实体数据
     * @param matchRule
     * @param presentableInfo
     * @param resourceInfo
     * @private
     */
    _fillRuleEntityInfo(matchRule: TestRuleMatchInfo, presentableInfo: PresentableInfo, resourceInfo: ResourceInfo): void;
}
