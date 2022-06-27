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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlc2VudGFibGUtYmF0Y2gtYXV0aC1zZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2FwcC9zZXJ2aWNlL3ByZXNlbnRhYmxlLWJhdGNoLWF1dGgtc2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7QUFBQSxtQ0FBdUM7QUFRdkMsdURBRTBCO0FBQzFCLDhEQUF3RDtBQUN4RCxtQ0FBMkQ7QUFDM0QseURBQWtGO0FBQ2xGLCtEQUF5RDtBQUd6RCxJQUFhLDJCQUEyQixHQUF4QyxNQUFhLDJCQUEyQjtJQUdwQyxHQUFHLENBQWlCO0lBRXBCLFlBQVksQ0FBZTtJQUUzQixrQkFBa0IsQ0FBcUI7SUFFdkMsaUJBQWlCLENBQXFCO0lBRXRDOzs7OztPQUtHO0lBQ0gsS0FBSyxDQUFDLG9CQUFvQixDQUFDLFlBQStCLEVBQUUsc0JBQWlFLEVBQUUsUUFBdUI7UUFDbEosSUFBSSxjQUFjLEdBQUcsU0FBUyxDQUFDO1FBQy9CLElBQUksdUJBQXVCLEdBQUcsSUFBSSxDQUFDLHVDQUF1QyxDQUFDLFlBQVksRUFBRSxzQkFBc0IsRUFBRSxRQUFlLENBQUMsQ0FBQztRQUNsSSxJQUFJLFFBQVEsS0FBSyxDQUFDLEVBQUU7WUFDaEIsY0FBYyxHQUFHLElBQUksQ0FBQyxrQ0FBa0MsQ0FBQyxZQUFZLEVBQUUsc0JBQXNCLENBQUMsQ0FBQztTQUNsRztRQUNELE1BQU0sT0FBTyxHQUFHLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLGNBQWMsRUFBRSx1QkFBdUIsQ0FBQyxDQUFDLENBQUM7UUFDN0UsTUFBTSw0QkFBNEIsR0FBRyxJQUFBLGFBQUksRUFBaUMsT0FBTyxDQUFDLENBQUM7UUFDbkYsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxFQUFFO1lBQzlCLE9BQU8sSUFBSSxHQUFHLENBQTRCLFlBQVksQ0FBQyxH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