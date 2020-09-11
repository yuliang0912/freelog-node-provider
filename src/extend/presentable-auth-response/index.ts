import {parse} from 'url';
import {inject, provide} from 'midway';
import {
    IOutsideApiService,
    IPresentableVersionService,
    PresentableInfo,
    PresentableVersionDependencyTreeInfo,
    PresentableVersionInfo
} from '../../interface';
import {chain, first, isEmpty, isString} from "lodash";
import {SubjectAuthCodeEnum, SubjectAuthResult} from '../../auth-interface';
import {AuthorizationError, ApplicationError} from 'egg-freelog-base/index';
import {base64Encode} from 'egg-freelog-base/app/extend/helper/crypto_helper';

@provide('presentableAuthResponseHandler')
export class PresentableAuthResponseHandler {

    @inject()
    ctx;
    @inject()
    outsideApiService: IOutsideApiService;
    @inject()
    presentableVersionService: IPresentableVersionService;

    /**
     * 授权结果统一响应处理
     * @param presentableInfo
     * @param presentableVersionInfo
     * @param authResult
     * @param entityNid
     * @param subResourceIdOrName
     */
    async handle(presentableInfo: PresentableInfo, presentableVersionInfo: PresentableVersionInfo, authResult: SubjectAuthResult, entityNid?: string, subResourceIdOrName?: string) {

        if (!isString(entityNid)) {
            entityNid = presentableInfo.presentableId.substr(0, 12);
        }

        const realResponseResourceVersionInfo = this.getRealResponseResourceInfo(presentableVersionInfo.dependencyTree, entityNid, subResourceIdOrName);
        if (!realResponseResourceVersionInfo) {
            const authResult = new SubjectAuthResult(SubjectAuthCodeEnum.AuthArgumentsError)
                .setErrorMsg(this.ctx.gettext('params-validate-failed', 'entityNid,subResourceIdOrName'))
            this.subjectAuthFailedResponseHandle(authResult);
        }

        this.commonResponseHeaderHandle(presentableVersionInfo, realResponseResourceVersionInfo);

        const apiResponseType = chain(parse(this.ctx.request.url, false).pathname).trimEnd('/').split('/').last().value();
        switch (apiResponseType) {
            case 'result':
                this.subjectAuthResultResponse(authResult);
                break;
            case 'info':
                this.subjectAuthFailedResponseHandle(authResult);
                this.subjectInfoResponseHandle(presentableInfo);
                break;
            case 'resourceInfo':
                this.subjectAuthFailedResponseHandle(authResult);
                await this.subjectUpstreamResourceInfoResponseHandle(realResponseResourceVersionInfo.resourceId);
                break;
            case 'fileStream':
                this.subjectAuthFailedResponseHandle(authResult);
                await this.fileStreamResponseHandle(presentableInfo, presentableVersionInfo, realResponseResourceVersionInfo);
                break;
            default:
                this.ctx.error(new ApplicationError('未实现的授权展示方式'));
                break;
        }
    }

    /**
     * 公共响应头处理
     * @param presentableVersionInfo
     * @param realResponseVersionInfo
     */
    commonResponseHeaderHandle(presentableVersionInfo: PresentableVersionInfo, realResponseResourceVersionInfo: PresentableVersionDependencyTreeInfo) {

        const responseDependencies = realResponseResourceVersionInfo.dependencies.map(x => Object({
            id: x.resourceId, name: x.resourceName, type: 'resource', resourceType: x.resourceType
        }));

        this.ctx.set('freelog-entity-nid', realResponseResourceVersionInfo.nid);
        this.ctx.set('freelog-sub-dependencies', base64Encode(JSON.stringify(responseDependencies)));
        this.ctx.set('freelog-resource-type', realResponseResourceVersionInfo.resourceType);
        this.ctx.set('freelog-meta', encodeURIComponent(JSON.stringify(presentableVersionInfo.versionProperty)));
    }


    /**
     * 文件流响应处理
     * @param presentableInfo
     * @param presentableVersionInfo
     * @param realResponseResourceVersionInfo
     */
    async fileStreamResponseHandle(presentableInfo: PresentableInfo, presentableVersionInfo: PresentableVersionInfo, realResponseResourceVersionInfo: PresentableVersionDependencyTreeInfo) {

        const response = await this.outsideApiService.getFileStream(realResponseResourceVersionInfo.fileSha1);
        if ((response.res.headers['content-type'] ?? '').includes('application/json')) {
            throw new ApplicationError('文件读取失败', {msg: JSON.parse(response.data.toString())?.msg});
        }
        if (!response.res.statusCode.toString().startsWith('2')) {
            throw new ApplicationError('文件读取失败');
        }

        this.ctx.body = response.data;
        this.ctx.set('content-length', presentableVersionInfo.versionProperty['fileSize']);
        this.ctx.attachment(presentableInfo.presentableTitle);

        if (['video', 'audio'].includes(realResponseResourceVersionInfo.resourceType)) {
            this.ctx.set('Accept-Ranges', 'bytes');
        }
    }

    /**
     * 标的物自身信息展示
     * @param presentableInfo
     */
    subjectInfoResponseHandle(presentableInfo: PresentableInfo) {
        this.ctx.success(presentableInfo);
    }

    /**
     * 标的物上游资源信息展示
     * @param resourceId
     */
    async subjectUpstreamResourceInfoResponseHandle(resourceId) {
        const resourceInfo = await this.outsideApiService.getResourceInfo(resourceId);
        this.ctx.success(resourceInfo);
    }

    subjectAuthFailedResponseHandle(authResult: SubjectAuthResult) {
        if (!authResult.isAuth) {
            throw new AuthorizationError(this.ctx.gettext('subject-authorization-failed'), {
                authCode: authResult.authCode, authResult
            })
        }
    }

    subjectAuthProcessExceptionHandle(error) {
        const authResult = new SubjectAuthResult(SubjectAuthCodeEnum.AuthApiException).setData({error}).setErrorMsg('授权过程中出现异常')
        this.subjectAuthFailedResponseHandle(authResult);
    }

    /**
     * 标的物授权结果响应
     * @param authResult
     */
    subjectAuthResultResponse(authResult: SubjectAuthResult) {
        this.ctx.success(authResult);
    }

    /**
     * 获取实际需要响应的资源信息,例如标的物的依赖项
     * @param presentableVersionAuthTree
     * @param parentEntityNid
     * @param subResourceIdOrName
     */
    getRealResponseResourceInfo(presentableVersionAuthTree: PresentableVersionDependencyTreeInfo[], parentEntityNid: string, subResourceIdOrName ?: string): PresentableVersionDependencyTreeInfo {

        const dependencies = this.presentableVersionService.buildPresentableDependencyTree(presentableVersionAuthTree, parentEntityNid, true, 3);
        if (isEmpty(dependencies)) {
            return null;
        }

        const parentEntity = first(dependencies) as PresentableVersionDependencyTreeInfo;
        if (!isString(subResourceIdOrName)) {
            return parentEntity;
        }

        return parentEntity.dependencies.find(x => x.resourceId === subResourceIdOrName || x.resourceName.toLowerCase() === subResourceIdOrName.toLowerCase());
    }
}