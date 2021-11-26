"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PresentableAuthService = void 0;
const midway_1 = require("midway");
const lodash_1 = require("lodash");
const egg_freelog_base_1 = require("egg-freelog-base");
const auth_interface_1 = require("../../auth-interface");
const policy_helper_1 = require("../../extend/policy-helper");
let PresentableAuthService = class PresentableAuthService {
    ctx;
    policyHelper;
    outsideApiService;
    /**
     * 展品授权,包括三部分(1.C端用户授权 2:节点自身合约授权 3:展品上游资源授权)
     * @param presentableInfo
     * @param presentableAuthTree
     */
    async presentableAuth(presentableInfo, presentableAuthTree) {
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
    async presentableNodeSideAndUpstreamAuth(presentableInfo, presentableAuthTree) {
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
    async presentableNodeSideAuth(presentableInfo, presentableAuthTree) {
        const startDate = new Date();
        const authResult = new auth_interface_1.SubjectAuthResult();
        try {
            // 授权树是指定版本的实际依赖推导出来的.所以上抛了但是实际未使用的资源不会体现在授权树分支中.
            const presentableResolveResourceIdSet = new Set(presentableAuthTree.filter(x => x.deep === 1).map(x => x.resourceId));
            // 过滤排除掉节点解决的资源,但是实际又未使用的.此部分不影响授权结果.
            const toBeAuthorizedResources = presentableInfo.resolveResources.filter(x => presentableResolveResourceIdSet.has(x.resourceId));
            const allNodeContractIds = lodash_1.chain(toBeAuthorizedResources).map(x => x.contracts).flattenDeep().map(x => x.contractId).value();
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
            if (!lodash_1.isEmpty(authFailedResources)) {
                return authResult.setAuthCode(egg_freelog_base_1.SubjectAuthCodeEnum.SubjectContractUnauthorized).setErrorMsg('展品所解决的资源授权不通过').setData({ authFailedResources }).setDefaulterIdentityType(auth_interface_1.DefaulterIdentityTypeEnum.Node);
            }
            return authResult.setAuthCode(egg_freelog_base_1.SubjectAuthCodeEnum.BasedOnContractAuthorized);
        }
        catch (e) {
            return authResult.setErrorMsg(e.toString()).setAuthCode(egg_freelog_base_1.SubjectAuthCodeEnum.AuthApiException).setReferee(egg_freelog_base_1.SubjectTypeEnum.Presentable).setDefaulterIdentityType(auth_interface_1.DefaulterIdentityTypeEnum.Node);
        }
    }
    /**
     * 展品上游合约授权(通过授权树获取对应的合约的授权状态即可直接判定,无需调用标的物的授权API)
     * @param presentableInfo
     * @param presentableAuthTree
     */
    async presentableUpstreamAuth(presentableInfo, presentableAuthTree) {
        const authResult = new auth_interface_1.SubjectAuthResult();
        try {
            const resourceVersionIds = lodash_1.chain(presentableAuthTree).map(x => x.versionId).uniq().value();
            if (lodash_1.isEmpty(resourceVersionIds)) {
                throw new egg_freelog_base_1.ApplicationError('presentable data has loused');
            }
            const startDate = new Date();
            const resourceVersionAuthResults = await this.outsideApiService.getResourceVersionAuthResults(resourceVersionIds, { authType: 'auth' });
            this.ctx.set('presentableUpstreamAuthTime', (new Date().getTime() - startDate.getTime()).toString());
            for (const resourceVersionAuthResult of resourceVersionAuthResults) {
                const { versionId, resolveResourceAuthResults } = resourceVersionAuthResult;
                if (lodash_1.isEmpty(resourceVersionAuthResults)) {
                    continue;
                }
                const nids = presentableAuthTree.filter(x => x.versionId === versionId).map(x => x.nid);
                const practicalUsedResources = presentableAuthTree.filter(x => nids.includes(x.parentNid));
                const authFailedResources = lodash_1.chain(resolveResourceAuthResults).intersectionBy(practicalUsedResources, 'resourceId').filter(x => !x.authResult?.isAuth).value();
                if (!lodash_1.isEmpty(authFailedResources)) {
                    return authResult.setAuthCode(egg_freelog_base_1.SubjectAuthCodeEnum.SubjectContractUnauthorized).setData({ authFailedResources }).setDefaulterIdentityType(auth_interface_1.DefaulterIdentityTypeEnum.Resource).setErrorMsg('展品上游链路授权未通过');
                }
            }
            return authResult.setAuthCode(egg_freelog_base_1.SubjectAuthCodeEnum.BasedOnContractAuthorized);
        }
        catch (e) {
            return authResult.setErrorMsg(e.toString()).setAuthCode(egg_freelog_base_1.SubjectAuthCodeEnum.AuthApiException).setReferee(egg_freelog_base_1.SubjectTypeEnum.Presentable).setDefaulterIdentityType(auth_interface_1.DefaulterIdentityTypeEnum.Resource);
        }
    }
    /**
     *  展品C端用户侧授权(自动查找当前登录用户与展品之间的合约,如果无合约,需要根据需求做免费策略校验.然后登录用户自动签约免费策略,非登录用户直接通过授权)
     * @param presentableInfo
     */
    async presentableClientUserSideAuth(presentableInfo) {
        // return new SubjectAuthResult().setAuthCode(SubjectAuthCodeEnum.BasedOnNullIdentityPolicyAuthorized);
        try {
            if (!this.ctx.isLoginUser()) {
                return this._unLoginUserPolicyAuth(presentableInfo);
            }
            return this._loginUserContractAuth(presentableInfo, this.ctx.identityInfo.userInfo);
        }
        catch (e) {
            return new auth_interface_1.SubjectAuthResult().setData({ error: e }).setErrorMsg(e.toString()).setAuthCode(egg_freelog_base_1.SubjectAuthCodeEnum.AuthApiException).setReferee(egg_freelog_base_1.SubjectTypeEnum.Presentable);
        }
    }
    /**
     * 根据合同计算授权结果
     * @param subjectId
     * @param contracts
     */
    contractAuth(subjectId, contracts) {
        const authResult = new auth_interface_1.SubjectAuthResult();
        if (!lodash_1.isArray(contracts) || lodash_1.isEmpty(contracts)) {
            return authResult.setAuthCode(egg_freelog_base_1.SubjectAuthCodeEnum.SubjectContractNotFound);
        }
        const invalidContracts = contracts.filter(x => x.subjectId !== subjectId);
        if (!lodash_1.isEmpty(invalidContracts)) {
            return authResult.setErrorMsg('存在无效的标的物合约').setData({ invalidContracts }).setAuthCode(egg_freelog_base_1.SubjectAuthCodeEnum.SubjectContractInvalid);
        }
        if (!contracts.some(x => x.isAuth)) {
            return authResult.setErrorMsg('合约授权未通过').setAuthCode(egg_freelog_base_1.SubjectAuthCodeEnum.SubjectContractUnauthorized);
        }
        return authResult.setAuthCode(egg_freelog_base_1.SubjectAuthCodeEnum.BasedOnContractAuthorized);
    }
    /**
     * 未登录用户授权(看是否有免费策略)
     */
    _unLoginUserPolicyAuth(presentableInfo) {
        const hasFreePolicy = presentableInfo.policies.some(x => x.status === 1 && this.policyHelper.isFreePolicy(x));
        if (hasFreePolicy) {
            return new auth_interface_1.SubjectAuthResult().setAuthCode(egg_freelog_base_1.SubjectAuthCodeEnum.BasedOnNullIdentityPolicyAuthorized).setReferee(egg_freelog_base_1.SubjectTypeEnum.Presentable);
        }
        return new auth_interface_1.SubjectAuthResult().setData({
            presentableId: presentableInfo.presentableId,
            presentableName: presentableInfo.presentableName,
            policies: presentableInfo.policies,
            contracts: []
        }).setErrorMsg('未登录的用户').setAuthCode(egg_freelog_base_1.SubjectAuthCodeEnum.UserUnauthenticated).setReferee(egg_freelog_base_1.SubjectTypeEnum.Presentable).setDefaulterIdentityType(auth_interface_1.DefaulterIdentityTypeEnum.ClientUser);
    }
    /**
     * 用户合同授权
     * @param presentableInfo
     * @param userInfo
     */
    async _loginUserContractAuth(presentableInfo, userInfo) {
        const contracts = await this.outsideApiService.getUserPresentableContracts(presentableInfo.presentableId, presentableInfo.nodeId, userInfo.userId, { projection: 'authStatus,status,subjectId,policyId,contractName,fsmCurrentState' });
        const contractAuthResult = await this.contractAuth(presentableInfo.presentableId, contracts);
        if (!contractAuthResult.isAuth) {
            contractAuthResult.setReferee(egg_freelog_base_1.SubjectTypeEnum.Presentable).setDefaulterIdentityType(auth_interface_1.DefaulterIdentityTypeEnum.ClientUser).setData({
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
    async _tryCreateFreeUserContract(presentableInfo, userInfo) {
        const freePolicy = presentableInfo.policies.find(x => x.status === 1 && this.policyHelper.isFreePolicy(x));
        // 如果没有免费策略,则直接返回找不到合约即可
        if (!freePolicy) {
            return new auth_interface_1.SubjectAuthResult().setErrorMsg('标的物未签约').setAuthCode(egg_freelog_base_1.SubjectAuthCodeEnum.SubjectContractNotFound).setReferee(egg_freelog_base_1.SubjectTypeEnum.Presentable).setDefaulterIdentityType(auth_interface_1.DefaulterIdentityTypeEnum.ClientUser);
        }
        await this.outsideApiService.signUserPresentableContract(userInfo.userId, {
            subjectId: presentableInfo.presentableId,
            policyId: freePolicy.policyId
        });
        return new auth_interface_1.SubjectAuthResult(egg_freelog_base_1.SubjectAuthCodeEnum.BasedOnContractAuthorized);
    }
};
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], PresentableAuthService.prototype, "ctx", void 0);
__decorate([
    midway_1.inject(),
    __metadata("design:type", policy_helper_1.PolicyHelper)
], PresentableAuthService.prototype, "policyHelper", void 0);
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], PresentableAuthService.prototype, "outsideApiService", void 0);
PresentableAuthService = __decorate([
    midway_1.provide()
], PresentableAuthService);
exports.PresentableAuthService = PresentableAuthService;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlc2VudGFibGUtYXV0aC1zZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2FwcC9zZXJ2aWNlL3ByZXNlbnRhYmxlLWF1dGgtc2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7QUFBQSxtQ0FBdUM7QUFRdkMsbUNBQStDO0FBQy9DLHVEQU0wQjtBQUMxQix5REFBa0Y7QUFDbEYsOERBQXdEO0FBR3hELElBQWEsc0JBQXNCLEdBQW5DLE1BQWEsc0JBQXNCO0lBRy9CLEdBQUcsQ0FBaUI7SUFFcEIsWUFBWSxDQUFlO0lBRTNCLGlCQUFpQixDQUFxQjtJQUV0Qzs7OztPQUlHO0lBQ0gsS0FBSyxDQUFDLGVBQWUsQ0FBQyxlQUFnQyxFQUFFLG1CQUFpRDtRQUNyRyxNQUFNLHdCQUF3QixHQUFHLE1BQU0sSUFBSSxDQUFDLDZCQUE2QixDQUFDLGVBQWUsQ0FBQyxDQUFDO1FBQzNGLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxNQUFNLEVBQUU7WUFDbEMsT0FBTyx3QkFBd0IsQ0FBQztTQUNuQztRQUVELE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLHVCQUF1QixDQUFDLGVBQWUsRUFBRSxtQkFBbUIsQ0FBQyxDQUFDO1FBQzVGLE1BQU0sd0JBQXdCLEdBQUcsSUFBSSxDQUFDLHVCQUF1QixDQUFDLGVBQWUsRUFBRSxtQkFBbUIsQ0FBQyxDQUFDO1FBQ3BHLE1BQU0sQ0FBQyxrQkFBa0IsRUFBRSwwQkFBMEIsQ0FBQyxHQUFHLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLGdCQUFnQixFQUFFLHdCQUF3QixDQUFDLENBQUMsQ0FBQztRQUV6SCxPQUFPLENBQUMsa0JBQWtCLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsQ0FBQywwQkFBMEIsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLDBCQUEwQixDQUFDLENBQUMsQ0FBQyx3QkFBd0IsQ0FB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