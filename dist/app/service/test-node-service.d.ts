import { BaseTestRuleInfo, IMatchTestRuleEventHandler, ITestNodeService, NodeTestRuleInfo, ResolveResourceInfo, TestResourceInfo, TestResourceTreeInfo } from "../../test-node-interface";
import { IOutsideApiService, IPresentableService, IPresentableVersionService, NodeInfo } from "../../interface";
import { PageResult, FreelogContext, IMongodbOperation } from 'egg-freelog-base';
export declare class TestNodeService implements ITestNodeService {
    ctx: FreelogContext;
    testRuleHandler: any;
    testNodeGenerator: any;
    outsideApiService: IOutsideApiService;
    presentableService: IPresentableService;
    nodeProvider: IMongodbOperation<NodeInfo>;
    presentableVersionService: IPresentableVersionService;
    matchTestRuleEventHandler: IMatchTestRuleEventHandler;
    nodeTestRuleProvider: IMongodbOperation<NodeTestRuleInfo>;
    nodeTestResourceProvider: IMongodbOperation<TestResourceInfo>;
    nodeTestResourceTreeProvider: IMongodbOperation<TestResourceTreeInfo>;
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
