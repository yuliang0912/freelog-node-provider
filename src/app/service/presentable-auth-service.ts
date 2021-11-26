import {inject, provide} from 'midway';
import {
    ContractInfo,
    FlattenPresentableAuthTree,
    IOutsideApiService,
    IPresentableAuthService,
    PresentableInfo
} from '../../interface';
import {chain, isArray, isEmpty} from 'lodash';
import {
    ApplicationError,
    FreelogContext,
    FreelogUserInfo,
    SubjectAuthCodeEnum,
    SubjectTypeEnum
} from 'egg-freelog-base';
import {DefaulterIdentityTypeEnum, SubjectAuthResult} from '../../auth-interface';
import {PolicyHelper} from '../../extend/policy-helper';

@provide()
export class PresentableAuthService implements IPresentableAuthService {

    @inject()
    ctx: FreelogContext;
    @inject()
    policyHelper: PolicyHelper;
    @inject()
    outsideApiService: IOutsideApiService;

    /**
     * 展品授权,包括三部分(1.C端用户授权 2:节点自身合约授权 3:展品上游资源授权)
     * @param presentableInfo
     * @param presentableAuthTree
     */
    async presentableAuth(presentableInfo: PresentableInfo, presentableAuthTree: FlattenPresentableAuthTree[]): Promise<SubjectAuthResult> {
        const clientUserSideAuthResult = await this.presentableClientUserSideAuth(presentableInfo);
        if (!clientUserSideAuthResult.isAuth) {
            return clientUserSideAuthResult;
        }

        const nodeSideAuthTask = this.presentableNodeSideAuth(presentableInfo, presentableAuthTree);
        const upstreamResourceAuthTask = this.presentableUpstreamAuth(presentableInfo, presentableAuthTree);
        const [nodeSideAuthResult, upstreamResourceAuthResult] = await Promise.all([nodeSideAuthTask, upstreamResourceAuthTask]);

        return !nodeSideAuthResult.isAuth ? nodeSideAuthResult : !upstreamResourceAuthResult.isAuth ? upstreamResourceAuthResult : clientUserSideAuthResult;
    }

    /**
     * 展品节点侧以及上游授权结果
     * @param presentableInfo
     * @param presentableAuthTree
     */
    async presentableNodeSideAndUpstreamAuth(presentableInfo: PresentableInfo, presentableAuthTree: FlattenPresentableAuthTree[]): Promise<SubjectAuthResult> {
        const nodeSideAuthResult = await this.presentableNodeSideAuth(presentableInfo, presentableAuthTree);
        if (!nodeSideAuthResult.isAuth) {
            return nodeSideAuthResult;
        }
        const upstreamResourceAuthResult = await this.presentableUpstreamAuth(presentableInfo, presentableAuthTree);
        return !upstreamResourceAuthResult.isAuth ? upstreamResourceAuthResult : nodeSideAuthResult;
    }

    /**
     * 展品节点侧授权(节点自己解决的资源以及上抛的授权情况)
     * @param presentableInfo
     * @param presentableAuthTree
     */
    async presentableNodeSideAuth(presentableInfo: PresentableInfo, presentableAuthTree: FlattenPresentableAuthTree[]): Promise<SubjectAuthResult> {

        const startDate = new Date();
        const authResult = new SubjectAuthResult();
        try {
            // 授权树是指定版本的实际依赖推导出来的.所以上抛了但是实际未使用的资源不会体现在授权树分支中.
            const presentableResolveResourceIdSet = new Set(presentableAuthTree.filter(x => x.deep === 1).map(x => x.resourceId));
            // 过滤排除掉节点解决的资源,但是实际又未使用的.此部分不影响授权结果.
            const toBeAuthorizedResources = presentableInfo.resolveResources.filter(x => presentableResolveResourceIdSet.has(x.resourceId));

            const allNodeContractIds = chain(toBeAuthorizedResources).map(x => x.contracts).flattenDeep().map(x => x.contractId).value();

            const contractMap = await this.outsideApiService.getContractByContractIds(allNodeContractIds, {
                licenseeId: presentableInfo.nodeId, projection: 'contractId,subjectId,subjectType,authStatus'
            }).then(list => {
                return new Map(list.map(x => [x.contractId, x]));
            });

            const authFailedResources = toBeAuthorizedResources.filter(resolveResource => {
                const contracts = resolveResource.contracts.map(x => contractMap.get(x.contractId));
                // const currentAuthTreeNode = presentableAuthTree.find(x => x.deep === 1 && x.resourceId === resolveResource.resourceId);
                // currentAuthTreeNode.authContractIds = resolveResource.contracts.map(x => x.contractId);
                return !this.contractAuth(resolveResource.resourceId, contracts).isAuth;
            });

            this.ctx.set('presentableNodeSideAuthTime', (new Date().getTime() - startDate.getTime()).toString());
            if (!isEmpty(authFailedResources)) {
                return authResult.setAuthCode(SubjectAuthCodeEnum.SubjectContractUnauthorized).setErrorMsg('展品所解决的资源授权不通过').setData({authFailedResources}).setDefaulterIdentityType(DefaulterIdentityTypeEnum.Node);
            }
            return authResult.setAuthCode(SubjectAuthCodeEnum.BasedOnContractAuthorized);
        } catch (e) {
            return authResult.setErrorMsg(e.toString()).setAuthCode(SubjectAuthCodeEnum.AuthApiException).setReferee(SubjectTypeEnum.Presentable).setDefaulterIdentityType(DefaulterIdentityTypeEnum.Node);
        }
    }

