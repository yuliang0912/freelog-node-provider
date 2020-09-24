import { BaseTestRuleInfo, IMatchTestRuleEventHandler, ITestNodeService, NodeTestRuleInfo, ResolveResourceInfo, TestResourceInfo, TestResourceTreeInfo } from "../../test-node-interface";
import { IOutsideApiService, IPresentableService, IPresentableVersionService, PageResult } from "../../interface";
export declare class TestNodeService implements ITestNodeService {
    ctx: any;
    nodeProvider: any;
    testRuleHandler: any;
    testNodeGenerator: any;
    nodeTestRuleProvider: any;
    nodeTestResourceProvider: any;
    nodeTestResourceTreeProvider: any;
    presentableService: IPresentableService;
    outsideApiService: IOutsideApiService;
    presentableVersionService: IPresentableVersionService;
    matchTestRuleEventHandler: IMatchTestRuleEventHandler;
    findOneTestResource(condition: object, ...args: any[]): Promise<TestResourceInfo>;
    findTestResources(condition: object, ...args: any[]): Promise<TestResourceInfo[]>;
    findNodeTestRuleInfoById(nodeId: number, ...args: any[]): Promise<NodeTestRuleInfo>;
    testResourceCount(condition: object): Promise<number>;
    findOneTestResourceTreeInfo(condition: object, ...args: any[]): Promise<TestResourceTreeInfo>;
    findTestResourceTreeInfos(condition: object, ...args: any[]): Promise<TestResourceTreeInfo[]>;
    findTestResourcePageList(condition: object, page: number, pageSize: number, projection: string[], orderBy: object): Promise<PageResult<TestResourceInfo>>;
    /**
     * 匹配规则并且保存结果
     * @param nodeId
     * @param testRuleText
     */
    matchAndSaveNodeTestRule(nodeId: number, testRuleText: string): Promise<NodeTestRuleInfo>;
    /**
     * 更新测试资源
     * @param testResource
     * @param resolveResources
     */
    updateTestResource(testResource: TestResourceInfo, resolveResources: ResolveResourceInfo[]): Promise<TestResourceInfo>;
    _compileAndMatchTestRule(nodeId: number, testRuleText: string): BaseTestRuleInfo[];
}
