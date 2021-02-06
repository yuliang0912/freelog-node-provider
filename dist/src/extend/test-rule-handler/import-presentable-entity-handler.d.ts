import { TestRuleMatchInfo, TestResourceDependencyTree } from "../../test-node-interface";
import { IOutsideApiService, IPresentableService, IPresentableVersionService, PresentableInfo, ResourceInfo, FlattenPresentableDependencyTree, PresentableVersionInfo } from "../../interface";
import { PresentableCommonChecker } from "../presentable-common-checker";
export declare class ImportPresentableEntityHandler {
    outsideApiService: IOutsideApiService;
    presentableService: IPresentableService;
    presentableVersionService: IPresentableVersionService;
    presentableCommonChecker: PresentableCommonChecker;
    /**
     * 从规则中分析需要导入的展品数据
     * @param nodeId
     * @param alterPresentableRules
     */
    importPresentableEntityDataFromRules(nodeId: number, alterPresentableRules: TestRuleMatchInfo[]): Promise<void>;
    /**
     * 获取展品依赖树
     * @param presentableId
     * @param flattenPresentableDependencyTree
     */
    getPresentableDependencyTree(presentableId: string, flattenPresentableDependencyTree: FlattenPresentableDependencyTree[]): TestResourceDependencyTree[];
    /**
     * 填充实体数据
     * @param matchRule
     * @param presentableInfo
     * @param resourceInfo
     * @param presentableVersionInfo
     */
    _fillRuleEntityInfo(matchRule: TestRuleMatchInfo, presentableInfo: PresentableInfo, resourceInfo: ResourceInfo, presentableVersionInfo: PresentableVersionInfo): void;
}
