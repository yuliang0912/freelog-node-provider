import {inject, provide} from 'midway';
import {
    IOutsideApiService,
    IPresentableAuthService,
    IPresentableService,
    IPresentableVersionService,
    ContractInfo, PresentableInfo,
    FlattenPresentableAuthTree,
    UserInfo
} from '../../interface';
import {chain, isArray, isEmpty} from 'lodash';
import {SubjectTypeEnum} from "../../enum";
import {SubjectAuthCodeEnum, SubjectAuthResult} from "../../auth-interface";
import {ApplicationError} from 'egg-freelog-base';

@provide()
export class PresentableAuthService implements IPresentableAuthService {

    @inject()
    ctx;
    @inject()
    outsideApiService: IOutsideApiService;
    @inject()
    presentableService: IPresentableService;
    @inject()
    presentableVersionService: IPresentableVersionService;

    /**
     * 展品授权,包括三部分(1.C端用户授权 2:节点自身合约授权 3:展品上游资源授权)
     * @param presentableInfo
     */
    async presentableAuth(presentableInfo: PresentableInfo, presentableVersionAuthTree: FlattenPresentableAuthTree[]): Promise<SubjectAuthResult> {

        const clientUserSideAuthResult = await this.presentableClientUserSideAuth(presentableInfo);
        if (!clientUserSideAuthResult.isAuth) {
            return clientUserSideAuthResult;
        }

        const presentableNodeSideAuthResult = await this.presentableNodeSideAuth(presentableInfo, presentableVersionAuthTree);
        if (!presentableNodeSideAuthResult.isAuth) {
            return presentableNodeSideAuthResult;
        }

        const upstreamResourceAuthResult = await this.presentableUpstreamAuth(presentableInfo, presentableVersionAuthTree);
        if (!upstreamResourceAuthResult.isAuth) {
            return upstreamResourceAuthResult;
        }

        return clientUserSideAuthResult;
    }

    /**
     * 展品节点侧授权(节点自己解决的资源以及上抛的授权情况)
     * @param presentableInfo
     * @param presentableVersionAuthTree
     */
    async presentableNodeSideAuth(presentableInfo: PresentableInfo, presentableVersionAuthTree: FlattenPresentableAuthTree[]): Promise<SubjectAuthResult> {

        const authResult = new SubjectAuthResult();
        // 授权树是指定版本的实际依赖推导出来的.所以上抛了但是实际未使用的资源不会体现在授权树分支中.
        const presentableResolveResourceIdSet = new Set(presentableVersionAuthTree.filter(x => x.deep === 1).map(x => x.resourceId));
        // 过滤排除掉节点解决的资源,但是实际又未使用的.此部分不影响授权结果.
        const toBeAuthorizedResources = presentableInfo.resolveResources.filter(x => presentableResolveResourceIdSet.has(x.resourceId));

        const allNodeContractIds = chain(toBeAuthorizedResources).map(x => x.contracts).flattenDeep().map(x => x.contractId).value();

        const contractMap = await this.outsideApiService.getContractByContractIds(allNodeContractIds, {
            licenseeId: presentableInfo.nodeId, projection: 'subjectId subjectType authStatus'
        }).then(list => {
            return new Map(list.map(x => [x.contractId, x]));
        });

        const authFailedResources = toBeAuthorizedResources.filter(resolveResource => {
            const contracts = resolveResource.contracts.map(x => contractMap.get(x.contractId));
            // const currentAuthTreeNode = presentableVersionAuthTree.find(x => x.deep === 1 && x.resourceId === resolveResource.resourceId);
            // currentAuthTreeNode.authContractIds = resolveResource.contracts.map(x => x.contractId);
            return !this.contractAuth(resolveResource.resourceId, contracts).isAuth;
        });

        if (!isEmpty(authFailedResources)) {
            return authResult.setAuthCode(SubjectAuthCodeEnum.SubjectContractUnauthorized).setErrorMsg('展品所解决的资源授权不通过').setData({authFailedResources});
        }

        return authResult.setAuthCode(SubjectAuthCodeEnum.BasedOnContractAuthorized);
    }

