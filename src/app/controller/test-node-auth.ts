import {IOutsideApiService} from '../../interface';
import {controller, get, inject, provide} from 'midway';
import {ITestNodeService, ITestResourceAuthService, TestResourceOriginType} from "../../test-node-interface";
import {IdentityTypeEnum, visitorIdentityValidator, CommonRegex, ArgumentError, FreelogContext} from 'egg-freelog-base';

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
        ctx.validateParams();

        const testResourceInfo = await this.testNodeService.findOneTestResource({testResourceId});
        this.ctx.entityNullValueAndUserAuthorizationCheck(testResourceInfo, {
            msg: this.ctx.gettext('params-validate-failed', 'testResourceId'),
        });

        const testResourceTreeInfo = await this.testNodeService.findOneTestResourceTreeInfo({testResourceId}, 'authTree dependencyTree');
        const testResourceAuthResult = await this.testResourceAuthService.testResourceAuth(testResourceInfo, testResourceTreeInfo.authTree);
        await this.testResourceAuthResponseHandler.handle(testResourceInfo, testResourceTreeInfo.dependencyTree, testResourceAuthResult, parentNid, subEntityIdOrName, subEntityType);
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
