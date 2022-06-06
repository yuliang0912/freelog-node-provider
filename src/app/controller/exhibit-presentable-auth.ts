import {differenceWith, first, isEmpty} from 'lodash';
import {controller, get, inject, provide} from 'midway';
import {
    ExhibitInfo,
    IPresentableAuthService,
    IPresentableService,
    IPresentableVersionService,
    PresentableInfo
} from '../../interface';
import {
    CommonRegex,
    FreelogContext,
    IdentityTypeEnum,
    ResourceTypeEnum,
    SubjectAuthCodeEnum,
    visitorIdentityValidator
} from 'egg-freelog-base';
import {SubjectAuthResult} from '../../auth-interface';
import {ExhibitAuthResponseHandler} from '../../extend/auth-response-handler/exhibit-auth-response-handler';
import {PresentableAdapter} from '../../extend/exhibit-adapter/presentable-adapter';
import {ArticleTypeEnum} from '../../enum';

@provide()
@controller('/v2/auths/exhibits/:nodeId')
export class PresentableSubjectAuthController {

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
    presentableAdapter: PresentableAdapter;
    @inject()
    exhibitAuthResponseHandler: ExhibitAuthResponseHandler;

    /**
     * 通过展品ID获取展品
     */
    @get('/:exhibitId/(result|info|fileStream)')
    @visitorIdentityValidator(IdentityTypeEnum.LoginUser | IdentityTypeEnum.UnLoginUser | IdentityTypeEnum.InternalClient)
    async exhibitAuth() {
        const {ctx} = this;
        const nodeId = ctx.checkParams('nodeId').exist().toInt().gt(0).value;
        const presentableId = ctx.checkParams('exhibitId').isPresentableId().value;
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
        const presentableInfo = await this.presentableService.findOne({nodeId, _id: presentableId});
        return this._presentableAuthHandle(presentableInfo, parentNid, subArticleIdOrName, subArticleType, subFilePath);
    }

    /**
     * 通过节点ID和作品ID获取展品
     */
    @get('/articles/:articleIdOrName/(result|info|fileStream)')
    @visitorIdentityValidator(IdentityTypeEnum.LoginUser | IdentityTypeEnum.LoginUser | IdentityTypeEnum.InternalClient)
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

        const condition = {nodeId};
        if (CommonRegex.mongoObjectId.test(articleIdOrName)) {
            condition['resourceInfo.resourceId'] = articleIdOrName;
        } else if (CommonRegex.fullResourceName.test(articleIdOrName)) {
            condition['resourceInfo.resourceName'] = articleIdOrName;
        } else {
            const subjectAuthResult = new SubjectAuthResult(SubjectAuthCodeEnum.AuthArgumentsError).setErrorMsg('参数校验失败');
            this.exhibitAuthResponseHandler.exhibitAuthFailedResponseHandle(subjectAuthResult);
        }

