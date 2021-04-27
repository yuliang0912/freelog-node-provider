import { ContractInfo, FlattenPresentableAuthTree, IOutsideApiService, IPresentableAuthService, PresentableInfo } from '../../interface';
import { FreelogContext, FreelogUserInfo } from 'egg-freelog-base';
import { SubjectAuthResult } from '../../auth-interface';
export declare class PresentableAuthService implements IPresentableAuthService {
    ctx: FreelogContext;
    outsideApiService: IOutsideApiService;
    /**
     * 展品授权,包括三部分(1.C端用户授权 2:节点自身合约授权 3:展品上游资源授权)
     * @param presentableInfo
     * @param presentableAuthTree
     */
    presentableAuth(presentableInfo: PresentableInfo, presentableAuthTree: FlattenPresentableAuthTree[]): Promise<SubjectAuthResult>;
    /**
     * 展品节点侧以及上游授权结果
     * @param presentableInfo
     * @param presentableAuthTree
     */
    presentableNodeSideAndUpstreamAuth(presentableInfo: PresentableInfo, presentableAuthTree: FlattenPresentableAuthTree[]): Promise<SubjectAuthResult>;
    /**
     * 展品节点侧授权(节点自己解决的资源以及上抛的授权情况)
     * @param presentableInfo
     * @param presentableAuthTree
     */
    presentableNodeSideAuth(presentableInfo: PresentableInfo, presentableAuthTree: FlattenPresentableAuthTree[]): Promise<SubjectAuthResult>;
    /**
     * 展品上游合约授权(通过授权树获取对应的合约的授权状态即可直接判定,无需调用标的物的授权API)
     * @param presentableInfo
     * @param presentableAuthTree
     */
    presentableUpstreamAuth(presentableInfo: PresentableInfo, presentableAuthTree: FlattenPresentableAuthTree[]): Promise<SubjectAuthResult>;
    /**
     *  展品C端用户侧授权(自动查找当前登录用户与展品之间的合约,如果无合约,需要根据需求做免费策略校验.然后登录用户自动签约免费策略,非登录用户直接通过授权)
     * @param presentableInfo
     */
    presentableClientUserSideAuth(presentableInfo: PresentableInfo): Promise<SubjectAuthResult>;
    /**
     * 根据合同计算授权结果
     * @param subjectId
     * @param contracts
     */
    contractAuth(subjectId: any, contracts: ContractInfo[]): SubjectAuthResult;
    /**
     * 用户合同授权
     * @param presentableInfo
     * @param userInfo
     */
    _loginUserContractAuth(presentableInfo: PresentableInfo, userInfo: FreelogUserInfo): Promise<SubjectAuthResult>;
    /**
     * 尝试创建免费合同
     * @param presentableInfo
     * @param userInfo
     */
    _tryCreateFreeUserContract(presentableInfo: PresentableInfo, userInfo: FreelogUserInfo): Promise<SubjectAuthResult>;
}
