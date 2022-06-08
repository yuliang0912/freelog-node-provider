import {inject, provide} from 'midway';
import {
    ContractInfo,
    ExhibitInsideAuthNode,
    FlattenPresentableAuthTree,
    IOutsideApiService,
    PresentableInfo
} from '../../interface';
import {
    FreelogContext, FreelogUserInfo, SubjectAuthCodeEnum, SubjectTypeEnum,
} from 'egg-freelog-base';
import {PolicyHelper} from '../../extend/policy-helper';
import {first, isArray, isEmpty, last, uniq} from 'lodash';
import {DefaulterIdentityTypeEnum, SubjectAuthResult} from '../../auth-interface';
import {PresentableService} from './presentable-service';

@provide()
export class PresentableBatchAuthService {

    @inject()
    ctx: FreelogContext;
    @inject()
    policyHelper: PolicyHelper;
    @inject()
    presentableService: PresentableService;
    @inject()
    outsideApiService: IOutsideApiService;
    start = Date.now();


    /**
     * 多展品全链路授权
     * @param presentables
     * @param presentableAuthTreeMap
     * @param authType 1:节点侧授权 2:上游侧授权  3:节点侧以及上游侧 4:全链路授权(含C端用户)
     */
    async batchPresentableAuth(presentables: PresentableInfo[], presentableAuthTreeMap: Map<string, FlattenPresentableAuthTree[]>, authType: 1 | 2 | 3 | 4) {
        let clientAuthTask = undefined;
        let nodeAndUpstreamAuthTask = this.batchPresentableNodeSideAndUpstreamAuth(presentables, presentableAuthTreeMap, authType as any);
        if (authType === 4) {
            clientAuthTask = this.batchPresentableClientUserSideAuth(presentables, presentableAuthTreeMap);
        }
        const results = await Promise.all([clientAuthTask, nodeAndUpstreamAuthTask]);
        const nodeAndUpstreamAuthResultMap = last<Map<string, SubjectAuthResult>>(results);
        if ([1, 2, 3].includes(authType)) {
            return new Map<string, SubjectAuthResult>(presentables.map(presentableInfo => {
                return [presentableInfo.presentableId, nodeAndUpstreamAuthResultMap.get(presentableInfo.presentableId)];
            }));
        }

        const clientAuthResultMap = first<Map<string, SubjectAuthResult>>(results);
        const authResultMap = new Map<string, SubjectAuthResult>();
        for (const presentableInfo of presentables) {
            const clientAuthResult = clientAuthResultMap.get(presentableInfo.presentableId);
            const nodeAndUpstreamAuthResult = nodeAndUpstreamAuthResultMap.get(presentableInfo.presentableId);
            if (!clientAuthResult.isAuth && !nodeAndUpstreamAuthResult.isAuth) {
                clientAuthResult.setDefaulterIdentityType(clientAuthResult.defaulterIdentityType | nodeAndUpstreamAuthResult.defaulterIdentityType);
                authResultMap.set(presentableInfo.presentableId, clientAuthResult);
            } else if (!nodeAndUpstreamAuthResult.isAuth) {
                authResultMap.set(presentableInfo.presentableId, nodeAndUpstreamAuthResult);
            } else {
                authResultMap.set(presentableInfo.presentableId, clientAuthResult);
            }
        }
        return authResultMap;
    }

