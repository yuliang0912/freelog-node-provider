import { IMatchTestRuleEventHandler, ITestNodeService, NodeTestRuleInfo, ResolveResourceInfo, TestResourceInfo, TestResourceTreeInfo } from '../../test-node-interface';
import { IOutsideApiService } from '../../interface';
import { PageResult, FreelogContext, IMongodbOperation } from 'egg-freelog-base';
import { TestRuleHandler } from '../../extend/test-rule-handler';
export declare class TestNodeService implements ITestNodeService {
    ctx: FreelogContext;
    testRuleHandler: TestRuleHandler;
    testNodeGenerator: any;
    outsideApiService: IOutsideApiService;
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
    searchTestResourceTreeInfos(nodeId: number, keywords: string): Promise<TestResourceTreeInfo[]>;
    findIntervalResourceList(condition: object, skip: number, limit: number, projection: string[], sort?: object): Promise<PageResult<TestResourceInfo>>;
    /**
     * 匹配规则并且保存结果
     * @param nodeId
     * @param testRuleText
     */
    matchAndSaveNodeTestRule(nodeId: number, testRuleText: string): Promise<NodeTestRuleInfo>;
    /**
     * 尝试匹配规则
     * @param nodeId
     * @param isMandatoryMatch
     */
    tryMatchNodeTestRule(nodeId: number, isMandatoryMatch: boolean): Promise<NodeTestRuleInfo>;
    /**
     * 更新测试资源
     * @param testResource
     * @param resolveResources
     */
    updateTestResource(testResource: TestResourceInfo, resolveResources: ResolveResourceInfo[]): Promise<TestResourceInfo>;
}
