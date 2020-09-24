import { BaseTestRuleInfo, FlattenTestResourceDependencyTree, FlattenTestResourceAuthTree, IMatchTestRuleEventHandler, ResolveResourceInfo, TestResourceDependencyTree, TestResourceInfo, TestRuleMatchInfo, TestRuleMatchResult } from '../test-node-interface';
import { FlattenPresentableAuthTree, FlattenPresentableDependencyTree, IOutsideApiService, IPresentableService, IPresentableVersionService, PresentableInfo, ResourceInfo } from "../interface";
export declare class MatchTestRuleEventHandler implements IMatchTestRuleEventHandler {
    testRuleHandler: any;
    testNodeGenerator: any;
    nodeTestRuleProvider: any;
    nodeTestResourceProvider: any;
    nodeTestResourceTreeProvider: any;
    presentableService: IPresentableService;
    outsideApiService: IOutsideApiService;
    presentableVersionService: IPresentableVersionService;
    presentableCommonChecker: any;
    /**
     * 开始规则测试匹配事件
     * @param nodeTestRuleInfo
     */
    handle(nodeId: number): Promise<void>;
    /**
     * 匹配测试资源
     * @param ruleInfos
     * @param nodeId
     * @param userId
     */
    matchAndSaveTestResourceInfos(ruleInfos: BaseTestRuleInfo[], nodeId: number, userId: number): Promise<TestRuleMatchResult[]>;
    /**
     * 导入展品到测试资源库(排除掉已经操作过的),目前不导入依赖树授权树信息
     * @param nodeId
     * @param userId
     * @param excludedPresentableIds
     */
    saveUnOperantPresentableToTestResources(nodeId: number, userId: number, excludedPresentableIds: string[]): Promise<void>;
    /**
     * 规则匹配结果转换为测试资源实体
     * @param testRuleMatchInfo
     * @param nodeId
     * @param userId
     */
    testRuleMatchInfoMapToTestResource(testRuleMatchInfo: TestRuleMatchInfo, nodeId: number, userId: number): TestResourceInfo;
    /**
     * 展品信息转换为测试资源实体
     * @param presentableInfo
     * @param resourceInfo
     * @param nodeId
     */
    presentableInfoMapToTestResource(presentableInfo: PresentableInfo, resourceInfo: ResourceInfo, nodeId: number, userId: number): TestResourceInfo;
    /**
     * 平铺依赖树
     * @param testResourceId
     * @param dependencyTree
     * @param parentNid
     * @param results
     * @param deep
     * @private
     */
    FlattenTestResourceDependencyTree(testResourceId: string, dependencyTree: TestResourceDependencyTree[], parentNid?: string, results?: FlattenTestResourceDependencyTree[], deep?: number): FlattenTestResourceDependencyTree[];
    /**
     * 展品依赖树转换成测试资源依赖树
     * @param testResourceId
     * @param FlattenTestResourceDependencyTree
     */
    convertPresentableDependencyTreeToTestResourceDependencyTree(testResourceId: string, FlattenTestResourceDependencyTree: FlattenPresentableDependencyTree[]): FlattenTestResourceDependencyTree[];
    convertPresentableAuthTreeToTestResourceAuthTree(flattenAuthTree: FlattenPresentableAuthTree[], resourceMap: Map<string, ResourceInfo>): FlattenTestResourceAuthTree[];
    /**
     *
     * @param authTree 平铺的授权树
     * @param existingResolveResources 之前已经解决过的记录
     * @param presentableInfo 展品信息
     * @private
     */
    getTestResourceResolveResources(authTree: FlattenTestResourceAuthTree[], userId: number, existingResolveResources?: ResolveResourceInfo[], presentableInfo?: PresentableInfo): any[];
}
