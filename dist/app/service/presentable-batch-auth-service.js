"use strict";
// import {inject, provide} from 'midway';
// import {
//     ContractInfo, ExhibitInsideAuthInfo, ExhibitInsideAuthNode,
//     FlattenPresentableAuthTree,
//     IOutsideApiService,
//     PresentableInfo
// } from '../../interface';
// import {chain, isArray, isEmpty} from 'lodash';
// import {
//     ApplicationError,
//     FreelogContext,
//     FreelogUserInfo,
//     SubjectAuthCodeEnum,
//     SubjectTypeEnum
// } from 'egg-freelog-base';
// import {DefaulterIdentityTypeEnum, SubjectAuthResult} from '../../auth-interface';
// import {PolicyHelper} from '../../extend/policy-helper';
//
// @provide()
// export class PresentableBatchAuthService {
//
//     @inject()
//     ctx: FreelogContext;
//     @inject()
//     policyHelper: PolicyHelper;
//     @inject()
//     outsideApiService: IOutsideApiService;
//
//
//     /**
//      * 多展品全链路授权
//      * @param presentables
//      * @param presentableAuthTreeMap
//      */
//     async presentableAllChainAuth(presentables: PresentableInfo[], presentableAuthTreeMap: Map<string, FlattenPresentableAuthTree[]>) {
//
//     }
//
//
//     /**
//      * 展品节点侧和上游链路授权
//      * @param presentables
//      * @param presentableAuthTreeMap
//      */
//     async presentableNodeSideAndUpstreamAuth(presentables: PresentableInfo[], presentableAuthTreeMap: Map<string, FlattenPresentableAuthTree[]>) {
//         const exhibitInsideAuthMap = new Map<string, ExhibitInsideAuthNode[]>();
//         for (const [presentableId, authTree] of presentableAuthTreeMap) {
//             const exhibitInsideAuthNodes: ExhibitInsideAuthNode[] = [];
//             for (const authItem of authTree) {
//                 const roleType =
//                 exhibitInsideAuthNodes.push({
//                     resourceId: authItem.resourceId,
//                     versionId: authItem.version,
//                     roleType: authItem.deep === 1 ? 'node' : 'resource'
//                 });
//             }
//             exhibitInsideAuthMap.set(presentableId, exhibitInsideAuthNodes);
//         }
//     }
//
//     /**
//      * 展品授权,包括三部分(1.C端用户授权 2:节点自身合约授权 3:展品上游资源授权)
//      * @param presentableInfo
//      * @param presentableAuthTree
//      */
//     async presentableAuth(presentableInfo: PresentableInfo, presentableAuthTree: FlattenPresentableAuthTree[]): Promise<SubjectAuthResult> {
//         const clientUserSideAuthResult = await this.presentableClientUserSideAuth(presentableInfo);
//         if (!clientUserSideAuthResult.isAuth) {
//             return clientUserSideAuthResult;
//         }
//
//         const nodeSideAuthTask = this.presentableNodeSideAuth(presentableInfo, presentableAuthTree);
//         const upstreamResourceAuthTask = this.presentableUpstreamAuth(presentableInfo, presentableAuthTree);
//
//         const [nodeSideAuthResult, upstreamResourceAuthResult] = await Promise.all([nodeSideAuthTask, upstreamResourceAuthTask]);
//
//         return !nodeSideAuthResult.isAuth ? nodeSideAuthResult : !upstreamResourceAuthResult.isAuth ? upstreamResourceAuthResult : clientUserSideAuthResult; // clientUserSideAuthResult;
//     }
//
//     /**
//      * 展品节点侧以及上游授权结果
//      * @param presentableInfo
//      * @param presentableAuthTree
//      */
//     async presentableNodeSideAndUpstreamAuth(presentableInfo: PresentableInfo, presentableAuthTree: FlattenPresentableAuthTree[]): Promise<SubjectAuthResult> {
//
//         const nodeSideAuthTask = this.presentableNodeSideAuth(presentableInfo, presentableAuthTree);
//         const upstreamResourceAuthTask = this.presentableUpstreamAuth(presentableInfo, presentableAuthTree);
//
//         const [nodeSideAuthResult, upstreamResourceAuthResult] = await Promise.all([nodeSideAuthTask, upstreamResourceAuthTask]);
//         return !nodeSideAuthResult.isAuth ? nodeSideAuthResult : upstreamResourceAuthResult;
//     }
//
//     /**
//      * 展品节点侧授权(节点自己解决的资源以及上抛的授权情况)
//      * @param presentableInfo
//      * @param presentableAuthTree
//      */
//     async presentableNodeSideAuth(presentableInfo: PresentableInfo, presentableAuthTree: FlattenPresentableAuthTree[]): Promise<SubjectAuthResult> {
//
//         const startDate = new Date();
//         const authResult = new SubjectAuthResult();
//         try {
//             // 授权树是指定版本的实际依赖推导出来的.所以上抛了但是实际未使用的资源不会体现在授权树分支中.
//             const presentableResolveResourceIdSet = new Set(presentableAuthTree.filter(x => x.deep === 1).map(x => x.resourceId));
//             // 过滤排除掉节点解决的资源,但是实际又未使用的.此部分不影响授权结果.
//             const toBeAuthorizedResources = presentableInfo.resolveResources.filter(x => presentableResolveResourceIdSet.has(x.resourceId));
//
//             const allNodeContractIds = chain(toBeAuthorizedResources).map(x => x.contracts).flattenDeep().map(x => x.contractId).value();
//
//             const contractMap = await this.outsideApiService.getContractByContractIds(allNodeContractIds, {
//                 licenseeId: presentableInfo.nodeId, projection: 'contractId,subjectId,subjectType,authStatus'
//             }).then(list => {
//                 return new Map(list.map(x => [x.contractId, x]));
//             });
//
//             const authFailedResources = toBeAuthorizedResources.filter(resolveResource => {
//                 const contracts = resolveResource.contracts.map(x => contractMap.get(x.contractId));
//                 // const currentAuthTreeNode = presentableAuthTree.find(x => x.deep === 1 && x.resourceId === resolveResource.resourceId);
//                 // currentAuthTreeNode.authContractIds = resolveResource.contracts.map(x => x.contractId);
//                 return !this.contractAuth(resolveResource.resourceId, contracts).isAuth;
//             });
//
//             this.ctx.set('presentableNodeSideAuthTime', (new Date().getTime() - startDate.getTime()).toString());
//             if (!isEmpty(authFailedResources)) {
//                 return authResult.setAuthCode(SubjectAuthCodeEnum.SubjectContractUnauthorized).setErrorMsg('展品所解决的资源授权不通过').setData({authFailedResources}).setDefaulterIdentityType(DefaulterIdentityTypeEnum.Node);
//             }
//             return authResult.setAuthCode(SubjectAuthCodeEnum.BasedOnContractAuthorized);
//         } catch (e) {
//             return authResult.setErrorMsg(e.toString()).setAuthCode(SubjectAuthCodeEnum.AuthApiException).setReferee(SubjectTypeEnum.Presentable).setDefaulterIdentityType(DefaulterIdentityTypeEnum.Node);
//         }
//     }
//
//     /**
//      * 展品上游合约授权(通过授权树获取对应的合约的授权状态即可直接判定,无需调用标的物的授权API)
//      * @param presentableInfo
//      * @param presentableAuthTree
//      */
//     async presentableUpstreamAuth(presentableInfo: PresentableInfo, presentableAuthTree: FlattenPresentableAuthTree[]): Promise<SubjectAuthResult> {
//
//         const authResult = new SubjectAuthResult();
//         try {
//             const resourceVersionIds = chain(presentableAuthTree).map(x => x.versionId).uniq().value();
//             if (isEmpty(resourceVersionIds)) {
//                 throw new ApplicationError('presentable data has loused');
//             }
//             const startDate = new Date();
//             const resourceVersionAuthResults = await this.outsideApiService.getResourceVersionAuthResults(resourceVersionIds, {authType: 'auth'});
//             this.ctx.set('presentableUpstreamAuthTime', (new Date().getTime() - startDate.getTime()).toString());
//             for (const resourceVersionAuthResult of resourceVersionAuthResults) {
//                 const {versionId, resolveResourceAuthResults} = resourceVersionAuthResult;
//                 if (isEmpty(resourceVersionAuthResults)) {
//                     continue;
//                 }
//                 const nids = presentableAuthTree.filter(x => x.versionId === versionId).map(x => x.nid);
//                 const practicalUsedResources = presentableAuthTree.filter(x => nids.includes(x.parentNid));
//                 const authFailedResources = chain(resolveResourceAuthResults).intersectionBy(practicalUsedResources, 'resourceId').filter(x => !x.authResult?.isAuth).value();
//                 if (!isEmpty(authFailedResources)) {
//                     return authResult.setAuthCode(SubjectAuthCodeEnum.SubjectContractUnauthorized).setData({authFailedResources}).setDefaulterIdentityType(DefaulterIdentityTypeEnum.Resource).setErrorMsg('展品上游链路授权未通过');
//                 }
//             }
//             return authResult.setAuthCode(SubjectAuthCodeEnum.BasedOnContractAuthorized);
//         } catch (e) {
//             return authResult.setErrorMsg(e.toString()).setAuthCode(SubjectAuthCodeEnum.AuthApiException).setReferee(SubjectTypeEnum.Presentable).setDefaulterIdentityType(DefaulterIdentityTypeEnum.Resource);
//         }
//     }
//
//     /**
//      *  展品C端用户侧授权(自动查找当前登录用户与展品之间的合约,如果无合约,需要根据需求做免费策略校验.然后登录用户自动签约免费策略,非登录用户直接通过授权)
//      * @param presentableInfo
//      */
//     async presentableClientUserSideAuth(presentableInfo: PresentableInfo): Promise<SubjectAuthResult> {
//         // return new SubjectAuthResult().setAuthCode(SubjectAuthCodeEnum.BasedOnNullIdentityPolicyAuthorized);
//         try {
//             if (!this.ctx.isLoginUser()) {
//                 return this._unLoginUserPolicyAuth(presentableInfo);
//             }
//             return this._loginUserContractAuth(presentableInfo, this.ctx.identityInfo.userInfo);
//         } catch (e) {
//             return new SubjectAuthResult().setData({error: e}).setErrorMsg(e.toString()).setAuthCode(SubjectAuthCodeEnum.AuthApiException).setReferee(SubjectTypeEnum.Presentable);
//         }
//     }
//
//     /**
//      * 根据合同计算授权结果
//      * @param subjectId
//      * @param contracts
//      */
//     contractAuth(subjectId: string, contracts: ContractInfo[]): SubjectAuthResult {
//
//         const authResult = new SubjectAuthResult();
//         if (!isArray(contracts) || isEmpty(contracts)) {
//             return authResult.setAuthCode(SubjectAuthCodeEnum.SubjectContractNotFound);
//         }
//
//         const invalidContracts = contracts.filter(x => x.subjectId !== subjectId);
//         if (!isEmpty(invalidContracts)) {
//             return authResult.setErrorMsg('存在无效的标的物合约').setData({invalidContracts}).setAuthCode(SubjectAuthCodeEnum.SubjectContractInvalid);
//         }
//         if (!contracts.some(x => x.isAuth)) {
//             return authResult.setErrorMsg('合约授权未通过').setAuthCode(SubjectAuthCodeEnum.SubjectContractUnauthorized);
//         }
//
//         return authResult.setAuthCode(SubjectAuthCodeEnum.BasedOnContractAuthorized);
//     }
//
//     /**
//      * 未登录用户授权(看是否有免费策略)
//      */
//     _unLoginUserPolicyAuth(presentableInfo: PresentableInfo): SubjectAuthResult {
//
//         const hasFreePolicy = presentableInfo.policies.some(x => x.status === 1 && this.policyHelper.isFreePolicy(x));
//         if (hasFreePolicy) {
//             return new SubjectAuthResult().setAuthCode(SubjectAuthCodeEnum.BasedOnNullIdentityPolicyAuthorized).setReferee(SubjectTypeEnum.Presentable);
//         }
//
//         return new SubjectAuthResult().setData({
//             presentableId: presentableInfo.presentableId,
//             presentableName: presentableInfo.presentableName,
//             policies: presentableInfo.policies,
//             contracts: []
//         }).setErrorMsg('未登录的用户').setAuthCode(SubjectAuthCodeEnum.UserUnauthenticated).setReferee(SubjectTypeEnum.Presentable).setDefaulterIdentityType(DefaulterIdentityTypeEnum.ClientUser);
//     }
//
//     /**
//      * 用户合同授权
//      * @param presentableInfo
//      * @param userInfo
//      */
//     async _loginUserContractAuth(presentableInfo: PresentableInfo, userInfo: FreelogUserInfo): Promise<SubjectAuthResult> {
//
//         const contracts = await this.outsideApiService.getUserPresentableContracts(presentableInfo.presentableId, presentableInfo.nodeId, userInfo.userId, {projection: 'authStatus,status,subjectId,policyId,contractName,fsmCurrentState'});
//         if (!isEmpty(contracts)) {
//             const contractAuthResult = await this.contractAuth(presentableInfo.presentableId, contracts);
//             if (!contractAuthResult.isAuth) {
//                 contractAuthResult.setReferee(SubjectTypeEnum.Presentable).setDefaulterIdentityType(DefaulterIdentityTypeEnum.ClientUser).setData({
//                     presentableId: presentableInfo.presentableId,
//                     presentableName: presentableInfo.presentableName,
//                     policies: presentableInfo.policies, contracts
//                 });
//             }
//             return contractAuthResult;
//         }
//         // 先屏蔽自动签约免费策略的功能,方便前端做调试
//         return this._tryCreateFreeUserContract(presentableInfo, userInfo);
//     }
//
//     /**
//      * 尝试创建免费合同
//      * @param presentableInfo
//      * @param userInfo
//      */
//     async _tryCreateFreeUserContract(presentableInfo: PresentableInfo, userInfo: FreelogUserInfo) {
//         const freePolicy = presentableInfo.policies.find(x => x.status === 1 && this.policyHelper.isFreePolicy(x));
//         // 如果没有免费策略,则直接返回找不到合约即可
//         if (!freePolicy) {
//             return new SubjectAuthResult().setErrorMsg('标的物未签约').setAuthCode(SubjectAuthCodeEnum.SubjectContractNotFound).setReferee(SubjectTypeEnum.Presentable).setDefaulterIdentityType(DefaulterIdentityTypeEnum.ClientUser);
//         }
//
//         await this.outsideApiService.signUserPresentableContract(userInfo.userId, {
//             subjectId: presentableInfo.presentableId,
//             policyId: freePolicy.policyId
//         });
//
//         return new SubjectAuthResult(SubjectAuthCodeEnum.BasedOnContractAuthorized);
//     }
// }
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlc2VudGFibGUtYmF0Y2gtYXV0aC1zZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2FwcC9zZXJ2aWNlL3ByZXNlbnRhYmxlLWJhdGNoLWF1dGgtc2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsMENBQTBDO0FBQzFDLFdBQVc7QUFDWCxrRUFBa0U7QUFDbEUsa0NBQWtDO0FBQ2xDLDBCQUEwQjtBQUMxQixzQkFBc0I7QUFDdEIsNEJBQTRCO0FBQzVCLGtEQUFrRDtBQUNsRCxXQUFXO0FBQ1gsd0JBQXdCO0FBQ3hCLHNCQUFzQjtBQUN0Qix1QkFBdUI7QUFDdkIsMkJBQTJCO0FBQzNCLHNCQUFzQjtBQUN0Qiw2QkFBNkI7QUFDN0IscUZBQXFGO0FBQ3JGLDJEQUEyRDtBQUMzRCxFQUFFO0FBQ0YsYUFBYTtBQUNiLDZDQUE2QztBQUM3QyxFQUFFO0FBQ0YsZ0JBQWdCO0FBQ2hCLDJCQUEyQjtBQUMzQixnQkFBZ0I7QUFDaEIsa0NBQWtDO0FBQ2xDLGdCQUFnQjtBQUNoQiw2Q0FBNkM7QUFDN0MsRUFBRTtBQUNGLEVBQUU7QUFDRixVQUFVO0FBQ1Ysa0JBQWtCO0FBQ2xCLDZCQUE2QjtBQUM3Qix1Q0FBdUM7QUFDdkMsVUFBVTtBQUNWLDBJQUEwSTtBQUMxSSxFQUFFO0FBQ0YsUUFBUTtBQUNSLEVBQUU7QUFDRixFQUFFO0FBQ0YsVUFBVTtBQUNWLHNCQUFzQjtBQUN0Qiw2QkFBNkI7QUFDN0IsdUNBQXVDO0FBQ3ZDLFVBQVU7QUFDVixxSkFBcUo7QUFDckosbUZBQW1GO0FBQ25GLDRFQUE0RTtBQUM1RSwwRUFBMEU7QUFDMUUsaURBQWlEO0FBQ2pELG1DQUFtQztBQUNuQyxnREFBZ0Q7QUFDaEQsdURBQXVEO0FBQ3ZELG1EQUFtRDtBQUNuRCwwRUFBMEU7QUFDMUUsc0JBQXNCO0FBQ3RCLGdCQUFnQjtBQUNoQiwrRUFBK0U7QUFDL0UsWUFBWTtBQUNaLFFBQVE7QUFDUixFQUFFO0FBQ0Ys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