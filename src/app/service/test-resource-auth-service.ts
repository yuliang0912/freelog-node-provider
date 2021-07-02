import {inject, provide} from "midway";
import {chain, isArray, isEmpty} from "lodash";
import {ContractInfo, IOutsideApiService} from "../../interface";
import {SubjectAuthResult} from "../../auth-interface";
import {
    FlattenTestResourceAuthTree, ITestResourceAuthService,
    TestResourceInfo, TestResourceOriginType
} from "../../test-node-interface";
import {SubjectTypeEnum, FreelogContext, SubjectAuthCodeEnum} from 'egg-freelog-base'

@provide()
export class TestResourceAuthService implements ITestResourceAuthService {

    @inject()
    ctx: FreelogContext;
    @inject()
    outsideApiService: IOutsideApiService;

    /**
     * 测试资源授权
     * @param testResourceInfo
     * @param testResourceAuthTree
     */
    async testResourceAuth(testResourceInfo: TestResourceInfo, testResourceAuthTree: FlattenTestResourceAuthTree[]): Promise<SubjectAuthResult> {

        if (testResourceInfo.userId !== this.ctx.userId) {
            return new SubjectAuthResult(SubjectAuthCodeEnum.LoginUserUnauthorized).setErrorMsg('当前用户没有测试权限');
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
    async testResourceNodeSideAuth(testResourceInfo: TestResourceInfo, testResourceAuthTree: FlattenTestResourceAuthTree[]): Promise<SubjectAuthResult> {

        const authResult = new SubjectAuthResult();
        // 授权树是指定版本的实际依赖推导出来的.所以上抛了但是实际未使用的资源不会体现在授权树分支中.(测试资源resolveResource)
        const testResourceResolveResourceIdSet = new Set(testResourceAuthTree.filter(x => x.deep === 1 && x.type === TestResourceOriginType.Resource).map(x => x.id));
        // 过滤排除掉节点解决签约但又未实际使用到的资源,此部分资源不影响授权结果.(按照实用主义原则优化处理)
        const toBeAuthorizedResources = testResourceInfo.resolveResources.filter(x => testResourceResolveResourceIdSet.has(x.resourceId));
        const allNodeContractIds = chain(toBeAuthorizedResources).map(x => x.contracts).flattenDeep().map(x => x.contractId).value();

        const contractMap = await this.outsideApiService.getContractByContractIds(allNodeContractIds, {
            licenseeId: testResourceInfo.nodeId, projection: 'contractId,subjectId,subjectType,authStatus'
        }).then(list => {
            return new Map(list.map(x => [x.contractId, x]));
        });

        const authFailedResources = toBeAuthorizedResources.filter(resolveResource => {
            const contracts = resolveResource.contracts.filter(x => contractMap.has(x.contractId)).map(x => contractMap.get(x.contractId));
            return !this.contractAuth(resolveResource.resourceId, contracts).isAuth;
        });

        if (!isEmpty(authFailedResources)) {
            return authResult.setAuthCode(SubjectAuthCodeEnum.SubjectContractUnauthorized).setErrorMsg('展品所解决的资源授权不通过').setData({authFailedResources});
        }

        return authResult.setAuthCode(SubjectAuthCodeEnum.BasedOnContractAuthorized);
    }

    /**
     * 展品上游合约授权,需要对应的标的物服务做出授权结果
     * @param testResourceInfo
     * @param testResourceAuthTree
     */
    async testResourceUpstreamAuth(testResourceInfo: TestResourceInfo, testResourceAuthTree: FlattenTestResourceAuthTree[]): Promise<SubjectAuthResult> {

        // 只有资源需要授权,存储对象不需要授权.
        testResourceAuthTree = testResourceAuthTree.filter(x => x.type === TestResourceOriginType.Resource);

        const authResult = new SubjectAuthResult();
        const resourceVersionIds = chain(testResourceAuthTree).map(x => x.versionId).uniq().value();
        if (isEmpty(resourceVersionIds)) {
            return authResult;
        }

        const resourceVersionAuthResults = await this.outsideApiService.getResourceVersionAuthResults(resourceVersionIds, {authType: 'testAuth'});

        for (const resourceVersionAuthResult of resourceVersionAuthResults) {
            const {versionId, resolveResourceAuthResults} = resourceVersionAuthResult;
            if (isEmpty(resourceVersionAuthResults)) {
                continue;
            }
            const nids = testResourceAuthTree.filter(x => x.versionId === versionId).map(x => x.nid);
            const practicalUsedResources = testResourceAuthTree.filter(x => nids.includes(x.parentNid));
            const authFailedResources = chain(resolveResourceAuthResults).intersectionBy(practicalUsedResources, 'id').filter(x => !x.authResult?.isAuth).value();
            if (!isEmpty(authFailedResources)) {
                return authResult.setAuthCode(SubjectAuthCodeEnum.SubjectContractUnauthorized).setData({authFailedResources}).setErrorMsg('测试展品上游链路授权未通过');
            }
        }

        return authResult.setAuthCode(SubjectAuthCodeEnum.BasedOnContractAuthorized);
    }

    /**
     * 根据合同计算测试授权结果
     * @param subjectId
     * @param contracts
     */
    contractAuth(subjectId: string, contracts: ContractInfo[]): SubjectAuthResult {

        const authResult = new SubjectAuthResult();
        if (!isArray(contracts) || isEmpty(contracts)) {
            return authResult.setAuthCode(SubjectAuthCodeEnum.SubjectContractNotFound);
        }

        const invalidContracts = contracts.filter(x => x?.subjectType !== SubjectTypeEnum.Resource || x?.subjectId !== subjectId);
        if (!isEmpty(invalidContracts)) {
            return authResult.setErrorMsg('存在无效的标的物合约').setData({invalidContracts}).setAuthCode(SubjectAuthCodeEnum.SubjectContractInvalid);
        }

        const isExistAuthContracts = contracts.some(x => x.isTestAuth);
        if (!isExistAuthContracts) {
            return authResult.setErrorMsg('合约授权未通过').setAuthCode(SubjectAuthCodeEnum.SubjectContractUnauthorized);
        }

        return authResult.setAuthCode(SubjectAuthCodeEnum.BasedOnContractAuthorized);
    }
}
