import { IOutsideApiService } from '../../interface';
import { ITestNodeService, ITestResourceAuthService } from "../../test-node-interface";
export declare class TestNodeAuthController {
    ctx: any;
    testNodeService: ITestNodeService;
    outsideApiService: IOutsideApiService;
    testResourceAuthService: ITestResourceAuthService;
    testResourceAuthResponseHandler: any;
    /**
     * 测试资源或者子依赖授权
     * @param ctx
     */
    testResourceAuth(ctx: any): Promise<void>;
    /**
     * 测试资源或者子依赖授权,根据节点ID和源实体ID查找测试资源.
     * @param ctx
     */
    nodeTestResourceAuth(ctx: any): Promise<void>;
}
