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
const enum_1 = require("../../enum");
const lodash_1 = require("lodash");
const egg_freelog_base_1 = require("egg-freelog-base");
const auth_interface_1 = require("../../auth-interface");
let PresentableAuthService = class PresentableAuthService {
    /**
     * 展品授权,包括三部分(1.C端用户授权 2:节点自身合约授权 3:展品上游资源授权)
     * @param presentableInfo
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
     * 展品节点侧授权(节点自己解决的资源以及上抛的授权情况)
     * @param presentableInfo
     * @param presentableAuthTree
     */
    async presentableNodeSideAuth(presentableInfo, presentableAuthTree) {
        const authResult = new auth_interface_1.SubjectAuthResult();
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
        if (!lodash_1.isEmpty(authFailedResources)) {
            return authResult.setAuthCode(auth_interface_1.SubjectAuthCodeEnum.SubjectContractUnauthorized).setErrorMsg('展品所解决的资源授权不通过').setData({ authFailedResources });
        }
        return authResult.setAuthCode(auth_interface_1.SubjectAuthCodeEnum.BasedOnContractAuthorized);
    }
    /**
     * 展品上游合约授权(通过授权树获取对应的合约的授权状态即可直接判定,无需调用标的物的授权API)
     * @param presentableInfo
     * @param presentableAuthTree
     */
    async presentableUpstreamAuth(presentableInfo, presentableAuthTree) {
        const authResult = new auth_interface_1.SubjectAuthResult();
        const resourceVersionIds = lodash_1.chain(presentableAuthTree).map(x => x.versionId).uniq().value();
        if (lodash_1.isEmpty(resourceVersionIds)) {
            throw new egg_freelog_base_1.ApplicationError('presentable data has loused');
        }
        const resourceVersionAuthResults = await this.outsideApiService.getResourceVersionAuthResults(resourceVersionIds, { authType: 'auth' });
        for (const resourceVersionAuthResult of resourceVersionAuthResults) {
            const { versionId, resolveResourceAuthResults } = resourceVersionAuthResult;
            if (lodash_1.isEmpty(resourceVersionAuthResults)) {
                continue;
            }
            const nids = presentableAuthTree.filter(x => x.versionId === versionId).map(x => x.nid);
            const practicalUsedResources = presentableAuthTree.filter(x => nids.includes(x.parentNid));
            const authFailedResources = lodash_1.chain(resolveResourceAuthResults).intersectionBy(practicalUsedResources, 'resourceId').filter(x => !x.authResult?.isAuth).value();
            if (!lodash_1.isEmpty(authFailedResources)) {
                return authResult.setAuthCode(auth_interface_1.SubjectAuthCodeEnum.SubjectContractUnauthorized).setData({ authFailedResources }).setErrorMsg('展品上游链路授权未通过');
            }
        }
        return authResult.setAuthCode(auth_interface_1.SubjectAuthCodeEnum.BasedOnContractAuthorized);
    }
    /**
     *  展品C端用户侧授权(自动查找当前登录用户与展品之间的合约,如果无合约,需要根据需求做免费策略校验.然后登录用户自动签约免费策略,非登录用户直接通过授权)
     * @param presentableInfo
     */
    async presentableClientUserSideAuth(presentableInfo) {
        return this._loginUserContractAuth(presentableInfo, this.ctx.userInfo);
    }
    /**
     * 根据合同计算授权结果
     * @param subjectId
     * @param contracts
     */
    contractAuth(subjectId, contracts) {
        const authResult = new auth_interface_1.SubjectAuthResult();
        if (!lodash_1.isArray(contracts) || lodash_1.isEmpty(contracts)) {
            return authResult.setAuthCode(auth_interface_1.SubjectAuthCodeEnum.SubjectContractNotFound);
        }
        const invalidContracts = contracts.filter(x => x?.subjectType !== enum_1.SubjectTypeEnum.Resource || x?.subjectId !== subjectId);
        if (!lodash_1.isEmpty(invalidContracts)) {
            return authResult.setErrorMsg('存在无效的标的物合约').setData({ invalidContracts }).setAuthCode(auth_interface_1.SubjectAuthCodeEnum.SubjectContractInvalid);
        }
        const isExistAuthContracts = contracts.some(x => x.isAuth);
        if (!isExistAuthContracts) {
            return authResult.setErrorMsg('合约授权未通过').setAuthCode(auth_interface_1.SubjectAuthCodeEnum.SubjectContractUnauthorized);
        }
        return authResult.setAuthCode(auth_interface_1.SubjectAuthCodeEnum.BasedOnContractAuthorized);
    }
    /**
     * 用户合同授权
     * @param presentableInfo
     * @param userInfo
     */
    async _loginUserContractAuth(presentableInfo, userInfo) {
        const contracts = await this.outsideApiService.getUserPresentableContracts(presentableInfo.presentableId, presentableInfo.nodeId, userInfo.userId, {
            isDefault: 1,
            projection: 'authStatus'
        });
        if (!lodash_1.isEmpty(contracts)) {
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
    async _tryCreateFreeUserContract(presentableInfo, userInfo) {
        // 目前先通过
        return new auth_interface_1.SubjectAuthResult(auth_interface_1.SubjectAuthCodeEnum.SubjectContractNotFound).setAuthCode(auth_interface_1.SubjectAuthCodeEnum.BasedOnContractAuthorized);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlc2VudGFibGUtYXV0aC1zZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2FwcC9zZXJ2aWNlL3ByZXNlbnRhYmxlLWF1dGgtc2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7QUFBQSxtQ0FBdUM7QUFLdkMscUNBQTJDO0FBQzNDLG1DQUErQztBQUMvQyx1REFBa0Q7QUFDbEQseURBQTRFO0FBRzVFLElBQWEsc0JBQXNCLEdBQW5DLE1BQWEsc0JBQXNCO0lBTy9COzs7T0FHRztJQUNILEtBQUssQ0FBQyxlQUFlLENBQUMsZUFBZ0MsRUFBRSxtQkFBaUQ7UUFFckcsTUFBTSx3QkFBd0IsR0FBRyxNQUFNLElBQUksQ0FBQyw2QkFBNkIsQ0FBQyxlQUFlLENBQUMsQ0FBQztRQUMzRixJQUFJLENBQUMsd0JBQXdCLENBQUMsTUFBTSxFQUFFO1lBQ2xDLE9BQU8sd0JBQXdCLENBQUM7U0FDbkM7UUFFRCxNQUFNLGdCQUFnQixHQUFHLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxlQUFlLEVBQUUsbUJBQW1CLENBQUMsQ0FBQztRQUM1RixNQUFNLHdCQUF3QixHQUFHLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxlQUFlLEVBQUUsbUJBQW1CLENBQUMsQ0FBQztRQUNwRyxNQUFNLENBQUMsa0JBQWtCLEVBQUUsMEJBQTBCLENBQUMsR0FBRyxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxnQkFBZ0IsRUFBRSx3QkFBd0IsQ0FBQyxDQUFDLENBQUM7UUFFekgsT0FBTyxDQUFDLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLENBQUMsMEJBQTBCLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQywwQkFBMEIsQ0FBQyxDQUFDLENBQUMsd0JBQXdCLENBQUM7SUFDeEosQ0FBQztJQUVEOzs7O09BSUc7SUFDSCxLQUFLLENBQUMsdUJBQXVCLENBQUMs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