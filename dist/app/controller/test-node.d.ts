import { INodeService } from '../../interface';
import { ITestNodeService } from '../../test-node-interface';
import { FreelogContext, IJsonSchemaValidate } from 'egg-freelog-base';
export declare class TestNodeController {
    ctx: FreelogContext;
    nodeCommonChecker: any;
    testNodeGenerator: any;
    nodeService: INodeService;
    testNodeService: ITestNodeService;
    resolveResourcesValidator: IJsonSchemaValidate;
    showTestRuleInfo(): Promise<void>;
    createTestRule(): Promise<void>;
    updateTestRule(): Promise<void>;
    testRulePreExecution(): Promise<void>;
    rematchTestRule(): Promise<void>;
    testResources(): Promise<void>;
    testResourceList(): Promise<void>;
    showTestResource(): Promise<void>;
    updateTestResource(): Promise<void>;
    searchTestResources(): Promise<void>;
    testResourceDependencyTree(): Promise<any[]>;
    testResourceAuthTree(): Promise<any[]>;
    searchTestResourceDependencyTree(): Promise<void>;
    filterTestResourceDependencyTree(): Promise<FreelogContext>;
}
