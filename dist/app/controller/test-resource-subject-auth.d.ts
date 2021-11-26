import { ITestNodeService, ITestResourceAuthService, TestResourceInfo } from '../../test-node-interface';
import { FreelogContext } from 'egg-freelog-base';
import { SubjectAuthResult } from '../../auth-interface';
import { TestResourceAdapter } from '../../extend/exhibit-adapter/test-resource-adapter';
import { ExhibitAuthResponseHandler } from '../../extend/auth-response-handler/exhibit-auth-response-handler';
import { WorkTypeEnum } from '../../enum';
export declare class TestResourceSubjectAuthController {
    ctx: FreelogContext;
    testNodeService: ITestNodeService;
    testResourceAuthService: ITestResourceAuthService;
    testResourceAdapter: TestResourceAdapter;
    exhibitAuthResponseHandler: ExhibitAuthResponseHandler;
    /**
     * 通过展品ID获取展品
     */
    exhibitAuth(): Promise<void>;
    /**
     * 测试资源或者子依赖授权,根据节点ID和源实体ID查找测试资源.
     */
    exhibitAuthByNodeAndWork(): Promise<void>;
    /**
     * 测试资源批量授权
     */
    testResourceBatchAuth(): Promise<FreelogContext | SubjectAuthResult>;
    /**
     * 测试展品授权处理
     * @param testResource
     * @param parentNid
     * @param subWorkIdOrName
     * @param subWorkType
     * @param subFilePath
     */
    _testResourceAuthHandle(testResource: TestResourceInfo, parentNid: string, subWorkIdOrName: string, subWorkType: WorkTypeEnum, subFilePath: string): Promise<void>;
}