    /**
     * 展品节点侧和上游链路授权
     * @param presentables
     * @param presentableAuthTreeMap
     * @param authType 1:节点侧授权 2:上游侧授权  3:节点侧以及上游侧
     */
    async batchPresentableNodeSideAndUpstreamAuth(presentables: PresentableInfo[], presentableAuthTreeMap: Map<string, FlattenPresentableAuthTree[]>, authType: 1 | 2 | 3) {
        const exhibitInsideAuthMap = new Map<string, ExhibitInsideAuthNode[]>();
        const presentableMap = new Map(presentables.map(x => [x.presentableId, x]));
        for (const [presentableId, authTree] of presentableAuthTreeMap) {
            const exhibitInsideAuthNodes: ExhibitInsideAuthNode[] = [];
            const presentableInfo = presentableMap.get(presentableId);
            for (const authItem of authTree) {
                const isNodeResolve = authItem.deep === 1;
                const resolveVersionId = isNodeResolve ? '' : authTree.find(x => x.nid === authItem.parentNid).versionId;
                exhibitInsideAuthNodes.push({
                    resourceId: authItem.resourceId,
                    versionId: authItem.version,
                    resolveVersionId: resolveVersionId,
                    roleType: isNodeResolve ? DefaulterIdentityTypeEnum.Node : DefaulterIdentityTypeEnum.Resource,
                    contractIds: isNodeResolve ? presentableInfo.resolveResources.find(x => x.resourceId === authItem.resourceId).contracts.map(x => x.contractId) : [],
                });
            }
            if (authType === 1) {
                exhibitInsideAuthMap.set(presentableId, exhibitInsideAuthNodes.filter(x => x.roleType === DefaulterIdentityTypeEnum.Node));
            } else if (authType === 2) {
                exhibitInsideAuthMap.set(presentableId, exhibitInsideAuthNodes.filter(x => x.roleType === DefaulterIdentityTypeEnum.Resource));
            } else {
                exhibitInsideAuthMap.set(presentableId, exhibitInsideAuthNodes);
            }
        }
        const resourceAuthNodes = [...exhibitInsideAuthMap.values()].flat().filter(x => x.roleType === DefaulterIdentityTypeEnum.Resource);
        const resourceVersionMap = await this.outsideApiService.getResourceVersionList(resourceAuthNodes.map(x => x.versionId), {projection: 'versionId,resolveResources'}).then(list => {
            return new Map(list.map(x => [x.versionId, x.resolveResources]));
        });
        for (const authItem of resourceAuthNodes) {
            const resolveVersionInfo = resourceVersionMap.get(authItem.resolveVersionId);
            authItem.contractIds = resolveVersionInfo?.find(x => x.resourceId === authItem.resourceId).contracts.map(x => x.contractId) ?? [];
        }
        const allContractIds = uniq([...exhibitInsideAuthMap.values()].flat().map(x => x.contractIds).flat());
        const authedContractSet = await this.outsideApiService.getContractByContractIds(allContractIds, {
            authStatusList: '1,3',
            projection: 'contractId'
        }).then(list => {
            return new Set(list.map(x => x.contractId));
        });

        const authResultMap = new Map<string, SubjectAuthResult>();
        for (const [presentableId, insideAuthNode] of exhibitInsideAuthMap) {
            const subjectAuthResult = new SubjectAuthResult(SubjectAuthCodeEnum.BasedOnContractAuthorized).setReferee(SubjectTypeEnum.Presentable);
            const authFailedNodes = insideAuthNode.filter(item => isEmpty(item.contractIds) || !item.contractIds.some(x => authedContractSet.has(x)));
            if (!isEmpty(authFailedNodes)) {
                const defaulterIdentityType = uniq(authFailedNodes.map(x => x.roleType)).reduce((acc, current) => {
                    return current | acc;
                }, 0);
                subjectAuthResult.setAuthCode(SubjectAuthCodeEnum.SubjectContractUnauthorized).setData({authFailedResources: authFailedNodes.map(x => x.resourceId)}).setDefaulterIdentityType(defaulterIdentityType);
                if (defaulterIdentityType === (DefaulterIdentityTypeEnum.Node | DefaulterIdentityTypeEnum.Resource)) {
                    subjectAuthResult.setErrorMsg('展品在节点和资源链路上的授权均不通过');
                } else if (defaulterIdentityType === DefaulterIdentityTypeEnum.Node) {
                    subjectAuthResult.setErrorMsg('展品在节点链路上的授权不通过');
                } else {
                    subjectAuthResult.setErrorMsg('展品在资源链路上的授权不通过');
                }
            }
            authResultMap.set(presentableId, subjectAuthResult);
        }
        return authResultMap;
    }

