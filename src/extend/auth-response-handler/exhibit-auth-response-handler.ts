import {inject, provide} from 'midway';
import {
    ExhibitDependencyNodeInfo,
    ExhibitDependencyTree, ExhibitInfo, IOutsideApiService
} from '../../interface';
import {chain, first, isEmpty, isString} from 'lodash';
import {SubjectAuthResult} from '../../auth-interface';
import {ApplicationError, ArgumentError, BreakOffError, FreelogContext, SubjectAuthCodeEnum} from 'egg-freelog-base';
import {convertIntranetApiResponseData} from 'egg-freelog-base/lib/freelog-common-func';
import {WorkTypeEnum} from '../../enum';
import {ExhibitInfoAdapter} from '../exhibit-adapter';

@provide()
export class ExhibitAuthResponseHandler {

    @inject()
    ctx: FreelogContext;
    @inject()
    outsideApiService: IOutsideApiService;
    @inject()
    exhibitInfoAdapter: ExhibitInfoAdapter;

    /**
     * 展品响应授权处理
     * @param exhibitInfo
     * @param authResult
     * @param parentNid
     * @param subWorkIdOrName
     * @param subWorkType
     * @param subWorkFilePath
     */
    async handle(exhibitInfo: ExhibitInfo, authResult: SubjectAuthResult, parentNid: string, subWorkIdOrName ?: string, subWorkType?: WorkTypeEnum, subWorkFilePath?: string) {

        const realResponseWorkBaseInfo = this._getRealResponseWorkBaseInfo(exhibitInfo, parentNid, subWorkIdOrName, subWorkType);
        if (!realResponseWorkBaseInfo) {
            const authResult = new SubjectAuthResult(SubjectAuthCodeEnum.AuthArgumentsError)
                .setErrorMsg(this.ctx.gettext('params-validate-failed', 'entityNid,subResourceIdOrName'));
            this.exhibitAuthFailedResponseHandle(authResult, exhibitInfo);
        }

        await this.commonResponseHeaderHandle(exhibitInfo, realResponseWorkBaseInfo);

        const apiResponseType = chain(this.ctx.path).trimEnd('/').split('/').last().value();
        switch (apiResponseType) {
            case 'result':
                this.exhibitAuthResultResponse(authResult, exhibitInfo);
                break;
            case 'info':
                this.exhibitAuthFailedResponseHandle(authResult, exhibitInfo);
                this.exhibitInfoResponseHandle(exhibitInfo);
                break;
            case 'fileStream':
                this.exhibitAuthFailedResponseHandle(authResult, exhibitInfo);
                if (!subWorkFilePath) {
                    await this.fileStreamResponseHandle(realResponseWorkBaseInfo, exhibitInfo.exhibitTitle);
                } else {
                    await this.workSubFileStreamResponseHandle(realResponseWorkBaseInfo, subWorkFilePath);
                }
                break;
            default:
                this.ctx.error(new ApplicationError('未实现的授权展示方式'));
                break;
        }
    }

    /**
     * 公共响应头处理
     * @param exhibitInfo
     * @param realResponseWorkBaseInfo
     */
    async commonResponseHeaderHandle(exhibitInfo: ExhibitInfo, realResponseWorkBaseInfo: ExhibitDependencyTree) {

        const responseDependencies = realResponseWorkBaseInfo.dependencies.map(x => Object({
            id: x.workId, name: x.workName, type: x.workType, resourceType: x.resourceType
        }));

        this.ctx.set('freelog-work-nid', realResponseWorkBaseInfo.nid);
        this.ctx.set('freelog-work-id', exhibitInfo?.exhibitId);
        this.ctx.set('freelog-work-name', encodeURIComponent(exhibitInfo?.exhibitName ?? ''));
        this.ctx.set('freelog-work-property', encodeURIComponent(JSON.stringify(exhibitInfo.versionInfo?.exhibitProperty ?? {})));
        this.ctx.set('freelog-work-sub-dependencies', encodeURIComponent(JSON.stringify(responseDependencies)));
        this.ctx.set('freelog-resource-type', realResponseWorkBaseInfo.resourceType);
        this.ctx.set('Access-Control-Expose-Headers', 'freelog-work-nid,freelog-work-id,freelog-work-name,freelog-work-property,freelog-resource-type,freelog-work-sub-dependencies');
    }

