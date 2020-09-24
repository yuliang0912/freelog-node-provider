import { IJsonSchemaValidate, INodeService } from '../../interface';
import { ITestNodeService } from "../../test-node-interface";
export declare class TestNodeController {
    testRuleHandler: any;
    nodeCommonChecker: any;
    testNodeGenerator: any;
    nodeService: INodeService;
    testNodeService: ITestNodeService;
    resolveResourcesValidator: IJsonSchemaValidate;
    showTestRuleInfo(ctx: any): Promise<void>;
    createTestRule(ctx: any): Promise<void>;
    updateTestRule(ctx: any): Promise<void>;
    rematchTestRule(ctx: any): Promise<void>;
    testResources(ctx: any): Promise<void>;
    /**
     * 根据源资源获取测试资源.例如通过发行名称或者发行ID获取测试资源.API不再提供单一查询
     * @param ctx
     */
    testResourceList(ctx: any): Promise<void>;
    showTestResource(ctx: any): Promise<void>;
    updateTestResource(ctx: any): Promise<void>;
    searchTestResources(ctx: any): Promise<void>;
    testResourceDependencyTree(ctx: any): Promise<any[]>;
    searchTestResourceDependencyTree(ctx: any): Promise<void>;
    filterTestResourceDependencyTree(ctx: any): Promise<any>;
}