    /**
     * 展品上游合约授权(通过授权树获取对应的合约的授权状态即可直接判定,无需调用标的物的授权API)
     * @param presentableInfo
     * @param presentableVersionAuthTree
     */
    async presentableUpstreamAuth(presentableInfo: PresentableInfo, presentableVersionAuthTree: FlattenPresentableAuthTree[]): Promise<SubjectAuthResult> {

        const authResult = new SubjectAuthResult();
        const resourceVersionIds = chain(presentableVersionAuthTree).map(x => x.versionId).uniq().value();
        if (isEmpty(resourceVersionIds)) {
            throw new ApplicationError('presentable data has loused');
        }

        const resourceVersionAuthResults = await this.outsideApiService.getResourceVersionAuthResults(resourceVersionIds);

        for (const resourceVersionAuthResult of resourceVersionAuthResults) {
            const {versionId, resolveResourceAuthResults} = resourceVersionAuthResult;
            if (isEmpty(resourceVersionAuthResults)) {
                continue;
            }
            const nids = presentableVersionAuthTree.filter(x => x.versionId === versionId).map(x => x.nid);
            const practicalUsedResources = presentableVersionAuthTree.filter(x => nids.includes(x.parentNid));
            const authFailedResources = chain(resolveResourceAuthResults).intersectionBy(practicalUsedResources, 'resourceId').filter(x => !x.authResult?.isAuth).value();
            if (!isEmpty(authFailedResources)) {
                return authResult.setAuthCode(SubjectAuthCodeEnum.SubjectContractUnauthorized).setData({authFailedResources}).setErrorMsg('展品上游链路授权未通过');
            }
        }

        return authResult.setAuthCode(SubjectAuthCodeEnum.BasedOnContractAuthorized);
    }

    /**
     *  展品C端用户侧授权(自动查找当前登录用户与展品之间的合约,如果无合约,需要根据需求做免费策略校验.然后登录用户自动签约免费策略,非登录用户直接通过授权)
     * @param presentableInfo
     */
    async presentableClientUserSideAuth(presentableInfo: PresentableInfo): Promise<SubjectAuthResult> {
        return this._loginUserContractAuth(presentableInfo, this.ctx.userInfo);
    }

    /**
     * 根据合同计算授权结果
     * @param subjectId
     * @param contracts
     */
    contractAuth(subjectId, contracts: ContractInfo[]): SubjectAuthResult {

        const authResult = new SubjectAuthResult();
        if (!isArray(contracts) || isEmpty(contracts)) {
            return authResult.setAuthCode(SubjectAuthCodeEnum.SubjectContractNotFound);
        }

        const invalidContracts = contracts.filter(x => x?.subjectType !== SubjectTypeEnum.Resource || x?.subjectId !== subjectId);
        if (!isEmpty(invalidContracts)) {
            return authResult.setErrorMsg('存在无效的标的物合约').setData({invalidContracts}).setAuthCode(SubjectAuthCodeEnum.SubjectContractInvalid);
        }

        const isExistAuthContracts = contracts.some(x => x.isAuth);
        if (!isExistAuthContracts) {
            return authResult.setErrorMsg('合约授权未通过').setAuthCode(SubjectAuthCodeEnum.SubjectContractUnauthorized);
        }

        return authResult.setAuthCode(SubjectAuthCodeEnum.BasedOnContractAuthorized);
    }

    /**
     * 用户合同授权
     * @param presentableInfo
     * @param userInfo
     */
    async _loginUserContractAuth(presentableInfo: PresentableInfo, userInfo: UserInfo): Promise<SubjectAuthResult> {

        const contracts = await this.outsideApiService.getUserPresentableContracts(presentableInfo.presentableId, presentableInfo.nodeId, userInfo.userId, {
            isDefault: 1,
            projection: 'authStatus'
        })

        if (!isEmpty(contracts)) {
            return this.contractAuth(presentableInfo.presentableId, contracts);
        }

        return this._tryCreateFreeUserContract(presentableInfo, userInfo);
    }

    /**
     * 尝试创建免费合同
     * @param presentableInfo
     * @param userInfo
     * @returns {Promise<void>}
     * @private
     */
    async _tryCreateFreeUserContract(presentableInfo: PresentableInfo, userInfo: UserInfo) {

        // 目前先通过
        return new SubjectAuthResult(SubjectAuthCodeEnum.SubjectContractNotFound).setAuthCode(SubjectAuthCodeEnum.BasedOnContractAuthorized);

        /**
         * TODO: 分析presentable策略中是否有免费策略,如果有,则签约.否则返回无授权
         */
        const contract = await this.outsideApiService.signUserPresentableContract(userInfo.userId, {
            subjectId: presentableInfo.presentableId,
            policyId: ''
        });

        return this.contractAuth(presentableInfo.presentableId, [contract]);
    }
}