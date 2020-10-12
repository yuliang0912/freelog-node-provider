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
const enum_1 = require("../../enum");
const lodash_1 = require("lodash");
const auth_interface_1 = require("../../auth-interface");
const test_node_interface_1 = require("../../test-node-interface");
let TestResourceAuthService = class TestResourceAuthService {
    /**
     * 测试资源授权
     * @param testResourceInfo
     * @param testResourceAuthTree
     */
    async testResourceAuth(testResourceInfo, testResourceAuthTree) {
        if (testResourceInfo.userId !== this.ctx.userId) {
            return new auth_interface_1.SubjectAuthResult(auth_interface_1.SubjectAuthCodeEnum.LoginUserUnauthorized).setErrorMsg('当前用户没有测试权限');
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
            return authResult.setAuthCode(auth_interface_1.SubjectAuthCodeEnum.SubjectContractUnauthorized).setErrorMsg('展品所解决的资源授权不通过').setData({ authFailedResources });
        }
        return authResult.setAuthCode(auth_interface_1.SubjectAuthCodeEnum.BasedOnContractAuthorized);
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
            return authResult;
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
                return authResult.setAuthCode(auth_interface_1.SubjectAuthCodeEnum.SubjectContractUnauthorized).setData({ authFailedResources }).setErrorMsg('测试展品上游链路授权未通过');
            }
        }
        return authResult.setAuthCode(auth_interface_1.SubjectAuthCodeEnum.BasedOnContractAuthorized);
    }
    /**
     * 根据合同计算测试授权结果
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
        const isExistAuthContracts = contracts.some(x => x.isTestAuth);
        if (!isExistAuthContracts) {
            return authResult.setErrorMsg('合约授权未通过').setAuthCode(auth_interface_1.SubjectAuthCodeEnum.SubjectContractUnauthorized);
        }
        return authResult.setAuthCode(auth_interface_1.SubjectAuthCodeEnum.BasedOnContractAuthorized);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdC1yZXNvdXJjZS1hdXRoLXNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvYXBwL3NlcnZpY2UvdGVzdC1yZXNvdXJjZS1hdXRoLXNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0FBQUEsbUNBQXVDO0FBQ3ZDLHFDQUEyQztBQUMzQyxtQ0FBK0M7QUFFL0MseURBQTRFO0FBQzVFLG1FQUdtQztBQUduQyxJQUFhLHVCQUF1QixHQUFwQyxNQUFhLHVCQUF1QjtJQU9oQzs7OztPQUlHO0lBQ0gsS0FBSyxDQUFDLGdCQUFnQixDQUFDLGdCQUFrQyxFQUFFLG9CQUFtRDtRQUUxRyxJQUFJLGdCQUFnQixDQUFDLE1BQU0sS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRTtZQUM3QyxPQUFPLElBQUksa0NBQWlCLENBQUMsb0NBQW1CLENBQUMscUJBQXFCLENBQUMsQ0FBQyxXQUFXLENBQUMsWUFBWSxDQUFDLENBQUM7U0FDckc7UUFFRCxNQUFNLGdCQUFnQixHQUFHLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxnQkFBZ0IsRUFBRSxvQkFBb0IsQ0FBQyxDQUFDO1FBQy9GLE1BQU0sd0JBQXdCLEdBQUcsSUFBSSxDQUFDLHdCQUF3QixDQUFDLGdCQUFnQixFQUFFLG9CQUFvQixDQUFDLENBQUM7UUFDdkcsTUFBTSxDQUFDLGtCQUFrQixFQUFFLDBCQUEwQixDQUFDLEdBQUcsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsZ0JBQWdCLEVBQUUsd0JBQXdCLENBQUMsQ0FBQyxDQUFDO1FBRXpILE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQyxDQUFDLDBCQUEwQixDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsMEJBQTBCLENBQUMsQ0FBQyxDQUFDLGtCQUFrQixDQUFDO0lBQ2xKLENBQUM7SUFFRDs7OztP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