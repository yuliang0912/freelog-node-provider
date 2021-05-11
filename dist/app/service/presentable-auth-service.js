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
let PresentableAuthService = class PresentableAuthService {
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
                return authResult.setAuthCode(egg_freelog_base_1.SubjectAuthCodeEnum.SubjectContractUnauthorized).setErrorMsg('展品所解决的资源授权不通过').setData({ authFailedResources }).setBreachResponsibilityType(auth_interface_1.BreachResponsibilityTypeEnum.Node);
            }
            return authResult.setAuthCode(egg_freelog_base_1.SubjectAuthCodeEnum.BasedOnContractAuthorized);
        }
        catch (e) {
            return authResult.setErrorMsg(e.toString()).setAuthCode(egg_freelog_base_1.SubjectAuthCodeEnum.AuthApiException).setReferee(egg_freelog_base_1.SubjectTypeEnum.Presentable);
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
                    return authResult.setAuthCode(egg_freelog_base_1.SubjectAuthCodeEnum.SubjectContractUnauthorized).setData({ authFailedResources }).setBreachResponsibilityType(auth_interface_1.BreachResponsibilityTypeEnum.Resource).setErrorMsg('展品上游链路授权未通过');
                }
            }
            return authResult.setAuthCode(egg_freelog_base_1.SubjectAuthCodeEnum.BasedOnContractAuthorized);
        }
        catch (e) {
            return authResult.setErrorMsg(e.toString()).setAuthCode(egg_freelog_base_1.SubjectAuthCodeEnum.AuthApiException).setReferee(egg_freelog_base_1.SubjectTypeEnum.Presentable);
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
        const isExistAuthContracts = contracts.some(x => x.isAuth);
        if (!isExistAuthContracts) {
            return authResult.setErrorMsg('合约授权未通过').setAuthCode(egg_freelog_base_1.SubjectAuthCodeEnum.SubjectContractUnauthorized);
        }
        return authResult.setAuthCode(egg_freelog_base_1.SubjectAuthCodeEnum.BasedOnContractAuthorized);
    }
    /**
     * 未登录用户授权(看是否有免费策略)
     */
    _unLoginUserPolicyAuth(presentableInfo) {
        // 后续判定展品的策略中是否包含免费策略,如果包含免费策略,则直接基于策略授权通过
        return new auth_interface_1.SubjectAuthResult().setErrorMsg('未登录的用户').setAuthCode(egg_freelog_base_1.SubjectAuthCodeEnum.UserUnauthenticated).setReferee(egg_freelog_base_1.SubjectTypeEnum.Presentable).setBreachResponsibilityType(auth_interface_1.BreachResponsibilityTypeEnum.ClientUser);
    }
    /**
     * 用户合同授权
     * @param presentableInfo
     * @param userInfo
     */
    async _loginUserContractAuth(presentableInfo, userInfo) {
        const contracts = await this.outsideApiService.getUserPresentableContracts(presentableInfo.presentableId, presentableInfo.nodeId, userInfo.userId, { projection: 'authStatus,subjectId' });
        const contractAuthResult = await this.contractAuth(presentableInfo.presentableId, contracts);
        if (!contractAuthResult.isAuth) {
            contractAuthResult.setBreachResponsibilityType(auth_interface_1.BreachResponsibilityTypeEnum.ClientUser);
        }
        return contractAuthResult;
        // 先不实现自动签约免费策略的功能
        // return this._tryCreateFreeUserContract(presentableInfo, userInfo);
    }
    /**
     * 尝试创建免费合同
     * @param presentableInfo
     * @param userInfo
     */
    async _tryCreateFreeUserContract(presentableInfo, userInfo) {
        /**
         * TODO: 分析presentable策略中是否有免费策略,如果有,则签约.否则返回无授权
         */
        const contract = await this.outsideApiService.signUserPresentableContract(userInfo.userId, {
            subjectId: presentableInfo.presentableId,
            policyId: ''
        });
        return this.contractAuth(presentableInfo.presentableId, [contract]);
    }
};
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], PresentableAuthService.prototype, "ctx", void 0);
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], PresentableAuthService.prototype, "outsideApiService", void 0);
PresentableAuthService = __decorate([
    midway_1.provide()
], PresentableAuthService);
exports.PresentableAuthService = PresentableAuthService;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlc2VudGFibGUtYXV0aC1zZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2FwcC9zZXJ2aWNlL3ByZXNlbnRhYmxlLWF1dGgtc2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7QUFBQSxtQ0FBdUM7QUFRdkMsbUNBQStDO0FBQy9DLHVEQU0wQjtBQUMxQix5REFBcUY7QUFHckYsSUFBYSxzQkFBc0IsR0FBbkMsTUFBYSxzQkFBc0I7SUFPL0I7Ozs7T0FJRztJQUNILEtBQUssQ0FBQyxlQUFlLENBQUMsZUFBZ0MsRUFBRSxtQkFBaUQ7UUFFckcsTUFBTSx3QkFBd0IsR0FBRyxNQUFNLElBQUksQ0FBQyw2QkFBNkIsQ0FBQyxlQUFlLENBQUMsQ0FBQztRQUMzRixJQUFJLENBQUMsd0JBQXdCLENBQUMsTUFBTSxFQUFFO1lBQ2xDLE9BQU8sd0JBQXdCLENBQUM7U0FDbkM7UUFFRCxNQUFNLGdCQUFnQixHQUFHLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxlQUFlLEVBQUUsbUJBQW1CLENBQUMsQ0FBQztRQUM1RixNQUFNLHdCQUF3QixHQUFHLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxlQUFlLEVBQUUsbUJBQW1CLENBQUMsQ0FBQztRQUNwRyxNQUFNLENBQUMsa0JBQWtCLEVBQUUsMEJBQTBCLENBQUMsR0FBRyxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxnQkFBZ0IsRUFBRSx3QkFBd0IsQ0FBQyxDQUFDLENBQUM7UUFFekgsT0FBTyxDQUFDLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLENBQUMsMEJBQTBCLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQywwQkFBMEIsQ0FBQyxDQUFDLENBQUMsd0JBQXdCLENBQUM7SUFDeEosQ0FBQztJQUVEOzs7O09BSUc7SUFDSCxLQUFLLENBQUMsa0NBQWtDLENBQUMsZUFBZ0MsRUFBRSxt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