    /**
     * 展品上游合约授权(通过授权树获取对应的合约的授权状态即可直接判定,无需调用标的物的授权API)
     * @param presentableInfo
     * @param presentableAuthTree
     */
    async presentableUpstreamAuth(presentableInfo: PresentableInfo, presentableAuthTree: FlattenPresentableAuthTree[]): Promise<SubjectAuthResult> {

        const authResult = new SubjectAuthResult();
        try {
            const resourceVersionIds = chain(presentableAuthTree).map(x => x.versionId).uniq().value();
            if (isEmpty(resourceVersionIds)) {
                throw new ApplicationError('presentable data has loused');
            }
            const startDate = new Date();
            const resourceVersionAuthResults = await this.outsideApiService.getResourceVersionAuthResults(resourceVersionIds, {authType: 'auth'});
            this.ctx.set('presentableUpstreamAuthTime', (new Date().getTime() - startDate.getTime()).toString());
            for (const resourceVersionAuthResult of resourceVersionAuthResults) {
                const {versionId, resolveResourceAuthResults} = resourceVersionAuthResult;
                if (isEmpty(resourceVersionAuthResults)) {
                    continue;
                }
                const nids = presentableAuthTree.filter(x => x.versionId === versionId).map(x => x.nid);
                const practicalUsedResources = presentableAuthTree.filter(x => nids.includes(x.parentNid));
                const authFailedResources = chain(resolveResourceAuthResults).intersectionBy(practicalUsedResources, 'resourceId').filter(x => !x.authResult?.isAuth).value();
                if (!isEmpty(authFailedResources)) {
                    return authResult.setAuthCode(SubjectAuthCodeEnum.SubjectContractUnauthorized).setData({authFailedResources}).setDefaulterIdentityType(DefaulterIdentityTypeEnum.Resource).setErrorMsg('展品上游链路授权未通过');
                }
            }
            return authResult.setAuthCode(SubjectAuthCodeEnum.BasedOnContractAuthorized);
        } catch (e) {
            return authResult.setErrorMsg(e.toString()).setAuthCode(SubjectAuthCodeEnum.AuthApiException).setReferee(SubjectTypeEnum.Presentable).setDefaulterIdentityType(DefaulterIdentityTypeEnum.Resource);
        }
    }

    /**
     *  展品C端用户侧授权(自动查找当前登录用户与展品之间的合约,如果无合约,需要根据需求做免费策略校验.然后登录用户自动签约免费策略,非登录用户直接通过授权)
     * @param presentableInfo
     */
    async presentableClientUserSideAuth(presentableInfo: PresentableInfo): Promise<SubjectAuthResult> {
        // return new SubjectAuthResult().setAuthCode(SubjectAuthCodeEnum.BasedOnNullIdentityPolicyAuthorized);
        try {
            if (!this.ctx.isLoginUser()) {
                return this._unLoginUserPolicyAuth(presentableInfo);
            }
            return this._loginUserContractAuth(presentableInfo, this.ctx.identityInfo.userInfo);
        } catch (e) {
            return new SubjectAuthResult().setData({error: e}).setErrorMsg(e.toString()).setAuthCode(SubjectAuthCodeEnum.AuthApiException).setReferee(SubjectTypeEnum.Presentable);
        }
    }

