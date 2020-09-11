import { TestResourceDependencyTree, TestResourceInfo, TestResourceOriginInfo, TestRuleMatchInfo } from "../../test-node-interface";
import { IOutsideApiService, IPresentableService, PresentableInfo, ResourceInfo } from "../../interface";
export declare class TestNodeService {
    ctx: any;
    nodeProvider: any;
    testRuleHandler: any;
    presentableService: IPresentableService;
    outsideApiService: IOutsideApiService;
    /**
     * 匹配规则并且保存结果
     * @param nodeId
     * @param testRuleText
     */
    matchAndSaveNodeTestRule(nodeId: number, testRuleText: string): Promise<TestResourceInfo[]>;
    /**
     * 获取未操作的展品
     * @param nodeId
     * @param testRuleMatchInfos
     */
    getUnOperantPresentables(nodeId: number, testRuleMatchInfos: TestRuleMatchInfo[]): Promise<TestResourceInfo[]>;
    /**
     * 规则匹配结果转换为测试资源实体
     * @param testRuleMatchInfo
     * @param nodeId
     */
    _testRuleMatchInfoMapToTestResource(testRuleMatchInfo: TestRuleMatchInfo, nodeId: number): TestResourceInfo;
    /**
     * presentable转换为测试资源实体
     * @param presentableInfo
     * @param resourceInfo
     * @param nodeId
     */
    _presentableInfoMapToTestResource(presentableInfo: PresentableInfo, resourceInfo: ResourceInfo, nodeId: number): TestResourceInfo;
    _compileAndMatchTestRule(nodeId: number, testRuleText: string): Promise<TestRuleMatchInfo[]>;
    _generateTestResourceAuthTree(dependencyTree: TestResourceDependencyTree[]): Promise<void>;
    /**
     * 生成测试资源ID
     * @param nodeId
     * @param originInfo
     * @private
     */
    _generateTestResourceId(nodeId: number, originInfo: TestResourceOriginInfo): any;
}
