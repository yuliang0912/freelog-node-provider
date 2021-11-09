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
exports.TestResourceAuthService = void 0;
const midway_1 = require("midway");
const lodash_1 = require("lodash");
const auth_interface_1 = require("../../auth-interface");
const test_node_interface_1 = require("../../test-node-interface");
const egg_freelog_base_1 = require("egg-freelog-base");
let TestResourceAuthService = class TestResourceAuthService {
    ctx;
    outsideApiService;
    /**
     * 测试资源授权
     * @param testResourceInfo
     * @param testResourceAuthTree
     */
    async testResourceAuth(testResourceInfo, testResourceAuthTree) {
        if (testResourceInfo.userId !== this.ctx.userId) {
            return new auth_interface_1.SubjectAuthResult(egg_freelog_base_1.SubjectAuthCodeEnum.LoginUserUnauthorized).setErrorMsg('当前用户没有测试权限');
        }
        const nodeSideAuthTask = this.testResourceNodeSideAuth(testResourceInfo, testResourceAuthTree);
        const upstreamResourceAuthTask = this.testResourceUpstreamAuth(testResourceInfo, testResourceAuthTree);
        const [nodeSideAuthResult, upstreamResourceAuthResult] = await Promise.all([nodeSideAuthTask, upstreamResourceAuthTask]);
        return !nodeSideAuthResult.isAuth ? nodeSideAuthResult : !upstreamResourceAuthResult.isAuth ? upstreamResourceAuthResult : nodeSideAuthResult;
    }
    /**
     * 展品节点侧授权(节点自己解决的资源以及上抛的授权情况)
     * @param testResourceInfo
     * @param testResourceAuthTree
     */
    async testResourceNodeSideAuth(testResourceInfo, testResourceAuthTree) {
        const authResult = new auth_interface_1.SubjectAuthResult();
        // 授权树是指定版本的实际依赖推导出来的.所以上抛了但是实际未使用的资源不会体现在授权树分支中.(测试资源resolveResource)
        const testResourceResolveResourceIdSet = new Set(testResourceAuthTree.filter(x => x.deep === 1 && x.type === test_node_interface_1.TestResourceOriginType.Resource).map(x => x.id));
        // 过滤排除掉节点解决签约但又未实际使用到的资源,此部分资源不影响授权结果.(按照实用主义原则优化处理)
        const toBeAuthorizedResources = testResourceInfo.resolveResources.filter(x => testResourceResolveResourceIdSet.has(x.resourceId));
        const allNodeContractIds = lodash_1.chain(toBeAuthorizedResources).map(x => x.contracts).flattenDeep().map(x => x.contractId).value();
        const contractMap = await this.outsideApiService.getContractByContractIds(allNodeContractIds, {
            licenseeId: testResourceInfo.nodeId, projection: 'contractId,subjectId,subjectType,authStatus'
        }).then(list => {
            return new Map(list.map(x => [x.contractId, x]));
        });
        const authFailedResources = toBeAuthorizedResources.filter(resolveResource => {
            const contracts = resolveResource.contracts.filter(x => contractMap.has(x.contractId)).map(x => contractMap.get(x.contractId));
            return !this.contractAuth(resolveResource.resourceId, contracts).isAuth;
        });
        if (!lodash_1.isEmpty(authFailedResources)) {
            return authResult.setAuthCode(egg_freelog_base_1.SubjectAuthCodeEnum.SubjectContractUnauthorized).setErrorMsg('展品所解决的资源授权不通过').setData({ authFailedResources });
        }
        return authResult.setAuthCode(egg_freelog_base_1.SubjectAuthCodeEnum.BasedOnContractAuthorized);
    }
    /**
     * 展品上游合约授权,需要对应的标的物服务做出授权结果
     * @param testResourceInfo
     * @param testResourceAuthTree
     */
    async testResourceUpstreamAuth(testResourceInfo, testResourceAuthTree) {
        // 只有资源需要授权,存储对象不需要授权.
        testResourceAuthTree = testResourceAuthTree.filter(x => x.type === test_node_interface_1.TestResourceOriginType.Resource);
        const authResult = new auth_interface_1.SubjectAuthResult();
        const resourceVersionIds = lodash_1.chain(testResourceAuthTree).map(x => x.versionId).uniq().value();
        if (lodash_1.isEmpty(resourceVersionIds)) {
            // 存储对象给默认授权
            return authResult.setAuthCode(egg_freelog_base_1.SubjectAuthCodeEnum.BasedOnDefaultAuth);
        }
        const resourceVersionAuthResults = await this.outsideApiService.getResourceVersionAuthResults(resourceVersionIds, { authType: 'testAuth' });
        for (const resourceVersionAuthResult of resourceVersionAuthResults) {
            const { versionId, resolveResourceAuthResults } = resourceVersionAuthResult;
            if (lodash_1.isEmpty(resourceVersionAuthResults)) {
                continue;
            }
            const nids = testResourceAuthTree.filter(x => x.versionId === versionId).map(x => x.nid);
            const practicalUsedResources = testResourceAuthTree.filter(x => nids.includes(x.parentNid));
            const authFailedResources = lodash_1.chain(resolveResourceAuthResults).intersectionBy(practicalUsedResources, 'id').filter(x => !x.authResult?.isAuth).value();
            if (!lodash_1.isEmpty(authFailedResources)) {
                return authResult.setAuthCode(egg_freelog_base_1.SubjectAuthCodeEnum.SubjectContractUnauthorized).setData({ authFailedResources }).setErrorMsg('测试展品上游链路授权未通过');
            }
        }
        return authResult.setAuthCode(egg_freelog_base_1.SubjectAuthCodeEnum.BasedOnContractAuthorized);
    }
    /**
     * 根据合同计算测试授权结果
     * @param subjectId
     * @param contracts
     */
    contractAuth(subjectId, contracts) {
        const authResult = new auth_interface_1.SubjectAuthResult();
        if (!lodash_1.isArray(contracts) || lodash_1.isEmpty(contracts)) {
            return authResult.setAuthCode(egg_freelog_base_1.SubjectAuthCodeEnum.SubjectContractNotFound);
        }
        const invalidContracts = contracts.filter(x => x?.subjectType !== egg_freelog_base_1.SubjectTypeEnum.Resource || x?.subjectId !== subjectId);
        if (!lodash_1.isEmpty(invalidContracts)) {
            return authResult.setErrorMsg('存在无效的标的物合约').setData({ invalidContracts }).setAuthCode(egg_freelog_base_1.SubjectAuthCodeEnum.SubjectContractInvalid);
        }
        const isExistAuthContracts = contracts.some(x => x.isTestAuth);
        if (!isExistAuthContracts) {
            return authResult.setErrorMsg('合约授权未通过').setAuthCode(egg_freelog_base_1.SubjectAuthCodeEnum.SubjectContractUnauthorized);
        }
        return authResult.setAuthCode(egg_freelog_base_1.SubjectAuthCodeEnum.BasedOnContractAuthorized);
    }
};
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], TestResourceAuthService.prototype, "ctx", void 0);
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], TestResourceAuthService.prototype, "outsideApiService", void 0);
TestResourceAuthService = __decorate([
    midway_1.provide()
], TestResourceAuthService);
exports.TestResourceAuthService = TestResourceAuthService;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdC1yZXNvdXJjZS1hdXRoLXNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvYXBwL3NlcnZpY2UvdGVzdC1yZXNvdXJjZS1hdXRoLXNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0FBQUEsbUNBQXVDO0FBQ3ZDLG1DQUErQztBQUUvQyx5REFBdUQ7QUFDdkQsbUVBS21DO0FBQ25DLHVEQUFzRjtBQUd0RixJQUFhLHVCQUF1QixHQUFwQyxNQUFhLHVCQUF1QjtJQUdoQyxHQUFHLENBQWlCO0lBRXBCLGlCQUFpQixDQUFxQjtJQUV0Qzs7OztPQUlHO0lBQ0gsS0FBSyxDQUFDLGdCQUFnQixDQUFDLGdCQUFrQyxFQUFFLG9CQUFtRDtRQUUxRyxJQUFJLGdCQUFnQixDQUFDLE1BQU0sS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRTtZQUM3QyxPQUFPLElBQUksa0NBQWlCLENBQUMsc0NBQW1CLENBQUMscUJBQXFCLENBQUMsQ0FBQyxXQUFXLENBQUMsWUFBWSxDQUFDLENBQUM7U0FDckc7UUFFRCxNQUFNLGdCQUFnQixHQUFHLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxnQkFBZ0IsRUFBRSxvQkFBb0IsQ0FBQyxDQUFDO1FBQy9GLE1BQU0sd0JBQXdCLEdBQUcsSUFBSSxDQUFDLHdCQUF3QixDQUFDLGdCQUFnQixFQUFFLG9CQUFvQixDQUFDLENBQUM7UUFDdkcsTUFBTSxDQUFDLGtCQUFrQixFQUFFLDBCQUEwQixDQUFDLEdBQUcsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsZ0JBQWdCLEVBQUUsd0JBQXdCLENBQUMsQ0FBQyxDQUFDO1FBRXpILE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQyxDQUFDLDBCQUEwQixDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsMEJBQTBCLENBQUMsQ0FBQyxD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