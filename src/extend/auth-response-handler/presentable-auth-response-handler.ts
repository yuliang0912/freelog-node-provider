import {inject, provide} from 'midway';
import {
    FlattenPresentableDependencyTree,
    IOutsideApiService,
    IPresentableAuthResponseHandler,
    IPresentableVersionService,
    PresentableDependencyTree,
    PresentableInfo,
    PresentableVersionInfo
} from '../../interface';
import {chain, first, isEmpty, isString} from 'lodash';
import {SubjectAuthResult} from '../../auth-interface';
import {
    ApplicationError,
    BreakOffError,
    ErrCodeEnum,
    FreelogContext,
    RetCodeEnum,
    SubjectAuthCodeEnum
} from 'egg-freelog-base';
import {convertIntranetApiResponseData} from 'egg-freelog-base/lib/freelog-common-func';

@provide()
export class PresentableAuthResponseHandler implements IPresentableAuthResponseHandler {

    @inject()
    ctx: FreelogContext;
    @inject()
    outsideApiService: IOutsideApiService;
    @inject()
    presentableVersionService: IPresentableVersionService;

    /**
     * 授权结果统一响应处理
     * @param presentableInfo
     * @param presentableVersionInfo
     * @param authResult
     * @param parentNid
     * @param subResourceIdOrName
     * @param subResourceFile
     */
    async handle(presentableInfo: PresentableInfo, presentableVersionInfo: PresentableVersionInfo, authResult: SubjectAuthResult, parentNid?: string, subResourceIdOrName?: string, subResourceFile?: string) {

        const realResponseResourceVersionInfo = this.getRealResponseResourceInfo(presentableVersionInfo.dependencyTree, parentNid, subResourceIdOrName);
        if (!realResponseResourceVersionInfo) {
            const authResult = new SubjectAuthResult(SubjectAuthCodeEnum.AuthArgumentsError)
                .setErrorMsg(this.ctx.gettext('params-validate-failed', 'entityNid,subResourceIdOrName'));
            this.subjectAuthFailedResponseHandle(authResult);
        }

        await this.commonResponseHeaderHandle(presentableInfo, presentableVersionInfo, realResponseResourceVersionInfo);

        const apiResponseType = chain(this.ctx.path).trimEnd('/').split('/').last().value();
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
                if (!subResourceFile) {
                    await this.fileStreamResponseHandle(realResponseResourceVersionInfo.versionId, realResponseResourceVersionInfo.resourceType, presentableInfo.presentableTitle);
                } else {
                    await this.subResourceFileResponseHandle(realResponseResourceVersionInfo.resourceId, realResponseResourceVersionInfo.version, subResourceFile);
                }
                break;
            default:
                this.ctx.error(new ApplicationError('未实现的授权展示方式'));
                break;
        }
    }

    /**
     * 公共响应头处理
     * @param presentableInfo
     * @param presentableVersionInfo
     * @param realResponseResourceVersionInfo
     */
    async commonResponseHeaderHandle(presentableInfo: PresentableInfo, presentableVersionInfo: PresentableVersionInfo, realResponseResourceVersionInfo: PresentableDependencyTree) {

        const responseDependencies = realResponseResourceVersionInfo.dependencies.map(x => Object({
            id: x.resourceId, name: x.resourceName, type: 'resource', resourceType: x.resourceType
        }));

        this.ctx.set('freelog-entity-nid', realResponseResourceVersionInfo.nid);
        this.ctx.set('freelog-presentable-id', presentableInfo.presentableId);
        this.ctx.set('freelog-presentable-name', encodeURIComponent(presentableInfo.presentableName));
        this.ctx.set('freelog-sub-dependencies', encodeURIComponent(JSON.stringify(responseDependencies)));
        this.ctx.set('freelog-resource-type', realResponseResourceVersionInfo.resourceType);
        // // 如果加载的是子资源(依赖的资源),则需要读取依赖资源的meta信息
        // if (realResponseResourceVersionInfo.resourceId !== presentableVersionInfo.resourceId) {
        //     const subResourceProperty = await this.outsideApiService.getResourceVersionProperty(realResponseResourceVersionInfo.resourceId, realResponseResourceVersionInfo.version);
        //     this.ctx.set('freelog-sub-resource-property', encodeURIComponent(JSON.stringify(subResourceProperty)));
        // } else {
        this.ctx.set('freelog-resource-property', encodeURIComponent(JSON.stringify(presentableVersionInfo.versionProperty)));
        //}
        // MDN: https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Headers/Access-Control-Expose-Headers
        this.ctx.set('Access-Control-Expose-Headers', 'freelog-entity-nid,freelog-presentable-id,freelog-presentable-name,freelog-sub-dependencies,freelog-resource-type,freelog-sub-resource-property,freelog-resource-property');
    }

    /**
     * 文件流响应处理
     * @param versionId
     * @param resourceType
     * @param attachmentName
     */
    async fileStreamResponseHandle(versionId: string, resourceType: string, attachmentName?: string) {

        const response = await this.outsideApiService.getResourceFileStream(versionId);
        if (!response.res.statusCode.toString().startsWith('2')) {
            throw new ApplicationError('文件读取失败');
        }
        this.ctx.body = response.data;
        if (isString(attachmentName)) {
            this.ctx.attachment(attachmentName);
        }
        if (['video', 'audio'].includes(resourceType)) {
            this.ctx.set('Accept-Ranges', 'bytes');
        }
        this.ctx.set('content-length', response.res.headers['content-length']);
        // 代码需要放到ctx.attachment以后,否则不可控.
        this.ctx.set('content-type', response.res.headers['content-type']);
    }

    /**
     * 获取子资源文件
     * @param resourceId
     * @param version
     * @param subResourceFile
     */
    async subResourceFileResponseHandle(resourceId: string, version: string, subResourceFile: string) {
        const response = await this.outsideApiService.getSubResourceFile(resourceId, version, subResourceFile);
        if (!response.res.statusCode.toString().startsWith('2')) {
            throw new ApplicationError('文件读取失败');
        }
        if (!response.res.headers['content-disposition']) {
            if (response.res.headers['content-type'].includes('application/json')) {
                convertIntranetApiResponseData(JSON.parse(response.data.toString()), 'getSubResourceFile');
            }
            throw new ApplicationError('文件读取失败');
        }

        this.ctx.body = response.data;
        this.ctx.set('content-disposition', response.res.headers['content-disposition']);
        this.ctx.set('content-length', response.res.headers['content-length']);
        // 代码需要放到ctx.attachment以后,否则不可控.
        this.ctx.set('content-type', response.res.headers['content-type']);
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

    /**
     * 标的物授权失败
     * @param authResult
     */
    subjectAuthFailedResponseHandle(authResult: SubjectAuthResult) {
        if (!authResult.isAuth) {
            this.ctx.body = {
                ret: RetCodeEnum.success,
                errCode: ErrCodeEnum.authorizationError,
                msg: this.ctx.gettext('subject-authorization-failed'),
                data: authResult
            };
            throw new BreakOffError();
        }
    }

    /**
     * 授权异常处理
     * @param error
     */
    subjectAuthProcessExceptionHandle(error) {
        const authResult = new SubjectAuthResult(SubjectAuthCodeEnum.AuthApiException)
            .setData({errorMsg: error.toString()})
            .setErrorMsg('授权过程中出现异常');
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
     * @param flattenPresentableDependencyTree
     * @param parentNid
     * @param subResourceIdOrName
     */
    getRealResponseResourceInfo(flattenPresentableDependencyTree: FlattenPresentableDependencyTree[], parentNid: string, subResourceIdOrName ?: string): PresentableDependencyTree {

        // 任意条件只要能确定唯一性即可.严格的唯一正常来说需要两个参数一起生效才可以.此处为兼容模式代码
        if (subResourceIdOrName || parentNid) {
            function filterTestResourceDependencyTree(dependencyTree: FlattenPresentableDependencyTree) {
                return (parentNid ? dependencyTree.parentNid === parentNid : true)
                    && (subResourceIdOrName ? dependencyTree.resourceId === subResourceIdOrName || dependencyTree.resourceName.toLowerCase() === subResourceIdOrName.toLowerCase() : true);
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