    /**
     * 根据合同计算授权结果
     * @param subjectId
     * @param contracts
     */
    contractAuth(subjectId: string, contracts: ContractInfo[]): SubjectAuthResult {

        const authResult = new SubjectAuthResult();
        if (!isArray(contracts) || isEmpty(contracts)) {
            return authResult.setAuthCode(SubjectAuthCodeEnum.SubjectContractNotFound);
        }

        const invalidContracts = contracts.filter(x => x.subjectId !== subjectId);
        if (!isEmpty(invalidContracts)) {
            return authResult.setErrorMsg('存在无效的标的物合约').setData({invalidContracts}).setAuthCode(SubjectAuthCodeEnum.SubjectContractInvalid);
        }
        if (!contracts.some(x => x.isAuth)) {
            return authResult.setErrorMsg('合约授权未通过').setAuthCode(SubjectAuthCodeEnum.SubjectContractUnauthorized);
        }

        return authResult.setAuthCode(SubjectAuthCodeEnum.BasedOnContractAuthorized);
    }

    /**
     * 未登录用户授权(看是否有免费策略)
     */
    _unLoginUserPolicyAuth(presentableInfo: PresentableInfo): SubjectAuthResult {

        const hasFreePolicy = presentableInfo.policies.some(x => x.status === 1 && this.policyHelper.isFreePolicy(x));
        if (hasFreePolicy) {
            return new SubjectAuthResult().setAuthCode(SubjectAuthCodeEnum.BasedOnNullIdentityPolicyAuthorized).setReferee(SubjectTypeEnum.Presentable);
        }

        return new SubjectAuthResult().setData({
            presentableId: presentableInfo.presentableId,
            presentableName: presentableInfo.presentableName,
            policies: presentableInfo.policies,
            contracts: []
        }).setErrorMsg('未登录的用户').setAuthCode(SubjectAuthCodeEnum.UserUnauthenticated).setReferee(SubjectTypeEnum.Presentable).setDefaulterIdentityType(DefaulterIdentityTypeEnum.ClientUser);
    }

    /**
     * 用户合同授权
     * @param presentableInfo
     * @param userInfo
     */
    async _loginUserContractAuth(presentableInfo: PresentableInfo, userInfo: FreelogUserInfo): Promise<SubjectAuthResult> {

        const contracts = await this.outsideApiService.getUserPresentableContracts(presentableInfo.presentableId, presentableInfo.nodeId, userInfo.userId, {projection: 'authStatus,status,subjectId,policyId,contractName,fsmCurrentState'});
        const contractAuthResult = await this.contractAuth(presentableInfo.presentableId, contracts);
        if (!contractAuthResult.isAuth) {
            contractAuthResult.setReferee(SubjectTypeEnum.Presentable).setDefaulterIdentityType(DefaulterIdentityTypeEnum.ClientUser).setData({
                presentableId: presentableInfo.presentableId,
                presentableName: presentableInfo.presentableName,
                policies: presentableInfo.policies, contracts
            });
        }
        return contractAuthResult;

        // 先屏蔽自动签约免费策略的功能,方便前端做调试
        // return this._tryCreateFreeUserContract(presentableInfo, userInfo);
    }

    /**
     * 尝试创建免费合同
     * @param presentableInfo
     * @param userInfo
     */
    async _tryCreateFreeUserContract(presentableInfo: PresentableInfo, userInfo: FreelogUserInfo) {
        const freePolicy = presentableInfo.policies.find(x => x.status === 1 && this.policyHelper.isFreePolicy(x));
        // 如果没有免费策略,则直接返回找不到合约即可
        if (!freePolicy) {
            return new SubjectAuthResult().setErrorMsg('标的物未签约').setAuthCode(SubjectAuthCodeEnum.SubjectContractNotFound).setReferee(SubjectTypeEnum.Presentable).setDefaulterIdentityType(DefaulterIdentityTypeEnum.ClientUser);
        }

        await this.outsideApiService.signUserPresentableContract(userInfo.userId, {
            subjectId: presentableInfo.presentableId,
            policyId: freePolicy.policyId
        });

        return new SubjectAuthResult(SubjectAuthCodeEnum.BasedOnContractAuthorized);
    }
}
