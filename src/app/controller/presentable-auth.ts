import {differenceWith, first, isEmpty} from 'lodash';
import {controller, get, inject, provide} from 'midway';
import {
    IPresentableAuthResponseHandler, IPresentableAuthService, IPresentableService, IPresentableVersionService
} from '../../interface';
import {
    ArgumentError,
    IdentityTypeEnum,
    visitorIdentityValidator,
    CommonRegex,
    FreelogContext,
    SubjectAuthCodeEnum,
    ResourceTypeEnum
} from 'egg-freelog-base';
import {SubjectAuthResult} from '../../auth-interface';

@provide()
@controller('/v2/auths/presentables') // 统一URL v2/auths/:subjectTypes/:subjectId
export class ResourceAuthController {

    @inject()
    ctx: FreelogContext;
    @inject()
    presentableCommonChecker;
    @inject()
    presentableService: IPresentableService;
    @inject()
    presentableAuthService: IPresentableAuthService;
    @inject()
    presentableVersionService: IPresentableVersionService;
    @inject()
    presentableAuthResponseHandler: IPresentableAuthResponseHandler;

    /**
     * 展品服务的色块(目前此接口未使用,网关层面通过已通过mock实现)
     */
    @get('/serviceStates')
    async serviceStates() {
        this.ctx.success([
            {name: 'active', type: 'authorization', value: 1},
            {name: 'testActive', type: 'testAuthorization', value: 2}
        ]);
    }

    /**
     * 通过展品ID获取展品并且授权
     */
    @get('/:subjectId/(result|info|resourceInfo|fileStream)', {middleware: ['authExceptionHandlerMiddleware']})
    @visitorIdentityValidator(IdentityTypeEnum.LoginUser | IdentityTypeEnum.UnLoginUser | IdentityTypeEnum.InternalClient)
    async presentableAuth() {

        const {ctx} = this;
        const presentableId = ctx.checkParams('subjectId').isPresentableId().value;
        const parentNid = ctx.checkQuery('parentNid').optional().value;
        const subResourceIdOrName = ctx.checkQuery('subResourceIdOrName').optional().decodeURIComponent().value;
        const subResourceFile = ctx.checkQuery('subResourceFile').optional().decodeURIComponent().value;
        ctx.validateParams();

        let presentableInfo = await this.presentableService.findById(presentableId);
        if (!presentableInfo) {
            const subjectAuthResult = new SubjectAuthResult(SubjectAuthCodeEnum.SubjectNotFound).setErrorMsg('标的物不存在,请检查参数');
            return ctx.success(subjectAuthResult);
        }
        if (presentableInfo.onlineStatus !== 1) {
            const subjectAuthResult = new SubjectAuthResult(SubjectAuthCodeEnum.SubjectNotOnline).setErrorMsg('标的物已下线');
            return ctx.success(subjectAuthResult);
        }
        if (subResourceFile && ![ResourceTypeEnum.THEME, ResourceTypeEnum.WIDGET].includes(presentableInfo.resourceInfo.resourceType.toLowerCase() as any)) {
            throw new ArgumentError(ctx.gettext('params-validate-failed', 'subResourceFile'));
        }
        presentableInfo = await this.presentableService.fillPresentablePolicyInfo([presentableInfo], true).then(first);
        const presentableVersionInfo = await this.presentableVersionService.findById(presentableId, presentableInfo.version, 'presentableId dependencyTree authTree versionProperty');
        const presentableAuthResult = await this.presentableAuthService.presentableAuth(presentableInfo, presentableVersionInfo.authTree);

        await this.presentableAuthResponseHandler.handle(presentableInfo, presentableVersionInfo, presentableAuthResult, parentNid, subResourceIdOrName, subResourceFile);
    }

