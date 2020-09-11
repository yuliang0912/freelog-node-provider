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
const enum_1 = require("../../enum");
const auth_interface_1 = require("../../auth-interface");
const egg_freelog_base_1 = require("egg-freelog-base");
let PresentableAuthService = class PresentableAuthService {
    /**
     * 展品授权,包括三部分(1.C端用户授权 2:节点自身合约授权 3:展品上游资源授权)
     * @param presentableInfo
     */
    async presentableAuth(presentableInfo, presentableVersionAuthTree) {
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
    async presentableNodeSideAuth(presentableInfo, presentableVersionAuthTree) {
        const authResult = new auth_interface_1.SubjectAuthResult();
        const presentableResolveResourceIdSet = new Set(presentableVersionAuthTree.filter(x => x.deep === 1).map(x => x.resourceId));
        // 如果授权树中不存在已解决的资源,则说明资源虽然上抛了,但是当前版本实际未使用.所以不对该资源做授权校验
        const toBeAuthorizedResources = presentableInfo.resolveResources.filter(x => presentableResolveResourceIdSet.has(x.resourceId));
        const allNodeContractIds = lodash_1.chain(toBeAuthorizedResources).map(x => x.contracts).flattenDeep().map(x => x.contractId).value();
        const contractMap = await this.outsideApiService.getContractByContractIds(allNodeContractIds, {
            licenseeId: presentableInfo.nodeId, projection: 'subjectId subjectType authStatus'
        }).then(list => {
            return new Map(list.map(x => [x.contractId, x]));
        });
        const authFailedResources = toBeAuthorizedResources.filter(resolveResource => {
            const contracts = resolveResource.contracts.map(x => contractMap.get(x.contractId));
            const currentAuthTreeNode = presentableVersionAuthTree.find(x => x.deep === 1 && x.resourceId === resolveResource.resourceId);
            currentAuthTreeNode.authContractIds = resolveResource.contracts.map(x => x.contractId);
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
     * @param presentableVersionAuthTree
     */
    async presentableUpstreamAuth(presentableInfo, presentableVersionAuthTree) {
        const authResult = new auth_interface_1.SubjectAuthResult();
        const resourceVersionIds = lodash_1.chain(presentableVersionAuthTree).map(x => x.versionId).uniq().value();
        if (lodash_1.isEmpty(resourceVersionIds)) {
            throw new egg_freelog_base_1.ApplicationError('presentable data has loused');
        }
        const resourceVersionAuthResults = await this.outsideApiService.getResourceVersionAuthResults(resourceVersionIds);
        for (let i = 0, j = resourceVersionAuthResults.length; i < j; i++) {
            const { versionId, resolveResourceAuthResults } = resourceVersionAuthResults[i];
            if (lodash_1.isEmpty(resourceVersionAuthResults)) {
                continue;
            }
            const practicalUsedResources = presentableVersionAuthTree.filter(x => x.parentVersionId === versionId);
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
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], PresentableAuthService.prototype, "presentableService", void 0);
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], PresentableAuthService.prototype, "presentableVersionService", void 0);
PresentableAuthService = __decorate([
    midway_1.provide()
], PresentableAuthService);
exports.PresentableAuthService = PresentableAuthService;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlc2VudGFibGUtYXV0aC1zZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2FwcC9zZXJ2aWNlL3ByZXNlbnRhYmxlLWF1dGgtc2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7QUFBQSxtQ0FBdUM7QUFVdkMsbUNBQStDO0FBQy9DLHFDQUEyQztBQUMzQyx5REFBNEU7QUFDNUUsdURBQWtEO0FBR2xELElBQWEsc0JBQXNCLEdBQW5DLE1BQWEsc0JBQXNCO0lBVy9COzs7T0FHRztJQUNILEtBQUssQ0FBQyxlQUFlLENBQUMsZUFBZ0MsRUFBRSwwQkFBNEQ7UUFFaEgsTUFBTSx3QkFBd0IsR0FBRyxNQUFNLElBQUksQ0FBQyw2QkFBNkIsQ0FBQyxlQUFlLENBQUMsQ0FBQztRQUMzRixJQUFJLENBQUMsd0JBQXdCLENBQUMsTUFBTSxFQUFFO1lBQ2xDLE9BQU8sd0JBQXdCLENBQUM7U0FDbkM7UUFFRCxNQUFNLDZCQUE2QixHQUFHLE1BQU0sSUFBSSxDQUFDLHVCQUF1QixDQUFDLGVBQWUsRUFBRSwwQkFBMEIsQ0FBQyxDQUFDO1FBQ3RILElBQUksQ0FBQyw2QkFBNkIsQ0FBQyxNQUFNLEVBQUU7WUFDdkMsT0FBTyw2QkFBNkIsQ0FBQztTQUN4QztRQUVELE1BQU0sMEJBQTBCLEdBQUcsTUFBTSxJQUFJLENBQUMsdUJBQXVCLENBQUMsZUFBZSxFQUFFLDBCQUEwQixDQUFDLENBQUM7UUFDbkgsSUFBSSxDQUFDLDBCQUEwQixDQUFDLE1BQU0sRUFBRTtZQUNwQyxPQUFPLDBCQUEwQixDQUFDO1NBQ3JDO1FBRUQsT0FBTyx3QkFBd0IsQ0FBQztJQUNwQyxDQUFDO0lBRUQ7Ozs7T0FJRztJQUNILEtBQUssQ0FBQyx1QkFBdUIsQ0FBQyxlQUFnQyxFQUFFLDBCQUE0RDtRQUV4SCxNQUFNLFVBQVUsR0FBRyxJQUFJLGtDQUFpQixFQUFFLENBQUM7UUFDM0MsTUFBTSwrQkFBK0IsR0FBRyxJ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