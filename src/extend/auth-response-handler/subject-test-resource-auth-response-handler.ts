import {inject, provide} from 'midway';
import {
    IOutsideApiService,
} from '../../interface';
import {chain, first, isEmpty, isString} from 'lodash';
import {
    ISubjectBaseInfo,
    SubjectAuthResult,
    TestResourceSubjectInfo
} from '../../auth-interface';
import {
    ApplicationError,
    BreakOffError,
    FreelogContext,
    SubjectAuthCodeEnum,
} from 'egg-freelog-base';
import {convertIntranetApiResponseData} from 'egg-freelog-base/lib/freelog-common-func';
import {
    FlattenTestResourceDependencyTree,
    TestResourceDependencyTree,
    TestResourceInfo, TestResourceOriginType
} from '../../test-node-interface';
import {TestNodeGenerator} from '../test-node-generator';

@provide()
export class SubjectTestResourceAuthResponseHandler {

    @inject()
    ctx: FreelogContext;
    @inject()
    outsideApiService: IOutsideApiService;
    @inject()
    testNodeGenerator: TestNodeGenerator;

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
    async testResourceHandle(testResourceInfo: TestResourceInfo, flattenDependencyTree: FlattenTestResourceDependencyTree[], authResult: SubjectAuthResult, parentNid?: string, subEntityIdOrName?: string, subEntityType?: string, subEntityFile?: string) {

        const subjectInfo = this._testResourceWrapToSubjectBaseInfo(testResourceInfo);
        const realResponseEntityInfo = this.getRealResponseEntityInfo(flattenDependencyTree, parentNid, subEntityIdOrName, subEntityType);
        if (!realResponseEntityInfo) {
            const authResult = new SubjectAuthResult(SubjectAuthCodeEnum.AuthArgumentsError)
                .setErrorMsg(this.ctx.gettext('params-validate-failed', 'parentNid,subEntityIdOrName'));
            this.subjectAuthFailedResponseHandle(subjectInfo, authResult);
        }

        this.commonResponseHeaderHandle(subjectInfo, realResponseEntityInfo);
        const apiResponseType = chain(this.ctx.path).trimEnd('/').split('/').last().value();
        switch (apiResponseType) {
            case 'result':
                this.subjectAuthResultResponse(subjectInfo, authResult);
                break;
            case 'info':
                this.subjectAuthFailedResponseHandle(subjectInfo, authResult);
                this.subjectInfoResponseHandle(subjectInfo);
                break;
            case 'fileStream':
                this.subjectAuthFailedResponseHandle(subjectInfo, authResult);
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
     * @param subjectInfo
     * @param responseTestResourceDependencyTree
     */
    commonResponseHeaderHandle(subjectInfo: ISubjectBaseInfo, responseTestResourceDependencyTree: TestResourceDependencyTree) {
        this.ctx.set('freelog-entity-nid', responseTestResourceDependencyTree.nid);
        this.ctx.set('freelog-subject-id', subjectInfo?.subjectId);
        this.ctx.set('freelog-subject-name', encodeURIComponent(subjectInfo?.subjectName ?? ''));
        this.ctx.set('freelog-subject-property', encodeURIComponent(JSON.stringify(subjectInfo.meta ?? {})));
        this.ctx.set('freelog-sub-dependencies', encodeURIComponent(JSON.stringify(responseTestResourceDependencyTree.dependencies)));
        this.ctx.set('freelog-resource-type', responseTestResourceDependencyTree.resourceType);
        this.ctx.set('Access-Control-Expose-Headers', 'freelog-entity-nid,freelog-subject-id,freelog-subject-name,freelog-sub-dependencies,freelog-resource-type,freelog-subject-property');
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
     * @param subjectInfo
     */
    subjectInfoResponseHandle(subjectInfo: ISubjectBaseInfo) {
        this.ctx.success(subjectInfo);
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

    /**
     * 测试资源转换为标的物
     * @param testResource
     */
    _testResourceWrapToSubjectBaseInfo(testResource: TestResourceInfo): TestResourceSubjectInfo {
        const subjectInfo: Partial<TestResourceSubjectInfo> = {
            subjectId: testResource.testResourceId,
            subjectType: 4,
            subjectName: testResource.testResourceName,
            licensorId: testResource.nodeId,
            licensorName: testResource.nodeId.toString(),
            licensorOwnerId: testResource.userId,
            licensorOwnerName: testResource.userId.toString(),
            policies: [],
            status: testResource.stateInfo.onlineStatusInfo?.onlineStatus, // 上线了才可用
            meta: this.testNodeGenerator._calculateTestResourceProperty(testResource),
            subjectTitle: testResource.testResourceName,
            version: testResource.originInfo.version,
            entityInfo: testResource.originInfo,
            tags: testResource.stateInfo.tagInfo.tags,
            coverImages: testResource.originInfo.coverImages,
            onlineStatus: testResource.stateInfo.onlineStatusInfo?.onlineStatus
        };
        return subjectInfo as TestResourceSubjectInfo;
    }
}
