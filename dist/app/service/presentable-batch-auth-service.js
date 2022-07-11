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
     * @param authType 1:节点侧授权 2:上游侧授权 3:节点侧以及上游侧 4:全链路授权(含C端用户)
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
        const authResultMap = new Map();
        const allResourceIds = [...presentableAuthTreeMap.values()].flat().map(x => x.resourceId);
        const freezeResourceSet = await this.outsideApiService.getResourceListByIds(allResourceIds, {
            status: '2,3',
            projection: 'resourceId,status'
        }).then(list => {
            return new Set(list.map(x => x.resourceId));
        });
        const exhibitInsideAuthMap = new Map();
        const presentableMap = new Map(presentables.map(x => [x.presentableId, x]));
        for (const [presentableId, authTree] of presentableAuthTreeMap) {
            const freezeResourceIds = authTree.filter(x => freezeResourceSet.has(x.resourceId));
            if (!(0, lodash_1.isEmpty)(freezeResourceIds)) {
                authResultMap.set(presentableId, new auth_interface_1.SubjectAuthResult(egg_freelog_base_1.SubjectAuthCodeEnum.SubjectException)
                    .setErrorMsg('展品依赖中存在被冻结的资源').setData({ freezeResourceIds }));
                continue;
            }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlc2VudGFibGUtYmF0Y2gtYXV0aC1zZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2FwcC9zZXJ2aWNlL3ByZXNlbnRhYmxlLWJhdGNoLWF1dGgtc2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7QUFBQSxtQ0FBdUM7QUFRdkMsdURBRTBCO0FBQzFCLDhEQUF3RDtBQUN4RCxtQ0FBMkQ7QUFDM0QseURBQWtGO0FBQ2xGLCtEQUF5RDtBQUd6RCxJQUFhLDJCQUEyQixHQUF4QyxNQUFhLDJCQUEyQjtJQUdwQyxHQUFHLENBQWlCO0lBRXBCLFlBQVksQ0FBZTtJQUUzQixrQkFBa0IsQ0FBcUI7SUFFdkMsaUJBQWlCLENBQXFCO0lBRXRDOzs7OztPQUtHO0lBQ0gsS0FBSyxDQUFDLG9CQUFvQixDQUFDLFlBQStCLEVBQUUsc0JBQWlFLEVBQUUsUUFBdUI7UUFDbEosSUFBSSxjQUFjLEdBQUcsU0FBUyxDQUFDO1FBQy9CLElBQUksdUJBQXVCLEdBQUcsSUFBSSxDQUFDLHVDQUF1QyxDQUFDLFlBQVksRUFBRSxzQkFBc0IsRUFBRSxRQUFlLENBQUMsQ0FBQztRQUNsSSxJQUFJLFFBQVEsS0FBSyxDQUFDLEVBQUU7WUFDaEIsY0FBYyxHQUFHLElBQUksQ0FBQyxrQ0FBa0MsQ0FBQyxZQUFZLEVBQUUsc0JBQXNCLENBQUMsQ0FBQztTQUNsRztRQUNELE1BQU0sT0FBTyxHQUFHLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLGNBQWMsRUFBRSx1QkFBdUIsQ0FBQyxDQUFDLENBQUM7UUFDN0UsTUFBTSw0QkFBNEIsR0FBRyxJQUFBLGFBQUksRUFBaUMsT0FBTyxDQUFDLENBQUM7UUFDbkYsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxFQUFFO1lBQzlCLE9BQU8sSUFBSSxHQUFHLENBQTRCLFlBQVksQ0FBQyxHQUFHLENBQUMsZUFBZSxDQUFDLEVBQUU7Z0JBQ3pFLE9BQU8sQ0FBQyxlQUFlLENBQUMsYUFBYSxFQUFFLDRCQUE0QixDQUFDLEdBQUcsQ0FBQyxlQUFlLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQztZQUM1RyxDQUFDLENBQUMsQ0FBQyxDQUFDO1NBQ1A7UUFFRCxNQUFNLG1CQUFtQixHQUFHLElBQUEsY0FBSyxFQUFpQyxPQUFPLENBQUMsQ0FBQztRQUMzRSxNQUFNLGFBQWEsR0FBRyxJQUFJLEdBQUcsRUFBNkIsQ0FBQztRQUMzRCxLQUFLLE1BQU0sZUFBZSxJQUFJLFlBQVksRUFBRTtZQUN4QyxNQUFNLGdCQUFnQixHQUFHLG1CQUFtQixDQUFDLEdBQUcsQ0FBQyxlQUFlLENBQUMsYUFBYSxDQUFDLENBQUM7WUFDaEYsTUFBTSx5QkFBeUIsR0FBRyw0QkFBNEIsQ0FBQyxHQUFHLENBQUMsZUFBZSxDQUFDLGFBQWEsQ0FBQyxDQUFDO1lBQ2xHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxNQUFNLEVBQUU7Z0JBQy9ELGdCQUFnQixDQUFDLHdCQUF3QixDQUFDLGdCQUFnQixDQUFDLHFCQUFxQixHQUFHLHlCQUF5QixDQUFDLHFCQUFxQixDQUFDLENBQUM7Z0JBQ3BJLGFBQWEsQ0FBQyxHQUFHLENBQUMsZUFBZSxDQUFDLGFBQWEsRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDO2FBQ3RFO2lCQUFNLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxNQUFNLEVBQUU7Z0JBQzFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsZUFBZSxDQUFDLGFBQWEsRUFBRSx5QkFBeUIsQ0FBQyxDQUFDO2FBQy9FO2lCQUFNO2dCQUNILGFBQWEsQ0FBQyxHQUFHLENBQUMsZUFBZSxDQUFDLGFBQWEsRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDO2FBQ3RFO1NBQ0o7UUFDRCxPQUFPLGFBQWEsQ0FBQztJQUN6QixDQUFDO0lBRUQ7Ozs7O09BS0c7SUFDSCxLQUFLLENBQUMsdUNBQXVDLENBQUMsWUFBK0IsRUFBRSxzQkFBaUUsRUFBRSxRQUFtQjtRQUVqSyxNQUFNLGFBQWEsR0FBRyxJQUFJLEdBQUcsRUFBNkIsQ0FBQztRQUMzRCxNQUFNLGNBQWMsR0FBRyxDQUFDLEdBQUcsc0JBQXNCLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDMUYsTUFBTSxpQkFBaUIsR0FBRyxNQUFNLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLEVBQUU7WUFDeEYsTUFBTSxFQUFFLEtBQUs7WUFDYixVQUFVLEVBQUUsbUJBQW1CO1NBQ2xDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDWCxPQUFPLElBQUksR0FBRyxDQUFTLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQztRQUN4RCxDQUFDLENBQUMsQ0FBQztRQUNILE1BQU0sb0JBQW9CLEdBQUcsSUFBSSxHQUFHLEVBQW1DLENBQUM7UUFDeEUsTUFBTSxjQUFjLEdBQUcsSUFBSSxHQUFHLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLGFBQWEsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDNUUsS0FBSyxNQUFNLENBQUMsYUFBYSxFQUFFLFFBQVEsQ0FBQyxJQUFJLHNCQUFzQixFQUFFO1lBQzVELE1BQU0saUJBQWlCLEdBQUcsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQztZQUNwRixJQUFJLENBQUMsSUFBQSxnQkFBTyxFQUFDLGlCQUFpQixDQUFDLEVBQUU7Z0JBQzdCLGFBQWEsQ0FBQyxHQUFHLENBQUMsYUFBYSxFQUFFLElBQUksa0NBQWlCLENBQUMsc0NBQW1CLENBQUMsZ0JBQWdCLENBQUM7cUJBQ3ZGLFdBQVcsQ0FBQyxlQUFlLENBQUMsQ0FBQyxPQUFPLENBQUMsRUFBQyxpQkFBaUIsRUFBQyxDQUFDLENBQUMsQ0FBQztnQkFDaEUsU0FBUzthQUNaO1lBQ0QsTUFBTSxzQkFBc0IsR0FBNEIsRUFBRSxDQUFDO1lBQzNELE1BQU0sZUFBZSxHQUFHLGNBQWMsQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLENBQUM7WUFDMUQsS0FBSyxNQUFNLFFBQVEsSUFBSSxRQUFRLEVBQUU7Z0JBQzdCLE1BQU0sYUFBYSxHQUFHLFFBQVEsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDO2dCQUMxQyxNQUFNLGdCQUFnQixHQUFHLGFBQWEsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsS0FBSyxRQUFRLENBQUMsU0FBUyxDQUFDLENBQUMsU0FBUyxDQUFDO2dCQUN6RyxzQkFBc0IsQ0FBQyxJQUFJLENBQUM7b0JBQ3hCLFVBQVUsRUFBRSxRQUFRLENBQUMsVUFBVTtvQkFDL0IsU0FBUyxFQUFFLFFBQVEsQ0FBQyxTQUFTO29CQUM3QixnQkFBZ0IsRUFBRSxnQkFBZ0I7b0JBQ2xDLFFBQVEsRUFBRSxhQUFhLENBQUMsQ0FBQyxDQUFDLDBDQUF5QixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsMENBQXlCLENBQUMsUUFBUTtvQkFDN0YsV0FBVyxFQUFFLGFBQWEsQ0FBQyxDQUFDLENBQUMsZUFBZSxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxVQUFVLEtBQUssUUFBUSxDQUFDLFVBQVUsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUU7aUJBQ3RKLENBQUMsQ0FBQzthQUNOO1lBQ0QsSUFBSSxRQUFRLEtBQUssQ0FBQyxFQUFFO2dCQUNoQixvQkFBb0IsQ0FBQyxHQUFHLENBQUMsYUFBYSxFQUFFLHNCQUFzQixDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxRQUFRLEtBQUssMENBQXlCLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQzthQUM5SDtpQkFBTSxJQUFJLFFBQVEsS0FBSyxDQUFDLEVBQUU7Z0JBQ3ZCLG9CQUFvQixDQUFDLEdBQUcsQ0FBQyxhQUFhLEVBQUUsc0JBQXNCLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFFBQVEsS0FBSywwQ0FBeUIsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO2FBQ2xJO2lCQUFNO2dCQUNILG9CQUFvQixDQUFDLEdBQUcsQ0FBQyxhQUFhLEVBQUUsc0JBQXNCLENBQUMsQ0FBQzthQUNuRTtTQUNKO1FBQ0QsTUFBTSxpQkFBaUIsR0FBRyxDQUFDLEdBQUcsb0JBQW9CLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxLQUFLLDBDQUF5QixDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ25JLE1BQU0sa0JBQWtCLEdBQUcsTUFBTSxJQUFJLENBQUMsaUJBQWlCLENBQUMsc0JBQXNCLENBQUMsaUJBQWlCLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLEVBQUUsRUFBQyxVQUFVLEVBQUUsNEJBQTRCLEVBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRTtZQUNuTCxPQUFPLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3JFLENBQUMsQ0FBQyxDQUFDO1FBQ0gsS0FBSyxNQUFNLFFBQVEsSUFBSSxpQkFBaUIsRUFBRTtZQUN0QyxNQUFNLGtCQUFrQixHQUFHLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztZQUM3RSxRQUFRLENBQUMsV0FBVyxHQUFHLGtCQUFrQixFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxVQUFVLEtBQUssUUFBUSxDQUFDLFVBQVUsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLElBQUksRUFBRSxDQUFDO1NBQ3JJO1FBQ0QsTUFBTSxjQUFjLEdBQUcsSUFBQSxhQUFJLEVBQUMsQ0FBQyxHQUFHLG9CQUFvQixDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUM7UUFDdEcsTUFBTSxpQkFBaUIsR0FBRyxNQUFNLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyx3QkFBd0IsQ0FBQyxjQUFjLEVBQUU7WUFDNUYsY0FBYyxFQUFFLEtBQUs7WUFDckIsVUFBVSxFQUFFLFlBQVk7U0FDM0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRTtZQUNYLE9BQU8sSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDO1FBQ2hELENBQUMsQ0FBQyxDQUFDO1FBQ0gsS0FBSyxNQUFNLENBQUMsYUFBYSxFQUFFLGNBQWMsQ0FBQyxJQUFJLG9CQUFvQixFQUFFO1lBQ2hFLE1BQU0saUJBQWlCLEdBQUcsSUFBSSxrQ0FBaUIsQ0FBQyxzQ0FBbUIsQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxrQ0FBZSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1lBQ3ZJLE1BQU0sZUFBZSxHQUFHLGNBQWMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFBLGdCQUFPLEVBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzFJLElBQUksQ0FBQyxJQUFBLGdCQUFPLEVBQUMsZUFBZSxDQUFDLEVBQUU7Z0JBQzNCLE1BQU0scUJBQXFCLEdBQUcsSUFBQSxhQUFJLEVBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsRUFBRSxPQUFPLEVBQUUsRUFBRTtvQkFDN0YsT0FBTyxPQUFPLEdBQUcsR0FBRyxDQUFDO2dCQUN6QixDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBQ04saUJBQWlCLENBQUMsV0FBVyxDQUFDLHNDQUFtQixDQUFDLDJCQUEyQixDQUFDLENBQUMsT0FBTyxDQUFDLEVBQUMsbUJBQW1CLEVBQUUsZUFBZSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsRUFBQyxDQUFDLENBQUMsd0JBQXdCLENBQUMscUJBQXFCLENBQUMsQ0FBQztnQkFDdE0sSUFBSSxxQkFBcUIsS0FBSyxDQUFDLDBDQUF5QixDQUFDLElBQUksR0FBRywwQ0FBeUIsQ0FBQyxRQUFRLENBQUMsRUFBRTtvQkFDakcsaUJBQWlCLENBQUMsV0FBVyxDQUFDLG9CQUFvQixDQUFDLENBQUM7aUJBQ3ZEO3FCQUFNLElBQUkscUJBQXFCLEtBQUssMENBQXlCLENBQUMsSUFBSSxFQUFFO29CQUNqRSxpQkFBaUIsQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztpQkFDbkQ7cUJBQU07b0JBQ0gsaUJBQWlCLENBQUMsV0FBVyxDQUFDLGdCQUFnQixDQUFDLENBQUM7aUJBQ25EO2FBQ0o7WUFDRCxhQUFhLENBQUMsR0FBRyxDQUFDLGFBQWEsRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO1NBQ3ZEO1FBQ0QsT0FBTyxhQUFhLENBQUM7SUFDekIsQ0FBQztJQUVEOzs7O09BSUc7SUFDSCxLQUFLLENBQUMsa0NBQWtDLENBQUMsWUFBK0IsRUFBRSxzQkFBaUU7UUFDdkksTUFBTSxhQUFhLEdBQUcsSUFBSSxHQUFHLEVBQTZCLENBQUM7UUFDM0QsWUFBWSxHQUFHLE1BQU0sSUFBSSxDQUFDLGtCQUFrQixDQUFDLHlCQUF5QixDQUFDLFlBQVksRUFBRSxJQUFJLENBQUMsQ0FBQztRQUMzRixxQ0FBcUM7UUFDckMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsV0FBVyxFQUFFLEVBQUU7WUFDekIsS0FBSyxNQUFNLGVBQWUsSUFBSSxZQUFZLEVBQUU7Z0JBQ3hDLE1BQU0sVUFBVSxHQUFHLElBQUksa0NBQWlCLEVBQUUsQ0FBQztnQkFDM0MsTUFBTSxhQUFhLEdBQUcsZUFBZSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTSxLQUFLLENBQUMsSUFBSSxJQUFJLENBQUMsWUFBWSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUM5RyxJQUFJLGFBQWEsRUFBRTtvQkFDZixVQUFVLENBQUMsV0FBVyxDQUFDLHNDQUFtQixDQUFDLG1DQUFtQyxDQUFDLENBQUMsVUFBVSxDQUFDLGtDQUFlLENBQUMsV0FBVyxDQUFDLENBQUM7aUJBQzNIO3FCQUFNO29CQUNILFVBQVUsQ0FBQyxPQUFPLENBQUM7d0JBQ2YsYUFBYSxFQUFFLGVBQWUsQ0FBQyxhQUFhO3dCQUM1QyxlQUFlLEVBQUUsZUFBZSxDQUFDLGVBQWU7d0JBQ2hELFFBQVEsRUFBRSxlQUFlLENBQUMsUUFBUTt3QkFDbEMsU0FBUyxFQUFFLEVBQUU7cUJBQ2hCLENBQUMsQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLENBQUMsV0FBVyxDQUFDLHNDQUFtQixDQUFDLG1CQUFtQixDQUFDLENBQUMsVUFBVSxDQUFDLGtDQUFlLENBQUMsV0FBVyxDQUFDLENBQUMsd0JBQXdCLENBQUMsMENBQXlCLENBQUMsVUFBVSxDQUFDLENBQUM7aUJBQ3hMO2dCQUNELGFBQWEsQ0FBQyxHQUFHLENBQUMsZUFBZSxDQUFDLGFBQWEsRUFBRSxVQUFVLENBQUMsQ0FBQzthQUNoRTtZQUNELE9BQU8sYUFBYSxDQUFDO1NBQ3hCO1FBQ0QsbUJBQW1CO1FBQ25CLE1BQU0sS0FBSyxHQUFHLEVBQUUsQ0FBQztRQUNqQixNQUFNLFNBQVMsR0FBRyxNQUFNLElBQUksQ0FBQyxpQkFBaUIsQ0FBQywyQkFBMkIsQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLEVBQUMsVUFBVSxFQUFFLG1FQUFtRSxFQUFDLENBQUMsQ0FBQztRQUN2TixLQUFLLE1BQU0sZUFBZSxJQUFJLFlBQVksRUFBRTtZQUN4QyxNQUFNLG9CQUFvQixHQUFHLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsU0FBUyxLQUFLLGVBQWUsQ0FBQyxhQUFhLENBQUMsQ0FBQztZQUNsRyxJQUFJLENBQUMsSUFBQSxnQkFBTyxFQUFDLG9CQUFvQixDQUFDLEVBQUU7Z0JBQ2hDLE1BQU0sa0JBQWtCLEdBQUcsTUFBTSxJQUFJLENBQUMsWUFBWSxDQUFDLGVBQWUsQ0FBQyxhQUFhLEVBQUUsb0JBQW9CLENBQUMsQ0FBQztnQkFDeEcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLE1BQU0sRUFBRTtvQkFDNUIsa0JBQWtCLENBQUMsVUFBVSxDQUFDLGtDQUFlLENBQUMsV0FBVyxDQUFDLENBQUMsd0JBQXdCLENBQUMsMENBQXlCLENBQUMsVUFBVSxDQUFDLENBQUMsT0FBTyxDQUFDO3dCQUM5SCxhQUFhLEVBQUUsZUFBZSxDQUFDLGFBQWE7d0JBQzVDLGVBQWUsRUFBRSxlQUFlLENBQUMsZUFBZTt3QkFDaEQsUUFBUSxFQUFFLGVBQWUsQ0FBQyxRQUFRLEVBQUUsU0FBUyxFQUFFLG9CQUFvQjtxQkFDdEUsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxhQUFhLENBQUMsQ0FBQztpQkFDakM7Z0JBQ0QsYUFBYSxDQUFDLEdBQUcsQ0FBQyxlQUFlLENBQUMsYUFBYSxFQUFFLGtCQUFrQixDQUFDLENBQUM7YUFDeEU7aUJBQU07Z0JBQ0gsNkVBQTZFO2dCQUM3RSxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxlQUFlLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxFQUFFO29CQUN6RyxhQUFhLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FBQyxhQUFhLEVBQUUsVUFBVSxDQUFDLENBQUM7Z0JBQ2pFLENBQUMsQ0FBQyxDQUFDLENBQUM7YUFDUDtTQUNKO1FBQ0QsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3pCLE9BQU8sYUFBYSxDQUFDO0lBQ3pCLENBQUM7SUFFRDs7OztPQUlHO0lBQ0gsS0FBSyxDQUFDLHlCQUF5QixDQUFDLGVBQWdDLEVBQUUsUUFBeUI7UUFDdkYsTUFBTSxVQUFVLEdBQUcsZUFBZSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTSxLQUFLLENBQUMsSUFBSSxJQUFJLENBQUMsWUFBWSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzNHLHdCQUF3QjtRQUN4QixJQUFJLENBQUMsVUFBVSxFQUFFO1lBQ2IsT0FBTyxJQUFJLGtDQUFpQixFQUFFLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxzQ0FBbUIsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxrQ0FBZSxDQUFDLFdBQVcsQ0FBQyxDQUFDLHdCQUF3QixDQUFDLDBDQUF5QixDQUFDLFVBQVUsQ0FBQyxDQUFDO1NBQ3hOO1FBRUQsSUFBSSxDQUFDLGlCQUFpQixDQUFDLDJCQUEyQixDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUU7WUFDaEUsU0FBUyxFQUFFLGVBQWUsQ0FBQyxhQUFhO1lBQ3hDLFFBQVEsRUFBRSxVQUFVLENBQUMsUUFBUTtTQUNoQyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxFQUFFO1lBQ2IsMENBQTBDO1FBQzlDLENBQUMsQ0FBQyxDQUFDO1FBRUgsT0FBTyxJQUFJLGtDQUFpQixDQUFDLHNDQUFtQixDQUFDLHlCQUF5QixDQUFDLENBQUM7SUFDaEYsQ0FBQztJQUVEOzs7O09BSUc7SUFDSyxZQUFZLENBQUMsU0FBaUIsRUFBRSxTQUF5QjtRQUU3RCxNQUFNLFVBQVUsR0FBRyxJQUFJLGtDQUFpQixFQUFFLENBQUM7UUFDM0MsSUFBSSxDQUFDLElBQUEsZ0JBQU8sRUFBQyxTQUFTLENBQUMsSUFBSSxJQUFBLGdCQUFPLEVBQUMsU0FBUyxDQUFDLEVBQUU7WUFDM0MsT0FBTyxVQUFVLENBQUMsV0FBVyxDQUFDLHNDQUFtQixDQUFDLHVCQUF1QixDQUFDLENBQUM7U0FDOUU7UUFFRCxNQUFNLGdCQUFnQixHQUFHLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsU0FBUyxLQUFLLFNBQVMsQ0FBQyxDQUFDO1FBQzFFLElBQUksQ0FBQyxJQUFBLGdCQUFPLEVBQUMsZ0JBQWdCLENBQUMsRUFBRTtZQUM1QixPQUFPLFVBQVUsQ0FBQyxXQUFXLENBQUMsWUFBWSxDQUFDLENBQUMsT0FBTyxDQUFDLEVBQUMsZ0JBQWdCLEVBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxzQ0FBbUIsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO1NBQ25JO1FBQ0QsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEVBQUU7WUFDaEMsT0FBTyxVQUFVLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxzQ0FBbUIsQ0FBQywyQkFBMkIsQ0FBQyxDQUFDO1NBQ3pHO1FBRUQsT0FBTyxVQUFVLENBQUMsV0FBVyxDQUFDLHNDQUFtQixDQUFDLHlCQUF5QixDQUFDLENBQUM7SUFDakYsQ0FBQztDQUNKLENBQUE7QUFoT0c7SUFEQyxJQUFBLGVBQU0sR0FBRTs7d0RBQ1c7QUFFcEI7SUFEQyxJQUFBLGVBQU0sR0FBRTs4QkFDSyw0QkFBWTtpRUFBQztBQUUzQjtJQURDLElBQUEsZUFBTSxHQUFFOzhCQUNXLHdDQUFrQjt1RUFBQztBQUV2QztJQURDLElBQUEsZUFBTSxHQUFFOztzRUFDNkI7QUFUN0IsMkJBQTJCO0lBRHZDLElBQUEsZ0JBQU8sR0FBRTtHQUNHLDJCQUEyQixDQW1PdkM7QUFuT1ksa0VBQTJCIn0=