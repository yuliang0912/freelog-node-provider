import {controller, get, inject, priority, provide} from 'midway';
import {
    ITestNodeService, ITestResourceAuthService, TestResourceInfo
} from '../../test-node-interface';
import {
    IdentityTypeEnum, visitorIdentityValidator, CommonRegex,
    FreelogContext, SubjectAuthCodeEnum
} from 'egg-freelog-base';
import {differenceWith, first, isEmpty} from 'lodash';
import {DefaulterIdentityTypeEnum, SubjectAuthResult} from '../../auth-interface';
import {TestResourceAdapter} from '../../extend/exhibit-adapter/test-resource-adapter';
import {ExhibitAuthResponseHandler} from '../../extend/auth-response-handler/exhibit-auth-response-handler';
import {ArticleTypeEnum} from '../../enum';

@provide()
@priority(1)
@controller('/v2/auths/exhibits/:nodeId/test')
export class TestResourceSubjectAuthController {

    @inject()
    ctx: FreelogContext;
    @inject()
    testNodeService: ITestNodeService;
    @inject()
    testResourceAuthService: ITestResourceAuthService;
    @inject()
    testResourceAdapter: TestResourceAdapter;
    @inject()
    exhibitAuthResponseHandler: ExhibitAuthResponseHandler;

    /**
     * 通过展品ID获取展品
     */
    @get('/:exhibitId/(result|info|fileStream)')
    @visitorIdentityValidator(IdentityTypeEnum.LoginUser | IdentityTypeEnum.UnLoginUser | IdentityTypeEnum.InternalClient)
    async exhibitAuth() {
        const {ctx} = this;
        const nodeId = ctx.checkParams('nodeId').exist().isInt().gt(0).value;
        const testResourceId = ctx.checkParams('exhibitId').isMd5().value;
        const parentNid = ctx.checkQuery('parentNid').optional().value;
        const subArticleIdOrName = ctx.checkQuery('subArticleIdOrName').optional().decodeURIComponent().value;
        const subArticleType = ctx.checkQuery('subArticleType').optional().in([1, 2, 3, 4, 5]).value;
        const subFilePath = ctx.checkQuery('subFilePath').optional().decodeURIComponent().value;

        if (ctx.errors.length) {
            const subjectAuthResult = new SubjectAuthResult(SubjectAuthCodeEnum.AuthArgumentsError).setErrorMsg('参数校验失败').setData({
                errors: ctx.errors
            });
            this.exhibitAuthResponseHandler.exhibitAuthFailedResponseHandle(subjectAuthResult);
        }
        const testResourceInfo = await this.testNodeService.findOneTestResource({nodeId, testResourceId});
        await this._testResourceAuthHandle(testResourceInfo, parentNid, subArticleIdOrName, subArticleType, subFilePath);
    }

    /**
     * 测试资源或者子依赖授权,根据节点ID和源实体ID查找测试资源.
     */
    @get('/articles/:articleIdOrName/(result|info|fileStream)')
    @visitorIdentityValidator(IdentityTypeEnum.LoginUser)
    async exhibitAuthByNodeAndArticle() {

        const {ctx} = this;
        const nodeId = ctx.checkParams('nodeId').exist().isInt().gt(0).value;
        const articleIdOrName = ctx.checkParams('articleIdOrName').exist().decodeURIComponent().value;
        const parentNid = ctx.checkQuery('parentNid').optional().value;
        const subArticleIdOrName = ctx.checkQuery('subArticleIdOrName').optional().decodeURIComponent().value;
        const subArticleType = ctx.checkQuery('subArticleType').optional().in([1, 2, 3, 4, 5]).value;
        const subFilePath = ctx.checkQuery('subFilePath').optional().decodeURIComponent().value;

        if (ctx.errors.length) {
            const subjectAuthResult = new SubjectAuthResult(SubjectAuthCodeEnum.AuthArgumentsError).setErrorMsg('参数校验失败').setData({
                errors: ctx.errors
            });
            this.exhibitAuthResponseHandler.exhibitAuthFailedResponseHandle(subjectAuthResult);
        }
        const condition: any = {nodeId};
        if (CommonRegex.mongoObjectId.test(articleIdOrName)) {
            condition['originInfo.id'] = articleIdOrName;
        } else if (articleIdOrName.includes('/')) {
            condition['originInfo.name'] = articleIdOrName;
        } else {
            const subjectAuthResult = new SubjectAuthResult(SubjectAuthCodeEnum.AuthArgumentsError).setErrorMsg('参数articleIdOrName校验失败').setData({
                errors: ctx.errors
            });
            this.exhibitAuthResponseHandler.exhibitAuthFailedResponseHandle(subjectAuthResult);
        }

        const testResourceInfo = await this.testNodeService.findOneTestResource(condition);
        await this._testResourceAuthHandle(testResourceInfo, parentNid, subArticleIdOrName, subArticleType, subFilePath);
    }