    /**
     * 批量展品节点侧以及上游链路授权(不包含C端用户)
     */
    @get('/nodes/:nodeId/batchAuth/result')
    @visitorIdentityValidator(IdentityTypeEnum.LoginUser)
    async presentableBatchAuth() {

        const {ctx} = this;
        const nodeId = ctx.checkParams('nodeId').exist().isInt().gt(0).value;
        // 1:节点侧  2:上游侧  3:节点侧以及上游侧 4:全链路(包含用户)
        const authType = ctx.checkQuery('authType').exist().toInt().in([1, 2, 3, 4]).value;
        const presentableIds = ctx.checkQuery('presentableIds').exist().isSplitMongoObjectId().toSplitArray().len(1, 100).value;
        ctx.validateParams();

        const presentables = await this.presentableService.find({nodeId, _id: {$in: presentableIds}});
        const invalidPresentableIds = differenceWith(presentableIds, presentables, (x: string, y) => x === y.presentableId);

        if (!isEmpty(invalidPresentableIds)) {
            const subjectAuthResult = new SubjectAuthResult(SubjectAuthCodeEnum.SubjectNotFound).setData({invalidPresentableIds}).setErrorMsg('标的物不存在,请检查参数');
            return ctx.success(subjectAuthResult);
        }

        const presentableVersionIds = presentables.map(x => this.presentableCommonChecker.generatePresentableVersionId(x.presentableId, x.version));
        const presentableAuthTreeMap = await this.presentableVersionService.findByIds(presentableVersionIds, 'presentableId authTree').then(list => {
            return new Map(list.map(x => [x.presentableId, x.authTree]));
        });

        const authFunc = authType === 1 ? this.presentableAuthService.presentableNodeSideAuth :
            authType === 2 ? this.presentableAuthService.presentableUpstreamAuth :
                authType === 3 ? this.presentableAuthService.presentableNodeSideAndUpstreamAuth :
                    authType === 4 ? this.presentableAuthService.presentableAuth : null;

        const tasks = [];
        const returnResults = [];
        for (const presentableInfo of presentables) {
            const task = authFunc.call(this.presentableAuthService, presentableInfo, presentableAuthTreeMap.get(presentableInfo.presentableId)).then(authResult => returnResults.push({
                presentableId: presentableInfo.presentableId,
                presentableName: presentableInfo.presentableName,
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
     * 通过节点ID和资源ID获取展品,并且授权
     */
    @get('/nodes/:nodeId/:resourceIdOrName/(result|info|resourceInfo|fileStream)', {middleware: ['authExceptionHandlerMiddleware']})
    @visitorIdentityValidator(IdentityTypeEnum.LoginUser | IdentityTypeEnum.LoginUser | IdentityTypeEnum.InternalClient)
    async nodeResourceAuth() {

        const {ctx} = this;
        const resourceIdOrName = ctx.checkParams('resourceIdOrName').exist().decodeURIComponent().value;
        const nodeId = ctx.checkParams('nodeId').exist().isInt().gt(0).value;
        const parentNid = ctx.checkQuery('parentNid').optional().value;
        const subResourceIdOrName = ctx.checkQuery('subResourceIdOrName').optional().decodeURIComponent().value;
        const subResourceFile = ctx.checkQuery('subResourceFile').optional().decodeURIComponent().value;
        ctx.validateParams();

        const condition = {nodeId};
        if (CommonRegex.mongoObjectId.test(resourceIdOrName)) {
            condition['resourceInfo.resourceId'] = resourceIdOrName;
        } else if (CommonRegex.fullResourceName.test(resourceIdOrName)) {
            condition['resourceInfo.resourceName'] = resourceIdOrName;
        } else {
            throw new ArgumentError(ctx.gettext('params-format-validate-failed', 'resourceIdOrName'));
        }

        let presentableInfo = await this.presentableService.findOne(condition);
        if (!presentableInfo) {
            const subjectAuthResult = new SubjectAuthResult(SubjectAuthCodeEnum.SubjectNotFound).setErrorMsg('标的物不存在,请检查参数');
            return ctx.success(subjectAuthResult);
        }
        if (presentableInfo.onlineStatus !== 1) {
            const subjectAuthResult = new SubjectAuthResult(SubjectAuthCodeEnum.SubjectNotOnline).setErrorMsg('标的物已下线');
            return ctx.success(subjectAuthResult);
        }
        if (subResourceFile && ![ResourceTypeEnum.THEME, ResourceTypeEnum.WIDGET].includes(presentableInfo.resourceInfo.resourceType.toLowerCase() as any)) {
            throw new ArgumentError(ctx.gettext('params-validate-failed', 'subResourceFile'));
        }

        presentableInfo = await this.presentableService.fillPresentablePolicyInfo([presentableInfo], true).then(first);

        const presentableVersionInfo = await this.presentableVersionService.findById(presentableInfo.presentableId, presentableInfo.version, 'dependencyTree authTree versionProperty');
        const presentableAuthResult = await this.presentableAuthService.presentableAuth(presentableInfo, presentableVersionInfo.authTree);

        await this.presentableAuthResponseHandler.handle(presentableInfo, presentableVersionInfo, presentableAuthResult, parentNid, subResourceIdOrName, subResourceFile);
    }
}
