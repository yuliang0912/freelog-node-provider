import {parse} from 'url';
import {inject, provide} from 'midway';
import {
    FlattenPresentableDependencyTree,
    IOutsideApiService,
    IPresentableVersionService,
    PresentableInfo,
    PresentableDependencyTree,
    PresentableVersionInfo
} from '../../interface';
import {chain, first, isEmpty, isString} from "lodash";
import {SubjectAuthCodeEnum, SubjectAuthResult} from '../../auth-interface';
import {AuthorizationError, ApplicationError} from 'egg-freelog-base/index';

@provide()
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
    async handle(presentableInfo: PresentableInfo, presentableVersionInfo: PresentableVersionInfo, authResult: SubjectAuthResult, parentNid?: string, subResourceIdOrName?: string) {

        const realResponseResourceVersionInfo = this.getRealResponseResourceInfo(presentableVersionInfo.dependencyTree, parentNid, subResourceIdOrName);
        if (!realResponseResourceVersionInfo) {
            const authResult = new SubjectAuthResult(SubjectAuthCodeEnum.AuthArgumentsError)
                .setErrorMsg(this.ctx.gettext('params-validate-failed', 'entityNid,subResourceIdOrName'));
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
                await this.fileStreamResponseHandle(realResponseResourceVersionInfo.fileSha1, realResponseResourceVersionInfo.resourceType, presentableInfo.presentableTitle);
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
    commonResponseHeaderHandle(presentableVersionInfo: PresentableVersionInfo, realResponseResourceVersionInfo: PresentableDependencyTree) {

        const responseDependencies = realResponseResourceVersionInfo.dependencies.map(x => Object({
            id: x.resourceId, name: x.resourceName, type: 'resource', resourceType: x.resourceType
        }));

        this.ctx.set('freelog-entity-nid', realResponseResourceVersionInfo.nid);
        this.ctx.set('freelog-sub-dependencies', encodeURIComponent(JSON.stringify(responseDependencies)));
        this.ctx.set('freelog-resource-type', realResponseResourceVersionInfo.resourceType);
        this.ctx.set('freelog-meta', encodeURIComponent(JSON.stringify(presentableVersionInfo.versionProperty)));
    }


    /**
     * 文件流响应处理
     * @param presentableInfo
     * @param presentableVersionInfo
     * @param realResponseResourceVersionInfo
     */
    async fileStreamResponseHandle(fileSha1: string, resourceType: string, attachmentName?: string,) {

        const response = await this.outsideApiService.getFileStream(fileSha1);
        if ((response.res.headers['content-type'] ?? '').includes('application/json')) {
            throw new ApplicationError('文件读取失败', {msg: JSON.parse(response.data.toString())?.msg});
        }
        if (!response.res.statusCode.toString().startsWith('2')) {
            throw new ApplicationError('文件读取失败');
        }

        this.ctx.body = response.data;
        this.ctx.set('content-length', response.res.headers['content-length']);

        if (isString(attachmentName)) {
            this.ctx.attachment(attachmentName);
        }
        if (['video', 'audio'].includes(resourceType)) {
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
    async subjectUpstreamResourceInfoResponseHandle(resourceId: string) {
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
     * @param presentableAuthTree
     * @param parentEntityNid
     * @param subResourceIdOrName
     */
    getRealResponseResourceInfo(flattenPresentableDependencyTree: FlattenPresentableDependencyTree[], parentNid: string, subResourceIdOrName ?: string): PresentableDependencyTree {

        // 任意条件只要能确定唯一性即可.严格的唯一正常来说需要两个参数一起生效才可以.此处为兼容模式代码
        if (subResourceIdOrName || parentNid) {
            function filterTestResourceDependencyTree(dependencyTree: FlattenPresentableDependencyTree) {
                return (parentNid ? dependencyTree.parentNid === parentNid : true)
                    && (subResourceIdOrName ? dependencyTree.resourceId === subResourceIdOrName || dependencyTree.resourceName.toLowerCase() === subResourceIdOrName.toLowerCase() : true)
            }

            const matchedResources = flattenPresentableDependencyTree.filter(filterTestResourceDependencyTree);
            if (matchedResources.length !== 1) {
                return null;
            }
            const matchedResourceInfo = first(matchedResources);
            parentNid = matchedResourceInfo.parentNid;
            subResourceIdOrName = matchedResourceInfo.resourceId;
        }

        const dependencies = this.presentableVersionService.convertPresentableDependencyTree(flattenPresentableDependencyTree, parentNid, true, 3);
        if (isEmpty(dependencies)) {
            return null;
        }

        const parentDependency = first(dependencies);
        if (!isString(subResourceIdOrName)) {
            return parentDependency;
        }

        return parentDependency.dependencies.find(x => x.resourceId === subResourceIdOrName);
    }
}