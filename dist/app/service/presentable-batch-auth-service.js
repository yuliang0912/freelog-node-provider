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
exports.PresentableBatchAuthService = void 0;
const midway_1 = require("midway");
const egg_freelog_base_1 = require("egg-freelog-base");
const policy_helper_1 = require("../../extend/policy-helper");
const lodash_1 = require("lodash");
const auth_interface_1 = require("../../auth-interface");
const presentable_service_1 = require("./presentable-service");
let PresentableBatchAuthService = class PresentableBatchAuthService {
    ctx;
    policyHelper;
    presentableService;
    outsideApiService;
    start = Date.now();
    /**
     * 多展品全链路授权
     * @param presentables
     * @param presentableAuthTreeMap
     * @param authType 1:节点侧授权 2:上游侧授权  3:节点侧以及上游侧 4:全链路授权(含C端用户)
     */
    async batchPresentableAuth(presentables, presentableAuthTreeMap, authType) {
        let clientAuthTask = undefined;
        let nodeAndUpstreamAuthTask = this.batchPresentableNodeSideAndUpstreamAuth(presentables, presentableAuthTreeMap, authType);
        if (authType === 4) {
            clientAuthTask = this.batchPresentableClientUserSideAuth(presentables, presentableAuthTreeMap);
        }
        const results = await Promise.all([clientAuthTask, nodeAndUpstreamAuthTask]);
        const nodeAndUpstreamAuthResultMap = (0, lodash_1.last)(results);
        if ([1, 2, 3].includes(authType)) {
            return new Map(presentables.map(presentableInfo => {
                return [presentableInfo.presentableId, nodeAndUpstreamAuthResultMap.get(presentableInfo.presentableId)];
            }));
        }
        const clientAuthResultMap = (0, lodash_1.first)(results);
        const authResultMap = new Map();
        for (const presentableInfo of presentables) {
            const clientAuthResult = clientAuthResultMap.get(presentableInfo.presentableId);
            const nodeAndUpstreamAuthResult = nodeAndUpstreamAuthResultMap.get(presentableInfo.presentableId);
            if (!clientAuthResult.isAuth && !nodeAndUpstreamAuthResult.isAuth) {
                clientAuthResult.setDefaulterIdentityType(clientAuthResult.defaulterIdentityType | nodeAndUpstreamAuthResult.defaulterIdentityType);
                authResultMap.set(presentableInfo.presentableId, clientAuthResult);
            }
            else if (!nodeAndUpstreamAuthResult.isAuth) {
                authResultMap.set(presentableInfo.presentableId, nodeAndUpstreamAuthResult);
            }
            else {
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
    async batchPresentableNodeSideAndUpstreamAuth(presentables, presentableAuthTreeMap, authType) {
        const exhibitInsideAuthMap = new Map();
        const presentableMap = new Map(presentables.map(x => [x.presentableId, x]));
        for (const [presentableId, authTree] of presentableAuthTreeMap) {
            const exhibitInsideAuthNodes = [];
            const presentableInfo = presentableMap.get(presentableId);
            for (const authItem of authTree) {
                const isNodeResolve = authItem.deep === 1;
                const resolveVersionId = isNodeResolve ? '' : authTree.find(x => x.nid === authItem.parentNid).versionId;
                exhibitInsideAuthNodes.push({
                    resourceId: authItem.resourceId,
                    versionId: authItem.versionId,
                    resolveVersionId: resolveVersionId,
                    roleType: isNodeResolve ? auth_interface_1.DefaulterIdentityTypeEnum.Node : auth_interface_1.DefaulterIdentityTypeEnum.Resource,
                    contractIds: isNodeResolve ? presentableInfo.resolveResources.find(x => x.resourceId === authItem.resourceId).contracts.map(x => x.contractId) : [],
                });
            }
            if (authType === 1) {
                exhibitInsideAuthMap.set(presentableId, exhibitInsideAuthNodes.filter(x => x.roleType === auth_interface_1.DefaulterIdentityTypeEnum.Node));
            }
            else if (authType === 2) {
                exhibitInsideAuthMap.set(presentableId, exhibitInsideAuthNodes.filter(x => x.roleType === auth_interface_1.DefaulterIdentityTypeEnum.Resource));
            }
            else {
                exhibitInsideAuthMap.set(presentableId, exhibitInsideAuthNodes);
            }
        }
        const resourceAuthNodes = [...exhibitInsideAuthMap.values()].flat().filter(x => x.roleType === auth_interface_1.DefaulterIdentityTypeEnum.Resource);
        const resourceVersionMap = await this.outsideApiService.getResourceVersionList(resourceAuthNodes.map(x => x.resolveVersionId), { projection: 'versionId,resolveResources' }).then(list => {
            return new Map(list.map(x => [x.versionId, x.resolveResources]));
        });
        for (const authItem of resourceAuthNodes) {
            const resolveVersionInfo = resourceVersionMap.get(authItem.resolveVersionId);
            authItem.contractIds = resolveVersionInfo?.find(x => x.resourceId === authItem.resourceId).contracts.map(x => x.contractId) ?? [];
        }
        const allContractIds = (0, lodash_1.uniq)([...exhibitInsideAuthMap.values()].flat().map(x => x.contractIds).flat());
        const authedContractSet = await this.outsideApiService.getContractByContractIds(allContractIds, {
            authStatusList: '1,3',
            projection: 'contractId'
        }).then(list => {
            return new Set(list.map(x => x.contractId));
        });
        const authResultMap = new Map();
        for (const [presentableId, insideAuthNode] of exhibitInsideAuthMap) {
            const subjectAuthResult = new auth_interface_1.SubjectAuthResult(egg_freelog_base_1.SubjectAuthCodeEnum.BasedOnContractAuthorized).setReferee(egg_freelog_base_1.SubjectTypeEnum.Presentable);
            const authFailedNodes = insideAuthNode.filter(item => (0, lodash_1.isEmpty)(item.contractIds) || !item.contractIds.some(x => authedContractSet.has(x)));
            if (!(0, lodash_1.isEmpty)(authFailedNodes)) {
                const defaulterIdentityType = (0, lodash_1.uniq)(authFailedNodes.map(x => x.roleType)).reduce((acc, current) => {
                    return current | acc;
                }, 0);
                subjectAuthResult.setAuthCode(egg_freelog_base_1.SubjectAuthCodeEnum.SubjectContractUnauthorized).setData({ authFailedResources: authFailedNodes.map(x => x.resourceId) }).setDefaulterIdentityType(defaulterIdentityType);
                if (defaulterIdentityType === (auth_interface_1.DefaulterIdentityTypeEnum.Node | auth_interface_1.DefaulterIdentityTypeEnum.Resource)) {
                    subjectAuthResult.setErrorMsg('展品在节点和资源链路上的授权均不通过');
                }
                else if (defaulterIdentityType === auth_interface_1.DefaulterIdentityTypeEnum.Node) {
                    subjectAuthResult.setErrorMsg('展品在节点链路上的授权不通过');
                }
                else {
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
    async batchPresentableClientUserSideAuth(presentables, presentableAuthTreeMap) {
        const authResultMap = new Map();
        presentables = await this.presentableService.fillPresentablePolicyInfo(presentables, true);
        // 未登录用户判定一下策略中是否含有免费策略,如果有,直接走策略授权模式
        if (!this.ctx.isLoginUser()) {
            for (const presentableInfo of presentables) {
                const authResult = new auth_interface_1.SubjectAuthResult();
                const hasFreePolicy = presentableInfo.policies.some(x => x.status === 1 && this.policyHelper.isFreePolicy(x));
                if (hasFreePolicy) {
                    authResult.setAuthCode(egg_freelog_base_1.SubjectAuthCodeEnum.BasedOnNullIdentityPolicyAuthorized).setReferee(egg_freelog_base_1.SubjectTypeEnum.Presentable);
                }
                else {
                    authResult.setData({
                        presentableId: presentableInfo.presentableId,
                        presentableName: presentableInfo.presentableName,
                        policies: presentableInfo.policies,
                        contracts: []
                    }).setErrorMsg('未登录的用户').setAuthCode(egg_freelog_base_1.SubjectAuthCodeEnum.UserUnauthenticated).setReferee(egg_freelog_base_1.SubjectTypeEnum.Presentable).setDefaulterIdentityType(auth_interface_1.DefaulterIdentityTypeEnum.ClientUser);
                }
                authResultMap.set(presentableInfo.presentableId, authResult);
            }
            return authResultMap;
        }
        // 登录用户需要获取合约进行授权对比
        const tasks = [];
        const contracts = await this.outsideApiService.getUserPresentableContracts(presentables.map(x => x.presentableId), this.ctx.userId, { projection: 'authStatus,status,subjectId,policyId,contractName,fsmCurrentState' });
        for (const presentableInfo of presentables) {
            const presentableContracts = contracts.filter(x => x.subjectId === presentableInfo.presentableId);
            if (!(0, lodash_1.isEmpty)(presentableContracts)) {
                const contractAuthResult = await this.contractAuth(presentableInfo.presentableId, presentableContracts);
                if (!contractAuthResult.isAuth) {
                    contractAuthResult.setReferee(egg_freelog_base_1.SubjectTypeEnum.Presentable).setDefaulterIdentityType(auth_interface_1.DefaulterIdentityTypeEnum.ClientUser).setData({
                        presentableId: presentableInfo.presentableId,
                        presentableName: presentableInfo.presentableName,
                        policies: presentableInfo.policies, contracts: presentableContracts
                    }).setErrorMsg('消费者的合约授权不通过');
                }
                authResultMap.set(presentableInfo.presentableId, contractAuthResult);
            }
            else {
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
    async tryCreateFreeUserContract(presentableInfo, userInfo) {
        const freePolicy = presentableInfo.policies.find(x => x.status === 1 && this.policyHelper.isFreePolicy(x));
        // 如果没有免费策略,则直接返回找不到合约即可
        if (!freePolicy) {
            return new auth_interface_1.SubjectAuthResult().setErrorMsg('标的物未签约').setAuthCode(egg_freelog_base_1.SubjectAuthCodeEnum.SubjectContractNotFound).setReferee(egg_freelog_base_1.SubjectTypeEnum.Presentable).setDefaulterIdentityType(auth_interface_1.DefaulterIdentityTypeEnum.ClientUser);
        }
        this.outsideApiService.signUserPresentableContract(userInfo.userId, {
            subjectId: presentableInfo.presentableId,
            policyId: freePolicy.policyId
        }).catch(error => {
            // 如果签约出错,静默处理即可.无需影响业务正常流转(例如标的物已下线就不可签约)
        });
        return new auth_interface_1.SubjectAuthResult(egg_freelog_base_1.SubjectAuthCodeEnum.BasedOnContractAuthorized);
    }
    /**
     * 根据合同计算授权结果
     * @param subjectId
     * @param contracts
     */
    contractAuth(subjectId, contracts) {
        const authResult = new auth_interface_1.SubjectAuthResult();
        if (!(0, lodash_1.isArray)(contracts) || (0, lodash_1.isEmpty)(contracts)) {
            return authResult.setAuthCode(egg_freelog_base_1.SubjectAuthCodeEnum.SubjectContractNotFound);
        }
        const invalidContracts = contracts.filter(x => x.subjectId !== subjectId);
        if (!(0, lodash_1.isEmpty)(invalidContracts)) {
            return authResult.setErrorMsg('存在无效的标的物合约').setData({ invalidContracts }).setAuthCode(egg_freelog_base_1.SubjectAuthCodeEnum.SubjectContractInvalid);
        }
        if (!contracts.some(x => x.isAuth)) {
            return authResult.setErrorMsg('合约授权未通过').setAuthCode(egg_freelog_base_1.SubjectAuthCodeEnum.SubjectContractUnauthorized);
        }
        return authResult.setAuthCode(egg_freelog_base_1.SubjectAuthCodeEnum.BasedOnContractAuthorized);
    }
};
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", Object)
], PresentableBatchAuthService.prototype, "ctx", void 0);
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", policy_helper_1.PolicyHelper)
], PresentableBatchAuthService.prototype, "policyHelper", void 0);
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", presentable_service_1.PresentableService)
], PresentableBatchAuthService.prototype, "presentableService", void 0);
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", Object)
], PresentableBatchAuthService.prototype, "outsideApiService", void 0);
PresentableBatchAuthService = __decorate([
    (0, midway_1.provide)()
], PresentableBatchAuthService);
exports.PresentableBatchAuthService = PresentableBatchAuthService;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlc2VudGFibGUtYmF0Y2gtYXV0aC1zZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2FwcC9zZXJ2aWNlL3ByZXNlbnRhYmxlLWJhdGNoLWF1dGgtc2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7QUFBQSxtQ0FBdUM7QUFRdkMsdURBRTBCO0FBQzFCLDhEQUF3RDtBQUN4RCxtQ0FBMkQ7QUFDM0QseURBQWtGO0FBQ2xGLCtEQUF5RDtBQUd6RCxJQUFhLDJCQUEyQixHQUF4QyxNQUFhLDJCQUEyQjtJQUdwQyxHQUFHLENBQWlCO0lBRXBCLFlBQVksQ0FBZTtJQUUzQixrQkFBa0IsQ0FBcUI7SUFFdkMsaUJBQWlCLENBQXFCO0lBQ3RDLEtBQUssR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7SUFHbkI7Ozs7O09BS0c7SUFDSCxLQUFLLENBQUMsb0JBQW9CLENBQUMsWUFBK0IsRUFBRSxzQkFBaUUsRUFBRSxRQUF1QjtRQUNsSixJQUFJLGNBQWMsR0FBRyxTQUFTLENBQUM7UUFDL0IsSUFBSSx1QkFBdUIsR0FBRyxJQUFJLENBQUMsdUNBQXVDLENBQUMsWUFBWSxFQUFFLHNCQUFzQixFQUFFLFFBQWUsQ0FBQyxDQUFDO1FBQ2xJLElBQUksUUFBUSxLQUFLLENBQUMsRUFBRTtZQUNoQixjQUFjLEdBQUcsSUFBSSxDQUFDLGtDQUFrQyxDQUFDLFlBQVksRUFBRSxzQkFBc0IsQ0FBQyxDQUFDO1NBQ2xHO1FBQ0QsTUFBTSxPQUFPLEdBQUcsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsY0FBYyxFQUFFLHVCQUF1QixDQUFDLENBQUMsQ0FBQztRQUM3RSxNQUFNLDRCQUE0QixHQUFHLElBQUEsYUFBSSxFQUFpQyxPQUFPLENBQUMsQ0FBQztRQUNuRixJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLEVB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