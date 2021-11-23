import {inject, provide} from 'midway';
import {
    FlattenPresentableDependencyTree,
    INodeService,
    IOutsideApiService,
    IPresentableVersionService,
    PresentableDependencyTree,
    PresentableInfo,
    PresentableVersionInfo
} from '../../interface';
import {chain, first, isEmpty, isString} from 'lodash';
import {ISubjectBaseInfo, PresentableSubjectInfo, SubjectAuthResult} from '../../auth-interface';
import {
    ApplicationError,
    BreakOffError,
    FreelogContext,
    SubjectAuthCodeEnum,
    SubjectTypeEnum
} from 'egg-freelog-base';
import {convertIntranetApiResponseData} from 'egg-freelog-base/lib/freelog-common-func';

@provide()
export class SubjectPresentableAuthResponseHandler {

    @inject()
    ctx: FreelogContext;
    @inject()
    outsideApiService: IOutsideApiService;
    @inject()
    nodeService: INodeService;
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
    async presentableHandle(presentableInfo: PresentableInfo, presentableVersionInfo: PresentableVersionInfo, authResult: SubjectAuthResult, parentNid?: string, subResourceIdOrName?: string, subResourceFile?: string) {

        const subjectInfo = this._presentableWrapToSubjectBaseInfo(presentableInfo, presentableVersionInfo);
        const realResponseResourceVersionInfo = this._getRealResponseResourceInfo(presentableVersionInfo.dependencyTree, parentNid, subResourceIdOrName);
        if (!realResponseResourceVersionInfo) {
            const authResult = new SubjectAuthResult(SubjectAuthCodeEnum.AuthArgumentsError)
                .setErrorMsg(this.ctx.gettext('params-validate-failed', 'entityNid,subResourceIdOrName'));
            this.subjectAuthFailedResponseHandle(subjectInfo, authResult);
        }

        await this.commonResponseHeaderHandle(subjectInfo, realResponseResourceVersionInfo);

        const apiResponseType = chain(this.ctx.path).trimEnd('/').split('/').last().value();
        switch (apiResponseType) {
            case 'result':
                this.subjectAuthResultResponse(subjectInfo, authResult);
                break;
            case 'info':
                this.subjectAuthFailedResponseHandle(subjectInfo, authResult);
                if (realResponseResourceVersionInfo.resourceId === subjectInfo.subjectId) {
                    this.subjectInfoResponseHandle(subjectInfo);
                } else {
                    this.subjectInfoResponseHandle(subjectInfo);
                }
                break;
            case 'resourceInfo':
                this.subjectAuthFailedResponseHandle(subjectInfo, authResult);
                await this.subjectUpstreamResourceInfoResponseHandle(realResponseResourceVersionInfo.resourceId);
                break;
            case 'fileStream':
                this.subjectAuthFailedResponseHandle(subjectInfo, authResult);
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
     * @param subjectInfo
     * @param realResponseResourceVersionInfo
     */
    async commonResponseHeaderHandle(subjectInfo: ISubjectBaseInfo, realResponseResourceVersionInfo: PresentableDependencyTree) {

        const responseDependencies = realResponseResourceVersionInfo.dependencies.map(x => Object({
            id: x.resourceId, name: x.resourceName, type: 'resource', resourceType: x.resourceType
        }));

        this.ctx.set('freelog-entity-nid', realResponseResourceVersionInfo.nid);
        this.ctx.set('freelog-subject-id', subjectInfo?.subjectId);
        this.ctx.set('freelog-subject-name', encodeURIComponent(subjectInfo?.subjectName ?? ''));
        this.ctx.set('freelog-subject-property', encodeURIComponent(JSON.stringify(subjectInfo.meta ?? {})));
        this.ctx.set('freelog-sub-dependencies', encodeURIComponent(JSON.stringify(responseDependencies)));
        this.ctx.set('freelog-resource-type', realResponseResourceVersionInfo.resourceType);
        this.ctx.set('Access-Control-Expose-Headers', 'freelog-entity-nid,freelog-subject-id,freelog-subject-name,freelog-sub-dependencies,freelog-resource-type,freelog-subject-property');
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
     * @param subjectInfo
     */
    subjectInfoResponseHandle(subjectInfo: ISubjectBaseInfo) {
        this.ctx.success(subjectInfo);
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
     * @param subjectBaseInfo
     * @param authResult
     */
    subjectAuthFailedResponseHandle(subjectBaseInfo: ISubjectBaseInfo, authResult: SubjectAuthResult) {
        if (!authResult.isAuth) {
            this.subjectAuthResultResponse(subjectBaseInfo, authResult);
            this.ctx.status = 402;
            throw new BreakOffError();
        }
    }

    /**
     * 标的物授权结果响应
     * @param subjectBaseInfo
     * @param authResult
     */
    subjectAuthResultResponse(subjectBaseInfo: ISubjectBaseInfo, authResult: SubjectAuthResult) {
        this.ctx.success({
            subjectId: subjectBaseInfo?.subjectId,
            subjectName: subjectBaseInfo?.subjectName,
            authCode: authResult.authCode,
            errorMsg: authResult.errorMsg,
            verdictSubjectService: authResult.referee,
            defaulterIdentityType: authResult.breachResponsibilityType,
            data: authResult.data
        });
    }

    /**
     * 获取实际需要响应的资源信息,例如标的物的依赖项
     * @param flattenPresentableDependencyTree
     * @param parentNid
     * @param subResourceIdOrName
     */
    _getRealResponseResourceInfo(flattenPresentableDependencyTree: FlattenPresentableDependencyTree[], parentNid: string, subResourceIdOrName ?: string): PresentableDependencyTree {

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

    /**
     * 展品转换为标的物
     * @param presentableInfo
     * @param presentableVersionInfo
     */
    _presentableWrapToSubjectBaseInfo(presentableInfo: PresentableInfo, presentableVersionInfo: PresentableVersionInfo): PresentableSubjectInfo {

        const subjectInfo: Partial<PresentableSubjectInfo> = {
            subjectId: presentableInfo.presentableId,
            subjectType: SubjectTypeEnum.Presentable,
            subjectName: presentableInfo.presentableName,
            licensorId: presentableInfo.nodeId,
            licensorName: presentableInfo.nodeId.toString(),
            licensorOwnerId: presentableInfo.userId,
            licensorOwnerName: presentableInfo.userId.toString(),
            policies: presentableInfo.policies,
            status: presentableInfo.onlineStatus === 1 ? 1 : 0, // 上线了才可用
            meta: presentableVersionInfo.versionProperty,
            // 以下为展品拓展属性
            subjectTitle: presentableInfo.presentableTitle,
            coverImages: presentableInfo.coverImages,
            tags: presentableInfo.tags,
            onlineStatus: presentableInfo.onlineStatus,
            version: presentableInfo.version,
            resourceInfo: presentableInfo.resourceInfo
        };
        return subjectInfo as PresentableSubjectInfo;
    }
}
