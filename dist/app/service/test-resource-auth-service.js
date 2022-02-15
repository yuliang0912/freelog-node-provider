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
        // 授权树是指定版本的实际依赖推导出来的.所以上抛了但是实际未使用的资源不会体现在授权树分支中(测试资源resolveResource)
        const testResourceResolveResourceIdSet = new Set(testResourceAuthTree.filter(x => x.deep === 1 && x.type === test_node_interface_1.TestResourceOriginType.Resource).map(x => x.id));
        // 过滤排除掉节点解决签约但又未实际使用到的资源,此部分资源不影响授权结果.(按照实用主义原则优化处理)
        const toBeAuthorizedResources = testResourceInfo.resolveResources.filter(x => !x.isSelf && testResourceResolveResourceIdSet.has(x.resourceId));
        const allNodeContractIds = (0, lodash_1.chain)(toBeAuthorizedResources).map(x => x.contracts).flattenDeep().map(x => x.contractId).value();
        const contractMap = await this.outsideApiService.getContractByContractIds(allNodeContractIds, {
            licenseeId: testResourceInfo.nodeId, projection: 'contractId,subjectId,subjectType,authStatus'
        }).then(list => {
            return new Map(list.map(x => [x.contractId, x]));
        });
        const authFailedResources = toBeAuthorizedResources.filter(resolveResource => {
            const contracts = resolveResource.contracts.filter(x => contractMap.has(x.contractId)).map(x => contractMap.get(x.contractId));
            return !this.contractAuth(resolveResource.resourceId, contracts).isAuth;
        });
        if (!(0, lodash_1.isEmpty)(authFailedResources)) {
            return authResult.setAuthCode(egg_freelog_base_1.SubjectAuthCodeEnum.SubjectContractUnauthorized).setErrorMsg('展品所解决的资源授权不通过')
                .setData({ authFailedResources }).setDefaulterIdentityType(auth_interface_1.DefaulterIdentityTypeEnum.Node);
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
        const resourceVersionIds = (0, lodash_1.chain)(testResourceAuthTree).map(x => x.versionId).uniq().value();
        if ((0, lodash_1.isEmpty)(resourceVersionIds)) {
            // 存储对象给默认授权
            return authResult.setAuthCode(egg_freelog_base_1.SubjectAuthCodeEnum.BasedOnDefaultAuth);
        }
        const resourceVersionAuthResults = await this.outsideApiService.getResourceVersionAuthResults(resourceVersionIds, { authType: 'testAuth' });
        for (const resourceVersionAuthResult of resourceVersionAuthResults) {
            const { versionId, resolveResourceAuthResults } = resourceVersionAuthResult;
            if ((0, lodash_1.isEmpty)(resourceVersionAuthResults)) {
                continue;
            }
            const nids = testResourceAuthTree.filter(x => x.versionId === versionId).map(x => x.nid);
            const practicalUsedResources = testResourceAuthTree.filter(x => nids.includes(x.parentNid));
            const authFailedResources = (0, lodash_1.chain)(resolveResourceAuthResults).intersectionBy(practicalUsedResources, 'id').filter(x => !x.authResult?.isAuth).value();
            if (!(0, lodash_1.isEmpty)(authFailedResources)) {
                return authResult.setAuthCode(egg_freelog_base_1.SubjectAuthCodeEnum.SubjectContractUnauthorized)
                    .setReferee(egg_freelog_base_1.SubjectTypeEnum.Resource).setDefaulterIdentityType(auth_interface_1.DefaulterIdentityTypeEnum.Resource)
                    .setData({ authFailedResources }).setErrorMsg('测试展品上游链路授权未通过');
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
        if (!(0, lodash_1.isArray)(contracts) || (0, lodash_1.isEmpty)(contracts)) {
            return authResult.setAuthCode(egg_freelog_base_1.SubjectAuthCodeEnum.SubjectContractNotFound);
        }
        const invalidContracts = contracts.filter(x => x?.subjectType !== egg_freelog_base_1.SubjectTypeEnum.Resource || x?.subjectId !== subjectId);
        if (!(0, lodash_1.isEmpty)(invalidContracts)) {
            return authResult.setErrorMsg('存在无效的标的物合约')
                .setReferee(egg_freelog_base_1.SubjectTypeEnum.Presentable)
                .setDefaulterIdentityType(auth_interface_1.DefaulterIdentityTypeEnum.Node)
                .setData({ invalidContracts }).setAuthCode(egg_freelog_base_1.SubjectAuthCodeEnum.SubjectContractInvalid);
        }
        const isExistAuthContracts = contracts.some(x => x.isAuth || x.isTestAuth);
        if (!isExistAuthContracts) {
            return authResult.setErrorMsg('合约授权未通过')
                .setReferee(egg_freelog_base_1.SubjectTypeEnum.Presentable)
                .setDefaulterIdentityType(auth_interface_1.DefaulterIdentityTypeEnum.Node)
                .setAuthCode(egg_freelog_base_1.SubjectAuthCodeEnum.SubjectContractUnauthorized);
        }
        return authResult.setAuthCode(egg_freelog_base_1.SubjectAuthCodeEnum.BasedOnContractAuthorized);
    }
};
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", Object)
], TestResourceAuthService.prototype, "ctx", void 0);
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", Object)
], TestResourceAuthService.prototype, "outsideApiService", void 0);
TestResourceAuthService = __decorate([
    (0, midway_1.provide)()
], TestResourceAuthService);
exports.TestResourceAuthService = TestResourceAuthService;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdC1yZXNvdXJjZS1hdXRoLXNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvYXBwL3NlcnZpY2UvdGVzdC1yZXNvdXJjZS1hdXRoLXNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0FBQUEsbUNBQXVDO0FBQ3ZDLG1DQUErQztBQUUvQyx5REFBa0Y7QUFDbEYsbUVBS21DO0FBQ25DLHVEQUFzRjtBQUd0RixJQUFhLHVCQUF1QixHQUFwQyxNQUFhLHVCQUF1QjtJQUdoQyxHQUFHLENBQWlCO0lBRXBCLGlCQUFpQixDQUFxQjtJQUV0Qzs7OztPQUlHO0lBQ0gsS0FBSyxDQUFDLGdCQUFnQixDQUFDLGdCQUFrQyxFQUFFLG9CQUFtRDtRQUUxRyxNQUFNLGdCQUFnQixHQUFHLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxnQkFBZ0IsRUFBRSxvQkFBb0IsQ0FBQyxDQUFDO1FBQy9GLE1BQU0sd0JBQXdCLEdBQUcsSUFBSSxDQUFDLHdCQUF3QixDQUFDLGdCQUFnQixFQUFFLG9CQUFvQixDQUFDLENBQUM7UUFDdkcsTUFBTSxDQUFDLGtCQUFrQixFQUFFLDBCQUEwQixDQUFDLEdBQUcsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsZ0JBQWdCLEVBQUUsd0JBQXdCLENBQUMsQ0FBQyxDQUFDO1FBRXpILE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQyxDQUFDLDBCQUEwQixDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsMEJBQTBCLENBQUMsQ0FBQyxDQUFDLGtCQUFrQixDQUFDO0lBQ2xKLENBQUM7SUFFRDs7OztPQUlHO0lBQ0gsS0FBSyxDQUFDLHdCQUF3QixDQUFDLGdCQUFrQyxFQUFFLG9CQUFtRDtRQUVsSCxNQUFNLFVBQVUsR0FBRyxJQUFJLGtDQUFpQixFQUFFLENBQUM7UUFDM0MscUVBQXFFO1FBQ3JFLE1B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