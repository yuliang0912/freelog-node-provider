import {IOutsideApiService} from '../../interface';
import {controller, get, inject, provide} from 'midway';
import {
    ITestNodeService,
    ITestResourceAuthService,
    TestResourceOriginType
} from '../../test-node-interface';
import {
    IdentityTypeEnum,
    visitorIdentityValidator,
    CommonRegex,
    ArgumentError,
    FreelogContext,
    SubjectAuthCodeEnum
} from 'egg-freelog-base';
import {differenceWith, first, isEmpty} from 'lodash';
import {SubjectAuthResult} from '../../auth-interface';

@provide()
@controller('/v2/auths/testResources') // 统一URL v2/auths/:subjectType
export class TestNodeAuthController {

    @inject()
    ctx: FreelogContext;
    @inject()
    testNodeService: ITestNodeService;
    @inject()
    outsideApiService: IOutsideApiService;
    @inject()
    testResourceAuthService: ITestResourceAuthService;
    @inject()
    testResourceAuthResponseHandler;

    /**
     * 测试资源或者子依赖授权
     */
    @get('/:subjectId/(result|info|fileStream)', {middleware: ['authExceptionHandlerMiddleware']})
    @visitorIdentityValidator(IdentityTypeEnum.LoginUser)
    async testResourceAuth() {

        const {ctx} = this;
        const testResourceId = ctx.checkParams('subjectId').isMd5().value;
        // 以下参数作为测试资源的子依赖授权,否则可以不选
        const parentNid = ctx.checkQuery('parentNid').optional().value;
        const subEntityIdOrName = ctx.checkQuery('subEntityIdOrName').optional().decodeURIComponent().value;
        const subEntityType = ctx.checkQuery('subEntityType').optional().value;
        const subEntityFile = ctx.checkQuery('subEntityFile').optional().decodeURIComponent().value;
        ctx.validateParams();

        const testResourceInfo = await this.testNodeService.findOneTestResource({testResourceId});
        this.ctx.entityNullValueAndUserAuthorizationCheck(testResourceInfo, {
            msg: this.ctx.gettext('params-validate-failed', 'testResourceId'),
        });

        const testResourceTreeInfo = await this.testNodeService.findOneTestResourceTreeInfo({testResourceId}, 'authTree dependencyTree');
        const testResourceAuthResult = await this.testResourceAuthService.testResourceAuth(testResourceInfo, testResourceTreeInfo.authTree);
        await this.testResourceAuthResponseHandler.handle(testResourceInfo, testResourceTreeInfo.dependencyTree, testResourceAuthResult, parentNid, subEntityIdOrName, subEntityType, subEntityFile);
    }

    /**
     * 测试资源批量授权
     */
    @get('/nodes/:nodeId/batchAuth/result')
    @visitorIdentityValidator(IdentityTypeEnum.LoginUser)
    async testResourceBatchAuth() {
        const {ctx} = this;
        const nodeId = ctx.checkParams('nodeId').exist().isInt().gt(0).value;
        // 1:节点侧 2:上游侧  3:节点侧以及上游侧
        const authType = ctx.checkQuery('authType').exist().toInt().in([1, 2, 3]).value;
        const testResourceIds = ctx.checkQuery('testResourceIds').exist().isSplitMd5().toSplitArray().len(1, 60).value;
        ctx.validateParams();

        const testResources = await this.testNodeService.findTestResources({
            nodeId, testResourceId: {$in: testResourceIds}
        }, 'testResourceId testResourceName userId nodeId resolveResources');
        const invalidTestResourceIds = differenceWith(testResourceIds, testResources, (x: string, y) => x === y.testResourceId);
        if (!isEmpty(invalidTestResourceIds)) {
            const subjectAuthResult = new SubjectAuthResult(SubjectAuthCodeEnum.SubjectNotFound).setData({invalidTestResourceIds}).setErrorMsg('标的物不存在,请检查参数');
            return ctx.success(subjectAuthResult);
        }
        if (first(testResources).userId !== this.ctx.userId) {
            return new SubjectAuthResult(SubjectAuthCodeEnum.LoginUserUnauthorized).setErrorMsg(this.ctx.gettext('user-authorization-failed'));
        }

        const testResourceAuthTreeMap = await this.testNodeService.findTestResourceTreeInfos({
            nodeId, testResourceId: {$in: testResourceIds}
        }, 'testResourceId authTree').then(list => {
            return new Map(list.map(x => [x.testResourceId, x.authTree]));
        });

        const authFunc = authType === 1 ? this.testResourceAuthService.testResourceNodeSideAuth :
            authType === 2 ? this.testResourceAuthService.testResourceUpstreamAuth :
                authType === 3 ? this.testResourceAuthService.testResourceAuth : null;

        const tasks = [];
        const returnResults = [];
        for (const testResource of testResources) {
            const task = authFunc.call(this.testResourceAuthService, testResource, testResourceAuthTreeMap.get(testResource.testResourceId)).then(authResult => returnResults.push({
                testResourceId: testResource.testResourceId,
                testResourceName: testResource.testResourceName,
                referee: authResult.referee,
                authCode: authResult.authCode,
                isAuth: authResult.isAuth,
                error: authResult.errorMsg
            }));
            tasks.push(task);
        }

        await Promise.all(tasks).then(() => ctx.success(returnResults));
    }

    /**
     * 测试资源或者子依赖授权,根据节点ID和源实体ID查找测试资源.
     */
    @get('/nodes/:nodeId/:entityIdOrName/(result|info|fileSteam)', {middleware: ['authExceptionHandlerMiddleware']})
    @visitorIdentityValidator(IdentityTypeEnum.LoginUser)
    async nodeTestResourceAuth() {

        const {ctx} = this;
        const nodeId = ctx.checkParams('nodeId').exist().isInt().gt(0).value;
        const entityIdOrName = ctx.checkParams('entityIdOrName').exist().decodeURIComponent().value;
        const entityType = ctx.checkQuery('subEntityType').optional().in([TestResourceOriginType.Resource, TestResourceOriginType.Object]).value;
        // 以下参数用于测试资源的子依赖授权
        const parentNid = ctx.checkQuery('parentNid').optional().value;
        const subEntityIdOrName = ctx.checkQuery('subEntityIdOrName').optional().decodeURIComponent().value;
        const subEntityType = ctx.checkQuery('subEntityType').optional().value;
        ctx.validateParams();

        const condition: any = {nodeId};
        if (CommonRegex.mongoObjectId.test(entityIdOrName)) {
            condition['originInfo.id'] = entityIdOrName;
        } else if (entityIdOrName.includes('/')) {
            condition['originInfo.name'] = entityIdOrName;
        } else {
            throw new ArgumentError(ctx.gettext('params-format-validate-failed', 'resourceIdOrName'));
        }
        if (entityType) {
            condition['originInfo.type'] = entityType;
        }

        const testResourceInfo = await this.testNodeService.findOneTestResource(condition);
        ctx.entityNullObjectCheck(testResourceInfo);

        const testResourceTreeInfo = await this.testNodeService.findOneTestResourceTreeInfo({testResourceId: testResourceInfo.testResourceId}, 'authTree dependencyTree');
        const testResourceAuthResult = await this.testResourceAuthService.testResourceAuth(testResourceInfo, testResourceTreeInfo.authTree);

        await this.testResourceAuthResponseHandler.handle(testResourceInfo, testResourceTreeInfo.dependencyTree, testResourceAuthResult, parentNid, subEntityIdOrName, subEntityType);
    }
}
