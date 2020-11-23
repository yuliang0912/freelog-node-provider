import {parse} from 'url';
import {inject, provide} from 'midway';
import {chain, first, isEmpty, isString} from "lodash";
import {SubjectAuthResult} from '../../auth-interface';
import {AuthorizationError, ApplicationError, SubjectAuthCodeEnum} from 'egg-freelog-base';
import {IOutsideApiService} from '../../interface';
import {
    FlattenTestResourceDependencyTree, TestResourceDependencyTree, TestResourceInfo
} from "../../test-node-interface";

@provide()
export class TestResourceAuthResponseHandler {

    @inject()
    ctx;
    @inject()
    testNodeGenerator;
    @inject()
    outsideApiService: IOutsideApiService;

    /**
     * 授权结果统一响应处理
     * @param testResourceInfo
     * @param flattenDependencyTree
     * @param authResult
     * @param parentNid
     * @param subEntityIdOrName
     * @param subEntityType
     */
    async handle(testResourceInfo: TestResourceInfo, flattenDependencyTree: FlattenTestResourceDependencyTree[], authResult: SubjectAuthResult, parentNid?: string, subEntityIdOrName?: string, subEntityType?: string) {

        const realResponseEntityInfo = this.getRealResponseEntityInfo(flattenDependencyTree, parentNid, subEntityIdOrName, subEntityType);
        if (!realResponseEntityInfo) {
            const authResult = new SubjectAuthResult(SubjectAuthCodeEnum.AuthArgumentsError)
                .setErrorMsg(this.ctx.gettext('params-validate-failed', 'parentNid,subEntityIdOrName'));
            this.subjectAuthFailedResponseHandle(authResult);
        }

        this.commonResponseHeaderHandle(realResponseEntityInfo);

        const apiResponseType = chain(parse(this.ctx.request.url, false).pathname).trimEnd('/').split('/').last().value();
        switch (apiResponseType) {
            case 'result':
                this.subjectAuthResultResponse(authResult);
                break;
            case 'info':
                this.subjectAuthFailedResponseHandle(authResult);
                this.subjectInfoResponseHandle(testResourceInfo);
                break;
            case 'fileStream':
                this.subjectAuthFailedResponseHandle(authResult);
                await this.fileStreamResponseHandle(realResponseEntityInfo.fileSha1, realResponseEntityInfo.id, realResponseEntityInfo.resourceType, realResponseEntityInfo.name);
                break;
            default:
                this.ctx.error(new ApplicationError('未实现的授权展示方式'));
                break;
        }
    }

    /**
     * 公共响应头处理
     * @param responseTestResourceDependencyTree
     */
    commonResponseHeaderHandle(responseTestResourceDependencyTree: TestResourceDependencyTree) {

        this.ctx.set('freelog-entity-nid', responseTestResourceDependencyTree.nid);
        this.ctx.set('freelog-sub-dependencies', encodeURIComponent(JSON.stringify(responseTestResourceDependencyTree.dependencies)));
        this.ctx.set('freelog-resource-type', responseTestResourceDependencyTree.resourceType);
        // this.ctx.set('freelog-resource-property', encodeURIComponent(JSON.stringify(presentableVersionInfo.versionProperty)));
    }


    /**
     * 文件流响应处理
     * @param fileSha1
     * @param entityId
     * @param entityType
     * @param attachmentName
     */
    async fileStreamResponseHandle(fileSha1: string, entityId: string, entityType: string, attachmentName?: string) {

        // entityType === TestResourceOriginType.Resource
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
        if (['video', 'audio'].includes(entityType)) {
            this.ctx.set('Accept-Ranges', 'bytes');
        }
    }

    /**
     * 标的物自身信息展示
     * @param testResourceInfo
     */
    subjectInfoResponseHandle(testResourceInfo: TestResourceInfo) {
        this.ctx.success(testResourceInfo);
    }

    /**
     * 标的物上游资源信息展示
     * @param resourceId
     */
    async subjectUpstreamResourceInfoResponseHandle(resourceId: string) {
        // const resourceInfo = await this.outsideApiService.getResourceInfo(resourceId);
        // this.ctx.success(resourceInfo);
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
     * @param flattenTestResourceDependencyTree
     * @param parentNid
     * @param subEntityIdOrName
     * @param subEntityType
     */
    getRealResponseEntityInfo(flattenTestResourceDependencyTree: FlattenTestResourceDependencyTree[], parentNid: string, subEntityIdOrName ?: string, subEntityType?: string): TestResourceDependencyTree {

        // 任意条件只要能确定唯一性即可.严格的唯一正常来说需要三个参数一起生效才可以.此处为兼容模式代码
        if (subEntityIdOrName || parentNid || subEntityType) {
            function filterTestResourceDependencyTree(dependencyTree: FlattenTestResourceDependencyTree) {
                return (parentNid ? dependencyTree.parentNid === parentNid : true)
                    && (subEntityType ? dependencyTree.type === subEntityType : true)
                    && (subEntityIdOrName ? dependencyTree.id === subEntityIdOrName || dependencyTree.name.toLowerCase() === subEntityIdOrName.toLowerCase() : true)
            }

            const matchedEntities = flattenTestResourceDependencyTree.filter(filterTestResourceDependencyTree);
            if (matchedEntities.length !== 1) {
                return null;
            }
            const matchedEntityInfo = first(matchedEntities);
            parentNid = matchedEntityInfo.parentNid;
            subEntityIdOrName = matchedEntityInfo.id;
            subEntityType = matchedEntityInfo.type;
        }

        const dependencies: TestResourceDependencyTree[] = this.testNodeGenerator.generateTestResourceDependencyTree(flattenTestResourceDependencyTree, parentNid, 3, true);
        if (isEmpty(dependencies)) {
            return null;
        }

        const parentDependency = first(dependencies);
        if (!isString(subEntityIdOrName)) {
            return parentDependency;
        }

        return parentDependency.dependencies.find(x => x.id === subEntityIdOrName && x.type === subEntityType);
    }
}