    /**
     * 文件流响应处理
     * @param realResponseWorkBaseInfo
     * @param attachmentName
     */
    async fileStreamResponseHandle(realResponseWorkBaseInfo: ExhibitDependencyTree, attachmentName: string) {

        let response;
        switch (realResponseWorkBaseInfo.workType) {
            case WorkTypeEnum.IndividualResource:
                response = await this.outsideApiService.getResourceFileStream(realResponseWorkBaseInfo.versionId);
                break;
            case WorkTypeEnum.StorageObject:
                response = await this.outsideApiService.getObjectFileStream(realResponseWorkBaseInfo.workId);
                break;
            default:
                throw new ArgumentError('不支持的作品类型数据流读取');
        }
        if (!response.res.statusCode.toString().startsWith('2')) {
            throw new ApplicationError('文件读取失败');
        }
        this.ctx.body = response.data;
        this.ctx.attachment(attachmentName);
        if (['video', 'audio'].includes(realResponseWorkBaseInfo.resourceType)) {
            this.ctx.set('Accept-Ranges', 'bytes');
        }
        this.ctx.set('content-length', response.res.headers['content-length']);
        // 代码需要放到ctx.attachment以后,否则不可控.
        this.ctx.set('content-type', response.res.headers['content-type']);
    }

    /**
     * 获取子资源文件
     * @param realResponseWorkBaseInfo
     * @param subWorkFilePath
     */
    async workSubFileStreamResponseHandle(realResponseWorkBaseInfo: ExhibitDependencyTree, subWorkFilePath: string) {

        let response;
        switch (realResponseWorkBaseInfo.workType) {
            case WorkTypeEnum.IndividualResource:
                response = await this.outsideApiService.getSubResourceFile(realResponseWorkBaseInfo.workId, realResponseWorkBaseInfo.version, subWorkFilePath);
                break;
            case WorkTypeEnum.StorageObject:
                response = await this.outsideApiService.getSubObjectFile(realResponseWorkBaseInfo.workId, subWorkFilePath);
                break;
            default:
                throw new ArgumentError('不支持的作品类型数据流读取');
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
     * @param exhibitInfo
     */
    exhibitInfoResponseHandle(exhibitInfo: ExhibitInfo) {
        delete exhibitInfo.versionInfo;
        this.ctx.success(exhibitInfo);
    }

    /**
     * 标的物授权失败
     * @param exhibitInfo
     * @param authResult
     */
    exhibitAuthFailedResponseHandle(authResult: SubjectAuthResult, exhibitInfo?: Partial<ExhibitInfo>) {
        if (!authResult.isAuth) {
            this.exhibitAuthResultResponse(authResult, exhibitInfo);
            this.ctx.status = 402;
            throw new BreakOffError();
        }
    }

    /**
     * 标的物授权结果响应
     * @param exhibitInfo
     * @param authResult
     */
    exhibitAuthResultResponse(authResult: SubjectAuthResult, exhibitInfo?: Partial<ExhibitInfo>) {
        this.ctx.success({
            exhibitId: exhibitInfo?.exhibitId,
            exhibitName: exhibitInfo?.exhibitName,
            authCode: authResult.authCode,
            isAuth: authResult.isAuth,
            errorMsg: authResult.errorMsg,
            referee: authResult.referee,
            defaulterIdentityType: authResult.defaulterIdentityType,
            data: authResult.data
        });
    }

    /**
     * 获取实际需要的作品信息(或作品的依赖)
     * @param exhibitInfo
     * @param parentNid
     * @param subWorkIdOrName
     * @param subWorkType
     */
    _getRealResponseWorkBaseInfo(exhibitInfo: ExhibitInfo, parentNid: string, subWorkIdOrName ?: string, subWorkType?: WorkTypeEnum): ExhibitDependencyTree {

        let matchedExhibitDependencyNodeInfo: ExhibitDependencyNodeInfo;
        // 参数传递不够精确时,系统会尽量匹配.如果能匹配出唯一结果即代表匹配成功
        if (subWorkIdOrName || parentNid || subWorkType) {
            function filterExhibitDependencyTree(dependencyTree: ExhibitDependencyNodeInfo) {
                return (parentNid ? dependencyTree.parentNid === parentNid : true)
                    && (subWorkType ? dependencyTree.workType === subWorkType : true)
                    && (subWorkIdOrName ? dependencyTree.workId === subWorkIdOrName || dependencyTree.workName.toLowerCase() === subWorkIdOrName.toLowerCase() : true);
            }

            const matchedEntities = exhibitInfo.versionInfo.dependencyTree.filter(filterExhibitDependencyTree);
            if (matchedEntities.length !== 1) {
                return null;
            }
            matchedExhibitDependencyNodeInfo = first<ExhibitDependencyNodeInfo>(matchedEntities);
        }

        const exhibitDependencyTree = this.exhibitInfoAdapter.convertExhibitDependencyTree(exhibitInfo.versionInfo.dependencyTree, parentNid, 3, true);
        if (isEmpty(exhibitDependencyTree)) {
            return null;
        }

        const parentDependency = first(exhibitDependencyTree);
        if (!isString(subWorkIdOrName)) {
            return parentDependency;
        }

        return parentDependency.dependencies.find(x => x.workId === matchedExhibitDependencyNodeInfo.workId && x.workType === matchedExhibitDependencyNodeInfo.workType);
    }
}