        const presentableInfo = await this.presentableService.findOne(condition);
        await this._presentableAuthHandle(presentableInfo, parentNid, subArticleIdOrName, subArticleType, subFilePath);
    }

    /**
     * 批量展品节点侧以及上游链路授权(不包含C端用户)
     */
    @get('/batchAuth/results')
    async exhibitBatchAuth() {

        const {ctx} = this;
        const nodeId = ctx.checkParams('nodeId').exist().isInt().gt(0).value;
        // 1:节点侧 2:上游侧 3:节点侧以及上游侧 4:全链路(包含用户)
        const authType = ctx.checkQuery('authType').exist().toInt().in([1, 2, 3, 4]).value;
        const exhibitIds = ctx.checkQuery('exhibitIds').exist().isSplitMongoObjectId().toSplitArray().len(1, 100).value;
        ctx.validateParams();

        let presentables = await this.presentableService.find({nodeId, _id: {$in: exhibitIds}});
        const invalidPresentableIds = differenceWith(exhibitIds, presentables, (x: string, y) => x === y.presentableId);

        if (!isEmpty(invalidPresentableIds)) {
            const subjectAuthResult = new SubjectAuthResult(SubjectAuthCodeEnum.SubjectNotFound).setData({invalidPresentableIds}).setErrorMsg('标的物不存在,请检查参数');
            return ctx.success(subjectAuthResult);
        }

        const presentableVersionIds = presentables.map(x => this.presentableCommonChecker.generatePresentableVersionId(x.presentableId, x.version));
        const presentableAuthTreeMap = await this.presentableVersionService.findByIds(presentableVersionIds, 'presentableId authTree').then(list => {
            return new Map(list.map(x => [x.presentableId, x.authTree]));
        });

        if (authType === 4) {
            presentables = await this.presentableService.fillPresentablePolicyInfo(presentables, true);
        }

        const authFunc = authType === 1 ? this.presentableAuthService.presentableNodeSideAuth :
            authType === 2 ? this.presentableAuthService.presentableUpstreamAuth :
                authType === 3 ? this.presentableAuthService.presentableNodeSideAndUpstreamAuth :
                    authType === 4 ? this.presentableAuthService.presentableAuth : null;

        const tasks = [];
        const returnResults = [];
        for (const presentableInfo of presentables) {
            const task = authFunc.call(this.presentableAuthService, presentableInfo, presentableAuthTreeMap.get(presentableInfo.presentableId)).then(authResult => returnResults.push({
                exhibitId: presentableInfo.presentableId,
                exhibitName: presentableInfo.presentableName,
                authCode: authResult.authCode,
                referee: authResult.referee,
                defaulterIdentityType: authResult.defaulterIdentityType,
                isAuth: authResult.isAuth,
                errorMsg: authResult.errorMsg
            }));
            tasks.push(task);
        }

        await Promise.all(tasks).then(() => ctx.success(returnResults));
    }

    /**
     * 展品授权处理
     * @param presentableInfo
     * @param parentNid
     * @param subArticleName
     * @param subArticleType
     * @param subFilePath
     */
    async _presentableAuthHandle(presentableInfo: PresentableInfo, parentNid: string, subArticleName: string, subArticleType: ArticleTypeEnum, subFilePath: string) {
        if (!presentableInfo) {
            const subjectAuthResult = new SubjectAuthResult(SubjectAuthCodeEnum.SubjectNotFound).setErrorMsg('展品不存在,请检查参数');
            this.exhibitAuthResponseHandler.exhibitAuthFailedResponseHandle(subjectAuthResult);
        }
        const exhibitPartialInfo: Partial<ExhibitInfo> = {
            exhibitId: presentableInfo.presentableId,
            exhibitName: presentableInfo.presentableName
        };
        if (subFilePath && ![ResourceTypeEnum.THEME, ResourceTypeEnum.WIDGET].includes(presentableInfo.resourceInfo.resourceType.toLowerCase() as any)) {
            const subjectAuthResult = new SubjectAuthResult(SubjectAuthCodeEnum.AuthArgumentsError).setErrorMsg('参数subFilePath校验失败');
            this.exhibitAuthResponseHandler.exhibitAuthFailedResponseHandle(subjectAuthResult, exhibitPartialInfo);
        }

        presentableInfo = await this.presentableService.fillPresentablePolicyInfo([presentableInfo], true).then(first);
        const presentableVersionInfo = await this.presentableVersionService.findById(presentableInfo.presentableId, presentableInfo.version, 'presentableId dependencyTree authTree versionProperty');
        const presentableAuthResult = await this.presentableAuthService.presentableAuth(presentableInfo, presentableVersionInfo.authTree);
        const exhibitInfo = this.presentableAdapter.presentableWrapToExhibitInfo(presentableInfo, presentableVersionInfo);
        return this.exhibitAuthResponseHandler.handle(exhibitInfo, presentableAuthResult, parentNid, subArticleName, subArticleType, subFilePath);
    }
}