    /**
     * 测试资源批量授权
     */
    @get('/batchAuth/results')
    @visitorIdentityValidator(IdentityTypeEnum.LoginUser)
    async testResourceBatchAuth() {
        const {ctx} = this;
        const nodeId = ctx.checkParams('nodeId').exist().isInt().gt(0).value;
        // 1:节点侧 2:上游侧  3:节点侧以及上游侧
        const authType = ctx.checkQuery('authType').exist().toInt().in([1, 2, 3]).value;
        const testResourceIds = ctx.checkQuery('exhibitIds').exist().isSplitMd5().toSplitArray().len(1, 60).value;
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
            const subjectAuthResult = new SubjectAuthResult(SubjectAuthCodeEnum.LoginUserUnauthorized).setErrorMsg(this.ctx.gettext('user-authorization-failed')).setData({
                testResource: first(testResources), userId: this.ctx.userId
            });
            return ctx.success(subjectAuthResult);
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
                exhibitId: testResource.testResourceId,
                exhibitName: testResource.testResourceName,
                authCode: authResult.authCode,
                referee: authResult.referee,
                defaulterIdentityType: authResult.defaulterIdentityType,
                isAuth: authResult.isAuth,
                error: authResult.errorMsg
            }));
            tasks.push(task);
        }

        await Promise.all(tasks);
        ctx.success(returnResults);
    }

    /**
     * 测试展品授权处理
     * @param testResource
     * @param parentNid
     * @param subArticleIdOrName
     * @param subArticleType
     * @param subFilePath
     */
    async _testResourceAuthHandle(testResource: TestResourceInfo, parentNid: string, subArticleIdOrName: string, subArticleType: ArticleTypeEnum, subFilePath: string) {
        if (!testResource) {
            const subjectAuthResult = new SubjectAuthResult(SubjectAuthCodeEnum.SubjectNotFound).setErrorMsg('展品不存在,请检查参数');
            this.exhibitAuthResponseHandler.exhibitAuthFailedResponseHandle(subjectAuthResult);
        }
        if (testResource.userId !== this.ctx.userId) {
            const subjectAuthResult = new SubjectAuthResult(SubjectAuthCodeEnum.LoginUserUnauthorized).setDefaulterIdentityType(DefaulterIdentityTypeEnum.ClientUser).setErrorMsg('当前用户没有测试权限');
            this.exhibitAuthResponseHandler.exhibitAuthFailedResponseHandle(subjectAuthResult);
        }
        
        const testResourceTreeInfo = await this.testNodeService.findOneTestResourceTreeInfo({testResourceId: testResource.testResourceId}, 'authTree dependencyTree');
        const testResourceAuthResult = await this.testResourceAuthService.testResourceAuth(testResource, testResourceTreeInfo.authTree);

        const exhibitInfo = this.testResourceAdapter.testResourceWrapToExhibitInfo(testResource, testResourceTreeInfo);
        await this.exhibitAuthResponseHandler.handle(exhibitInfo, testResourceAuthResult, parentNid, subArticleIdOrName, subArticleType, subFilePath);
    }
}
