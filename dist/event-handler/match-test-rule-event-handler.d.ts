import { BaseTestRuleInfo, FlattenTestResourceDependencyTree, FlattenTestResourceAuthTree, IMatchTestRuleEventHandler, NodeTestRuleInfo, ResolveResourceInfo, TestResourceDependencyTree, TestResourceInfo, TestRuleMatchInfo, TestRuleMatchResult, TestResourceTreeInfo } from '../test-node-interface';
import { FlattenPresentableAuthTree, FlattenPresentableDependencyTree, IOutsideApiService, IPresentableService, IPresentableVersionService, PresentableInfo, ResourceInfo } from "../interface";
import { IMongodbOperation } from "egg-freelog-base";
import { PresentableCommonChecker } from '../extend/presentable-common-checker';
import { TestRuleHandler } from '../extend/test-rule-handler';
export declare class MatchTestRuleEventHandler implements IMatchTestRuleEventHandler {
    testRuleHandler: TestRuleHandler;
    testNodeGenerator: any;
    nodeTestRuleProvider: IMongodbOperation<NodeTestRuleInfo>;
    nodeTestResourceProvider: IMongodbOperation<TestResourceInfo>;
    nodeTestResourceTreeProvider: IMongodbOperation<TestResourceTreeInfo>;
    presentableService: IPresentableService;
    outsideApiService: IOutsideApiService;
    presentableVersionService: IPresentableVersionService;
    presentableCommonChecker: PresentableCommonChecker;
    /**
     * 开始规则测试匹配事件
     * @param nodeId
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
    flattenTestResourceDependencyTree(testResourceId: string, dependencyTree: TestResourceDependencyTree[], parentNid?: string, results?: FlattenTestResourceDependencyTree[], deep?: number): FlattenTestResourceDependencyTree[];
    /**
     * 展品依赖树转换成测试资源依赖树
     * @param testResourceId
     * @param flattenTestResourceDependencyTree
     */
    convertPresentableDependencyTreeToTestResourceDependencyTree(testResourceId: string, flattenTestResourceDependencyTree: FlattenPresentableDependencyTree[]): FlattenTestResourceDependencyTree[];
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
