import {inject, provide} from 'midway';
import {chain, first, isEmpty, isString} from 'lodash';
import {SubjectAuthResult} from '../../auth-interface';
import {AuthorizationError, ApplicationError, SubjectAuthCodeEnum, FreelogContext} from 'egg-freelog-base';
import {IOutsideApiService} from '../../interface';
import {
    FlattenTestResourceDependencyTree, TestResourceDependencyTree, TestResourceInfo, TestResourceOriginType
} from '../../test-node-interface';
import {convertIntranetApiResponseData} from 'egg-freelog-base/lib/freelog-common-func';
import {TestNodeGenerator} from '../test-node-generator';

@provide()
export class TestResourceAuthResponseHandler {

    @inject()
    ctx: FreelogContext;
    @inject()
    testNodeGenerator: TestNodeGenerator;
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
     * @param subEntityFile
     */
    async handle(testResourceInfo: TestResourceInfo, flattenDependencyTree: FlattenTestResourceDependencyTree[], authResult: SubjectAuthResult, parentNid?: string, subEntityIdOrName?: string, subEntityType?: string, subEntityFile?: string) {

        const realResponseEntityInfo = this.getRealResponseEntityInfo(flattenDependencyTree, parentNid, subEntityIdOrName, subEntityType);
        if (!realResponseEntityInfo) {
            const authResult = new SubjectAuthResult(SubjectAuthCodeEnum.AuthArgumentsError)
                .setErrorMsg(this.ctx.gettext('params-validate-failed', 'parentNid,subEntityIdOrName'));
            this.subjectAuthFailedResponseHandle(authResult);
        }

        this.commonResponseHeaderHandle(testResourceInfo, realResponseEntityInfo);
        const apiResponseType = chain(this.ctx.path).trimEnd('/').split('/').last().value();
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
                if (!subEntityFile) {
                    await this.fileStreamResponseHandle(realResponseEntityInfo);
                } else {
                    await this.subEntityFileResponseHandle(realResponseEntityInfo, subEntityFile);
                }
                break;
            default:
                this.ctx.error(new ApplicationError('未实现的授权展示方式'));
                break;
        }
    }

    /**
     * 公共响应头处理
     * @param testResourceInfo
     * @param responseTestResourceDependencyTree
     */
    commonResponseHeaderHandle(testResourceInfo: TestResourceInfo, responseTestResourceDependencyTree: TestResourceDependencyTree) {
        this.ctx.set('freelog-entity-nid', responseTestResourceDependencyTree.nid);
        this.ctx.set('freelog-test-resource-id', testResourceInfo.testResourceId);
        this.ctx.set('freelog-test-resource-name', encodeURIComponent(testResourceInfo.testResourceName));
        this.ctx.set('freelog-sub-dependencies', encodeURIComponent(JSON.stringify(responseTestResourceDependencyTree.dependencies)));
        this.ctx.set('freelog-resource-type', responseTestResourceDependencyTree.resourceType);
        //if (responseTestResourceDependencyTree.id === testResourceInfo.originInfo.id) {
        const versionProperty = this.testNodeGenerator._calculateTestResourceProperty(testResourceInfo);
        this.ctx.set('freelog-entity-property', encodeURIComponent(JSON.stringify(versionProperty)));
        // } else {
        //
        // }
        this.ctx.set('Access-Control-Expose-Headers', 'freelog-entity-nid,freelog-test-resource-id,freelog-test-resource-name,freelog-sub-dependencies,freelog-resource-type,freelog-entity-property');
    }


    /**
     * 文件流响应处理
     * @param realResponseEntityInfo
     */
    async fileStreamResponseHandle(realResponseEntityInfo: TestResourceDependencyTree) {

        let response = null;
        if (realResponseEntityInfo.type === TestResourceOriginType.Resource) {
            response = await this.outsideApiService.getResourceFileStream(realResponseEntityInfo.versionId);
        } else {
            response = await this.outsideApiService.getObjectFileStream(realResponseEntityInfo.id);
        }
        if ((response.res.headers['content-type'] ?? '').includes('application/json')) {
            throw new ApplicationError('文件读取失败', {msg: JSON.parse(response.data.toString())?.msg});
        }
        if (!response.res.statusCode.toString().startsWith('2')) {
            throw new ApplicationError('文件读取失败');
        }

        this.ctx.body = response.data;
        this.ctx.attachment(realResponseEntityInfo.name);
        if (['video', 'audio'].includes(realResponseEntityInfo.resourceType)) {
            this.ctx.set('Accept-Ranges', 'bytes');
        }
        this.ctx.set('content-length', response.res.headers['content-length']);
        // 代码需要放到ctx.attachment以后,否则不可控.
        this.ctx.set('content-type', response.res.headers['content-type']);
    }

    /**
     * 获取子资源文件
     * @param realResponseEntityInfo
     * @param subEntityFile
     */
    async subEntityFileResponseHandle(realResponseEntityInfo: TestResourceDependencyTree, subEntityFile: string) {

        let response = null;
        if (realResponseEntityInfo.type === TestResourceOriginType.Resource) {
            response = await this.outsideApiService.getSubResourceFile(realResponseEntityInfo.id, realResponseEntityInfo.version, subEntityFile);
        } else {
            response = await this.outsideApiService.getSubObjectFile(realResponseEntityInfo.id, subEntityFile);
        }

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
            });
        }
    }

    subjectAuthProcessExceptionHandle(error) {
        const authResult = new SubjectAuthResult(SubjectAuthCodeEnum.AuthApiException).setData({error}).setErrorMsg('授权过程中出现异常');
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
                    && (subEntityIdOrName ? dependencyTree.id === subEntityIdOrName || dependencyTree.name.toLowerCase() === subEntityIdOrName.toLowerCase() : true);
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
