import { BaseTestRuleInfo, FlattenTestResourceAuthTree, FlattenTestResourceDependencyTree, IMatchTestRuleEventHandler, NodeTestRuleInfo, ResolveResourceInfo, TestResourceDependencyTree, TestResourceInfo, TestResourcePropertyInfo, TestResourceTreeInfo, TestRuleMatchInfo, TestRuleMatchResult } from '../test-node-interface';
import { FlattenPresentableAuthTree, FlattenPresentableDependencyTree, IOutsideApiService, IPresentableService, IPresentableVersionService, NodeInfo, PresentableInfo, PresentableVersionInfo, ResourceInfo } from '../interface';
import { FreelogUserInfo, IMongodbOperation } from 'egg-freelog-base';
import { PresentableCommonChecker } from '../extend/presentable-common-checker';
import { TestRuleHandler } from '../extend/test-rule-handler';
export declare class MatchTestRuleEventHandler implements IMatchTestRuleEventHandler {
    testRuleHandler: TestRuleHandler;
    testNodeGenerator: any;
    nodeTestRuleProvider: IMongodbOperation<NodeTestRuleInfo>;
    nodeTestResourceProvider: IMongodbOperation<TestResourceInfo>;
    nodeTestResourceTreeProvider: IMongodbOperation<TestResourceTreeInfo>;
    nodeProvider: IMongodbOperation<NodeInfo>;
    presentableService: IPresentableService;
    outsideApiService: IOutsideApiService;
    presentableVersionService: IPresentableVersionService;
    presentableCommonChecker: PresentableCommonChecker;
    /**
     * 开始规则测试匹配事件
     * @param nodeId
     * @param userInfo
     * @param isMandatoryMatch 是否强制匹配
     */
    handle(nodeId: number, userInfo: FreelogUserInfo, isMandatoryMatch?: boolean): Promise<void>;
    /**
     * 匹配测试资源
     * @param ruleInfos
     * @param nodeId
     * @param userInfo
     */
    matchAndSaveTestResourceInfos(ruleInfos: BaseTestRuleInfo[], nodeId: number, userInfo: FreelogUserInfo): Promise<{
        themeTestRuleMatchInfo: TestRuleMatchInfo;
        testRuleMatchInfos: TestRuleMatchResult[];
    }>;
    /**
     * 导入展品到测试资源库(排除掉已经操作过的),目前不导入依赖树授权树信息
     * @param nodeId
     * @param userInfo
     * @param excludedPresentableIds
     * @param themeTestRuleMatchInfo
     */
    saveUnOperantPresentableToTestResources(nodeId: number, userInfo: FreelogUserInfo, excludedPresentableIds: string[], themeTestRuleMatchInfo: TestRuleMatchInfo): Promise<void>;
    /**
     * 设置主题
     * @param themeTestRuleMatchInfo
     */
    setThemeTestResource(themeTestRuleMatchInfo: TestRuleMatchInfo): Promise<void>;
    /**
     * 规则匹配结果转换为测试资源实体
     * @param testRuleMatchInfo
     * @param nodeId
     * @param userInfo
     */
    testRuleMatchInfoMapToTestResource(testRuleMatchInfo: TestRuleMatchInfo, nodeId: number, userInfo: FreelogUserInfo): TestResourceInfo;
    /**
     * 展品信息转换为测试资源实体
     * @param presentableInfo
     * @param presentableVersionInfo
     * @param resourceInfo
     * @param nodeId
     * @param userInfo
     * @param themeTestRuleMatchInfo
     */
    presentableInfoMapToTestResource(presentableInfo: PresentableInfo, presentableVersionInfo: PresentableVersionInfo, resourceInfo: ResourceInfo, nodeId: number, userInfo: FreelogUserInfo, themeTestRuleMatchInfo: TestRuleMatchInfo): TestResourceInfo;
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
    /**
     * 展品授权树转换为测试资源授权树
     * @param flattenAuthTree
     * @param resourceMap
     */
    convertPresentableAuthTreeToTestResourceAuthTree(flattenAuthTree: FlattenPresentableAuthTree[], resourceMap: Map<string, ResourceInfo>): FlattenTestResourceAuthTree[];
    /**
     * 获取测试资源解决的资源
     * @param authTree
     * @param userInfo
     * @param existingResolveResources
     * @param presentableInfo
     */
    getTestResourceResolveResources(authTree: FlattenTestResourceAuthTree[], userInfo: FreelogUserInfo, existingResolveResources?: ResolveResourceInfo[], presentableInfo?: PresentableInfo): any[];
    /**
     * 展品版本信息
     * @param presentableVersionInfo
     */
    getPresentablePropertyInfo(presentableVersionInfo: PresentableVersionInfo): TestResourcePropertyInfo[];
    private clearNodeTestResources;
}
