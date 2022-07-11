import { FlattenPresentableAuthTree, IOutsideApiService, PresentableInfo } from '../../interface';
import { FreelogContext, FreelogUserInfo } from 'egg-freelog-base';
import { PolicyHelper } from '../../extend/policy-helper';
import { SubjectAuthResult } from '../../auth-interface';
import { PresentableService } from './presentable-service';
export declare class PresentableBatchAuthService {
    ctx: FreelogContext;
    policyHelper: PolicyHelper;
    presentableService: PresentableService;
    outsideApiService: IOutsideApiService;
    /**
     * 多展品全链路授权
     * @param presentables
     * @param presentableAuthTreeMap
     * @param authType 1:节点侧授权 2:上游侧授权 3:节点侧以及上游侧 4:全链路授权(含C端用户)
     */
    batchPresentableAuth(presentables: PresentableInfo[], presentableAuthTreeMap: Map<string, FlattenPresentableAuthTree[]>, authType: 1 | 2 | 3 | 4): Promise<Map<string, SubjectAuthResult>>;
    /**
     * 展品节点侧和上游链路授权
     * @param presentables
     * @param presentableAuthTreeMap
     * @param authType 1:节点侧授权 2:上游侧授权  3:节点侧以及上游侧
     */
    batchPresentableNodeSideAndUpstreamAuth(presentables: PresentableInfo[], presentableAuthTreeMap: Map<string, FlattenPresentableAuthTree[]>, authType: 1 | 2 | 3): Promise<Map<string, SubjectAuthResult>>;
    /**
     * 批量C端消费者授权
     * @param presentables
     * @param presentableAuthTreeMap
     */
    batchPresentableClientUserSideAuth(presentables: PresentableInfo[], presentableAuthTreeMap: Map<string, FlattenPresentableAuthTree[]>): Promise<Map<string, SubjectAuthResult>>;
    /**
     * 尝试创建免费合同
     * @param presentableInfo
     * @param userInfo
     */
    tryCreateFreeUserContract(presentableInfo: PresentableInfo, userInfo: FreelogUserInfo): Promise<SubjectAuthResult>;
    /**
     * 根据合同计算授权结果
     * @param subjectId
     * @param contracts
     */
    private contractAuth;
}
