import { IOutsideApiService } from '../../interface';
import { ITestNodeService, ITestResourceAuthService } from '../../test-node-interface';
import { FreelogContext } from 'egg-freelog-base';
import { SubjectAuthResult } from '../../auth-interface';
import { SubjectTestResourceAuthResponseHandler } from '../../extend/auth-response-handler/subject-test-resource-auth-response-handler';
export declare class TestResourceSubjectAuthController {
    ctx: FreelogContext;
    testNodeService: ITestNodeService;
    outsideApiService: IOutsideApiService;
    testResourceAuthService: ITestResourceAuthService;
    subjectTestResourceAuthResponseHandler: SubjectTestResourceAuthResponseHandler;
    /**
     * 测试资源或者子依赖授权
     */
    testResourceAuth(): Promise<void>;
    /**
     * 测试资源批量授权
     */
    testResourceBatchAuth(): Promise<FreelogContext | SubjectAuthResult>;
    /**
     * 测试资源或者子依赖授权,根据节点ID和源实体ID查找测试资源.
     */
    nodeTestResourceAuth(): Promise<void>;
}