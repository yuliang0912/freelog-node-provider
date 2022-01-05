import { IOutsideApiService } from '../../interface';
import { ITestNodeService, ITestResourceAuthService } from '../../test-node-interface';
import { FreelogContext } from 'egg-freelog-base';
export declare class TestNodeAuthController {
    ctx: FreelogContext;
    testNodeService: ITestNodeService;
    outsideApiService: IOutsideApiService;
    testResourceAuthService: ITestResourceAuthService;
    testResourceAuthResponseHandler: any;
    /**
     * 测试资源或者子依赖授权
     */
    testResourceAuth(): Promise<void>;
    /**
     * 测试资源批量授权
     */
    testResourceBatchAuth(): Promise<FreelogContext>;
    /**
     * 测试资源或者子依赖授权,根据节点ID和源实体ID查找测试资源.
     */
    nodeTestResourceAuth(): Promise<void>;
}
