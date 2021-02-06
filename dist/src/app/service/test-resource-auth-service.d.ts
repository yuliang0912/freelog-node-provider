import { ContractInfo, IOutsideApiService } from "../../interface";
import { SubjectAuthResult } from "../../auth-interface";
import { FlattenTestResourceAuthTree, ITestResourceAuthService, TestResourceInfo } from "../../test-node-interface";
import { FreelogContext } from 'egg-freelog-base';
export declare class TestResourceAuthService implements ITestResourceAuthService {
    ctx: FreelogContext;
    outsideApiService: IOutsideApiService;
    /**
     * 测试资源授权
     * @param testResourceInfo
     * @param testResourceAuthTree
     */
    testResourceAuth(testResourceInfo: TestResourceInfo, testResourceAuthTree: FlattenTestResourceAuthTree[]): Promise<SubjectAuthResult>;
    /**
     * 展品节点侧授权(节点自己解决的资源以及上抛的授权情况)
     * @param testResourceInfo
     * @param testResourceAuthTree
     */
    testResourceNodeSideAuth(testResourceInfo: TestResourceInfo, testResourceAuthTree: FlattenTestResourceAuthTree[]): Promise<SubjectAuthResult>;
    /**
     * 展品上游合约授权,需要对应的标的物服务做出授权结果
     * @param testResourceInfo
     * @param testResourceAuthTree
     */
    testResourceUpstreamAuth(testResourceInfo: TestResourceInfo, testResourceAuthTree: FlattenTestResourceAuthTree[]): Promise<SubjectAuthResult>;
    /**
     * 根据合同计算测试授权结果
     * @param subjectId
     * @param contracts
     */
    contractAuth(subjectId: string, contracts: ContractInfo[]): SubjectAuthResult;
}
