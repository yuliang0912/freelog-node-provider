import {inject, provide} from 'midway';
import {
    ExhibitDependencyNodeInfo,
    ExhibitDependencyTree, ExhibitInfo, IOutsideApiService
} from '../../interface';
import {chain, first, isEmpty, isString} from 'lodash';
import {SubjectAuthResult} from '../../auth-interface';
import {ApplicationError, ArgumentError, BreakOffError, FreelogContext, SubjectAuthCodeEnum} from 'egg-freelog-base';
import {convertIntranetApiResponseData} from 'egg-freelog-base/lib/freelog-common-func';
import {ArticleTypeEnum} from '../../enum';
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
     * @param subArticleIdOrName
     * @param subArticleType
     * @param subArticleFilePath
     */
    async handle(exhibitInfo: ExhibitInfo, authResult: SubjectAuthResult, parentNid: string, subArticleIdOrName ?: string, subArticleType?: ArticleTypeEnum, subArticleFilePath?: string) {

        const realResponseArticleBaseInfo = this._getRealResponseArticleBaseInfo(exhibitInfo, parentNid, subArticleIdOrName, subArticleType);
        if (!realResponseArticleBaseInfo) {
            const authResult = new SubjectAuthResult(SubjectAuthCodeEnum.AuthArgumentsError)
                .setErrorMsg(this.ctx.gettext('params-validate-failed', 'entityNid,subResourceIdOrName'));
            this.exhibitAuthFailedResponseHandle(authResult, exhibitInfo);
        }

        await this.commonResponseHeaderHandle(exhibitInfo, realResponseArticleBaseInfo);

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
                if (!subArticleFilePath) {
                    return this.fileStreamResponseHandle(exhibitInfo, realResponseArticleBaseInfo);
                } else {
                    return this.articleSubFileStreamResponseHandle(realResponseArticleBaseInfo, subArticleFilePath);
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
     * @param realResponseArticleBaseInfo
     */
    async commonResponseHeaderHandle(exhibitInfo: ExhibitInfo, realResponseArticleBaseInfo: ExhibitDependencyTree) {

        const responseDependencies = realResponseArticleBaseInfo.dependencies.map(x => Object({
            id: x.articleId, nid: x.nid, name: x.articleName, type: x.articleType, resourceType: x.resourceType
        }));

        this.ctx.set('freelog-exhibit-id', exhibitInfo?.exhibitId);
        this.ctx.set('freelog-exhibit-name', encodeURIComponent(exhibitInfo?.exhibitName ?? ''));
        this.ctx.set('freelog-exhibit-property', encodeURIComponent(JSON.stringify(exhibitInfo.versionInfo?.exhibitProperty ?? {})));
        this.ctx.set('freelog-article-nid', realResponseArticleBaseInfo.nid);
        this.ctx.set('freelog-article-sub-dependencies', encodeURIComponent(JSON.stringify(responseDependencies)));
        this.ctx.set('freelog-article-resource-type', encodeURIComponent(JSON.stringify(realResponseArticleBaseInfo.resourceType)));
        this.ctx.set('Access-Control-Expose-Headers', 'freelog-exhibit-id,freelog-exhibit-name,freelog-exhibit-property,freelog-article-nid,freelog-article-sub-dependencies,freelog-article-resource-type');
    }

    /**
     * 文件流响应处理
     * @param exhibitInfo
     * @param realResponseArticleBaseInfo
     */
    async fileStreamResponseHandle(exhibitInfo: ExhibitInfo, realResponseArticleBaseInfo: ExhibitDependencyTree) {

        let response;
        switch (realResponseArticleBaseInfo.articleType) {
            case ArticleTypeEnum.IndividualResource:
                response = await this.outsideApiService.getResourceFileStream(realResponseArticleBaseInfo.versionId);
                break;
            case ArticleTypeEnum.StorageObject:
                response = await this.outsideApiService.getObjectFileStream(realResponseArticleBaseInfo.articleId);
                break;
            default:
                throw new ArgumentError('不支持的作品类型数据流读取');
        }
        if (!response.res.statusCode.toString().startsWith('2')) {
            throw new ApplicationError('文件读取失败');
        }
        this.ctx.body = response.data;
        this.ctx.attachment(exhibitInfo.exhibitTitle);
        const mime = exhibitInfo.versionInfo?.exhibitProperty?.mime ?? '';
        if (/audio|video/.test(mime as string)) {
            this.ctx.set('Accept-Ranges', 'bytes');
        }
        this.ctx.set('content-length', response.res.headers['content-length']);
        // 代码需要放到ctx.attachment以后,否则不可控.
        this.ctx.set('content-type', response.res.headers['content-type']);
    }

    /**
     * 获取子资源文件
     * @param realResponseArticleBaseInfo
     * @param subArticleFilePath
     */
    async articleSubFileStreamResponseHandle(realResponseArticleBaseInfo: ExhibitDependencyTree, subArticleFilePath: string) {

        let response;
        const startTime = Date.now();
        switch (realResponseArticleBaseInfo.articleType) {
            case ArticleTypeEnum.IndividualResource:
                response = await this.outsideApiService.getSubResourceFile(realResponseArticleBaseInfo.articleId, realResponseArticleBaseInfo.version, subArticleFilePath);
                break;
            case ArticleTypeEnum.StorageObject:
                response = await this.outsideApiService.getSubObjectFile(realResponseArticleBaseInfo.articleId, subArticleFilePath);
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
        this.ctx.set('x-ready-time', (Date.now() - startTime).toString());
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
            errorMsg: authResult.errorMsg ? authResult.errorMsg : this.ctx.gettext(`auth_chain_${authResult.authCode}_msg`),
            referee: authResult.referee,
            defaulterIdentityType: authResult.defaulterIdentityType,
            data: authResult.data
        });
    }

    /**
     * 获取实际需要的作品信息(或作品的依赖)
     * @param exhibitInfo
     * @param parentNid
     * @param subArticleIdOrName
     * @param subArticleType
     */
    _getRealResponseArticleBaseInfo(exhibitInfo: ExhibitInfo, parentNid: string, subArticleIdOrName ?: string, subArticleType?: ArticleTypeEnum): ExhibitDependencyTree {

        let matchedExhibitDependencyNodeInfo: ExhibitDependencyNodeInfo;
        // 参数传递不够精确时,系统会尽量匹配.如果能匹配出唯一结果即代表匹配成功
        if (subArticleIdOrName || parentNid || subArticleType) {
            function filterExhibitDependencyTree(dependencyTree: ExhibitDependencyNodeInfo) {
                return (parentNid ? dependencyTree.parentNid === parentNid : true)
                    && (subArticleType ? dependencyTree.articleType === subArticleType : true)
                    && (subArticleIdOrName ? dependencyTree.articleId === subArticleIdOrName || dependencyTree.articleName.toLowerCase() === subArticleIdOrName.toLowerCase() : true);
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
        if (!isString(subArticleIdOrName)) {
            return parentDependency;
        }

        return parentDependency.dependencies.find(x => x.articleId === matchedExhibitDependencyNodeInfo.articleId && x.articleType === matchedExhibitDependencyNodeInfo.articleType);
    }
}