    /**
     * 批量C端消费者授权
     * @param presentables
     * @param presentableAuthTreeMap
     */
    async batchPresentableClientUserSideAuth(presentables: PresentableInfo[], presentableAuthTreeMap: Map<string, FlattenPresentableAuthTree[]>) {
        const authResultMap = new Map<string, SubjectAuthResult>();
        presentables = await this.presentableService.fillPresentablePolicyInfo(presentables, true);
        // 未登录用户判定一下策略中是否含有免费策略,如果有,直接走策略授权模式
        if (!this.ctx.isLoginUser()) {
            for (const presentableInfo of presentables) {
                const authResult = new SubjectAuthResult();
                const hasFreePolicy = presentableInfo.policies.some(x => x.status === 1 && this.policyHelper.isFreePolicy(x));
                if (hasFreePolicy) {
                    authResult.setAuthCode(SubjectAuthCodeEnum.BasedOnNullIdentityPolicyAuthorized).setReferee(SubjectTypeEnum.Presentable);
                } else {
                    authResult.setData({
                        presentableId: presentableInfo.presentableId,
                        presentableName: presentableInfo.presentableName,
                        policies: presentableInfo.policies,
                        contracts: []
                    }).setErrorMsg('未登录的用户').setAuthCode(SubjectAuthCodeEnum.UserUnauthenticated).setReferee(SubjectTypeEnum.Presentable).setDefaulterIdentityType(DefaulterIdentityTypeEnum.ClientUser);
                }
                authResultMap.set(presentableInfo.presentableId, authResult);
            }
            return authResultMap;
        }
        // 登录用户需要获取合约进行授权对比
        const tasks = [];
        const contracts = await this.outsideApiService.getUserPresentableContracts(presentables.map(x => x.presentableId), this.ctx.userId, {projection: 'authStatus,status,subjectId,policyId,contractName,fsmCurrentState'});
        for (const presentableInfo of presentables) {
            const presentableContracts = contracts.filter(x => x.subjectId === presentableInfo.presentableId);
            if (!isEmpty(presentableContracts)) {
                const contractAuthResult = await this.contractAuth(presentableInfo.presentableId, presentableContracts);
                if (!contractAuthResult.isAuth) {
                    contractAuthResult.setReferee(SubjectTypeEnum.Presentable).setDefaulterIdentityType(DefaulterIdentityTypeEnum.ClientUser).setData({
                        presentableId: presentableInfo.presentableId,
                        presentableName: presentableInfo.presentableName,
                        policies: presentableInfo.policies, contracts: presentableContracts
                    }).setErrorMsg('消费者的合约授权不通过');
                }
                authResultMap.set(presentableInfo.presentableId, contractAuthResult);
            } else {
                // authResultMap.set(presentableInfo.presentableId, new SubjectAuthResult());
                tasks.push(this.tryCreateFreeUserContract(presentableInfo, this.ctx.identityInfo.userInfo).then(authResult => {
                    authResultMap.set(presentableInfo.presentableId, authResult);
                }));
            }
        }
        await Promise.all(tasks);
        return authResultMap;
    }

    /**
     * 尝试创建免费合同
     * @param presentableInfo
     * @param userInfo
     */
    async tryCreateFreeUserContract(presentableInfo: PresentableInfo, userInfo: FreelogUserInfo) {
        const freePolicy = presentableInfo.policies.find(x => x.status === 1 && this.policyHelper.isFreePolicy(x));
        // 如果没有免费策略,则直接返回找不到合约即可
        if (!freePolicy) {
            return new SubjectAuthResult().setErrorMsg('标的物未签约').setAuthCode(SubjectAuthCodeEnum.SubjectContractNotFound).setReferee(SubjectTypeEnum.Presentable).setDefaulterIdentityType(DefaulterIdentityTypeEnum.ClientUser);
        }

        this.outsideApiService.signUserPresentableContract(userInfo.userId, {
            subjectId: presentableInfo.presentableId,
            policyId: freePolicy.policyId
        }).catch(error => {
            // 如果签约出错,静默处理即可.无需影响业务正常流转(例如标的物已下线就不可签约)
        });

        return new SubjectAuthResult(SubjectAuthCodeEnum.BasedOnContractAuthorized);
    }

    /**
     * 根据合同计算授权结果
     * @param subjectId
     * @param contracts
     */
    private contractAuth(subjectId: string, contracts: ContractInfo[]): SubjectAuthResult {

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
}
