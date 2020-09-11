import {controller, get, inject, provide} from 'midway';
import {
    IOutsideApiService, IPresentableAuthService,
    IPresentableService, IPresentableVersionService
} from '../../interface';
import {fullResourceName, mongoObjectId} from 'egg-freelog-base/app/extend/helper/common_regex';
import {ArgumentError, LoginUser, UnLoginUser, InternalClient} from 'egg-freelog-base/index';
import {visitorIdentity} from "../../extend/vistorIdentityDecorator";

@provide()
@controller('/v2/auths/presentable') // 统一URL v2/auths/:subjectType
export class ResourceAuthController {

    @inject()
    ctx;
    @inject()
    outsideApiService: IOutsideApiService;
    @inject()
    presentableService: IPresentableService;
    @inject()
    presentableAuthService: IPresentableAuthService;
    @inject()
    presentableVersionService: IPresentableVersionService;
    @inject()
    presentableAuthResponseHandler;

    @get('/:subjectId/(result|info|resourceInfo|fileStream)', {middleware: ['authExceptionHandlerMiddleware']})
    @visitorIdentity(LoginUser | UnLoginUser | InternalClient)
    async presentableAuth(ctx) {

        const presentableId = ctx.checkParams('subjectId').isPresentableId().value;
        const entityNid = ctx.checkQuery('entityNid').optional().type('string').len(12, 12).value;
        const subResourceIdOrName = ctx.checkQuery('subResourceIdOrName').optional().decodeURIComponent().value;
        ctx.validateParams();

        const presentableInfo = await this.presentableService.findById(presentableId);
        ctx.entityNullObjectCheck(presentableInfo);

        const presentableVersionInfo = await this.presentableVersionService.findById(presentableId, presentableInfo.version, 'dependencyTree authTree versionProperty');
        const presentableAuthResult = await this.presentableAuthService.presentableAuth(presentableInfo, presentableVersionInfo.authTree);

        await this.presentableAuthResponseHandler.handle(presentableInfo, presentableVersionInfo, presentableAuthResult, entityNid, subResourceIdOrName);
    }

    @get('/nodes/:nodeId/:resourceIdOrName/(result|info|resourceInfo|fileSteam)', {middleware: ['authExceptionHandlerMiddleware']})
    @visitorIdentity(LoginUser | UnLoginUser | InternalClient)
    async nodeResourceAuth(ctx) {

        const resourceIdOrName = ctx.checkParams('resourceIdOrName').exist().decodeURIComponent().value;
        const nodeId = ctx.checkParams('nodeId').exist().isInt().gt(0).value;
        const entityNid = ctx.checkQuery('entityNid').optional().type('string').len(12, 12).value;
        const subResourceIdOrName = ctx.checkQuery('subResourceIdOrName').optional().decodeURIComponent().value;
        ctx.validateParams();

        const condition: any = {nodeId};
        if (mongoObjectId.test(resourceIdOrName)) {
            condition['resourceInfo.resourceId'] = resourceIdOrName;
        } else if (fullResourceName.test(resourceIdOrName)) {
            condition['resourceInfo.resourceName'] = resourceIdOrName;
        } else {
            throw new ArgumentError(ctx.gettext('params-format-validate-failed', 'resourceIdOrName'));
        }

        const presentableInfo = await this.presentableService.findOne(condition);
        ctx.entityNullObjectCheck(presentableInfo);

        const presentableVersionInfo = await this.presentableVersionService.findById(presentableInfo.presentableId, presentableInfo.version, 'dependencyTree authTree versionProperty');
        const presentableAuthResult = await this.presentableAuthService.presentableAuth(presentableInfo, presentableVersionInfo.authTree);

        await this.presentableAuthResponseHandler.handle(presentableInfo, presentableVersionInfo, presentableAuthResult, entityNid, subResourceIdOrName);
    }
}