"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExhibitAuthResponseHandler = void 0;
const midway_1 = require("midway");
const lodash_1 = require("lodash");
const auth_interface_1 = require("../../auth-interface");
const egg_freelog_base_1 = require("egg-freelog-base");
const freelog_common_func_1 = require("egg-freelog-base/lib/freelog-common-func");
const enum_1 = require("../../enum");
const exhibit_adapter_1 = require("../exhibit-adapter");
let ExhibitAuthResponseHandler = class ExhibitAuthResponseHandler {
    ctx;
    outsideApiService;
    exhibitInfoAdapter;
    /**
     * 展品响应授权处理
     * @param exhibitInfo
     * @param authResult
     * @param parentNid
     * @param subArticleIdOrName
     * @param subArticleType
     * @param subArticleFilePath
     */
    async handle(exhibitInfo, authResult, parentNid, subArticleIdOrName, subArticleType, subArticleFilePath) {
        const realResponseArticleBaseInfo = this._getRealResponseArticleBaseInfo(exhibitInfo, parentNid, subArticleIdOrName, subArticleType);
        if (!realResponseArticleBaseInfo) {
            const authResult = new auth_interface_1.SubjectAuthResult(egg_freelog_base_1.SubjectAuthCodeEnum.AuthArgumentsError)
                .setErrorMsg(this.ctx.gettext('params-validate-failed', 'entityNid,subResourceIdOrName'));
            this.exhibitAuthFailedResponseHandle(authResult, exhibitInfo);
        }
        await this.commonResponseHeaderHandle(exhibitInfo, realResponseArticleBaseInfo);
        const apiResponseType = lodash_1.chain(this.ctx.path).trimEnd('/').split('/').last().value();
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
                    await this.fileStreamResponseHandle(realResponseArticleBaseInfo, exhibitInfo.exhibitTitle);
                }
                else {
                    await this.articleSubFileStreamResponseHandle(realResponseArticleBaseInfo, subArticleFilePath);
                }
                break;
            default:
                this.ctx.error(new egg_freelog_base_1.ApplicationError('未实现的授权展示方式'));
                break;
        }
    }
    /**
     * 公共响应头处理
     * @param exhibitInfo
     * @param realResponseArticleBaseInfo
     */
    async commonResponseHeaderHandle(exhibitInfo, realResponseArticleBaseInfo) {
        const responseDependencies = realResponseArticleBaseInfo.dependencies.map(x => Object({
            id: x.articleId, name: x.articleName, type: x.articleType, resourceType: x.resourceType
        }));
        this.ctx.set('freelog-article-nid', realResponseArticleBaseInfo.nid);
        this.ctx.set('freelog-article-id', exhibitInfo?.exhibitId);
        this.ctx.set('freelog-article-name', encodeURIComponent(exhibitInfo?.exhibitName ?? ''));
        this.ctx.set('freelog-article-property', encodeURIComponent(JSON.stringify(exhibitInfo.versionInfo?.exhibitProperty ?? {})));
        this.ctx.set('freelog-article-sub-dependencies', encodeURIComponent(JSON.stringify(responseDependencies)));
        this.ctx.set('freelog-resource-type', realResponseArticleBaseInfo.resourceType);
        this.ctx.set('Access-Control-Expose-Headers', 'freelog-article-nid,freelog-article-id,freelog-article-name,freelog-article-property,freelog-resource-type,freelog-article-sub-dependencies');
    }
    /**
     * 文件流响应处理
     * @param realResponseArticleBaseInfo
     * @param attachmentName
     */
    async fileStreamResponseHandle(realResponseArticleBaseInfo, attachmentName) {
        let response;
        switch (realResponseArticleBaseInfo.articleType) {
            case enum_1.ArticleTypeEnum.IndividualResource:
                response = await this.outsideApiService.getResourceFileStream(realResponseArticleBaseInfo.versionId);
                break;
            case enum_1.ArticleTypeEnum.StorageObject:
                response = await this.outsideApiService.getObjectFileStream(realResponseArticleBaseInfo.articleId);
                break;
            default:
                throw new egg_freelog_base_1.ArgumentError('不支持的作品类型数据流读取');
        }
        if (!response.res.statusCode.toString().startsWith('2')) {
            throw new egg_freelog_base_1.ApplicationError('文件读取失败');
        }
        this.ctx.body = response.data;
        this.ctx.attachment(attachmentName);
        if (['video', 'audio'].includes(realResponseArticleBaseInfo.resourceType)) {
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
    async articleSubFileStreamResponseHandle(realResponseArticleBaseInfo, subArticleFilePath) {
        let response;
        switch (realResponseArticleBaseInfo.articleType) {
            case enum_1.ArticleTypeEnum.IndividualResource:
                response = await this.outsideApiService.getSubResourceFile(realResponseArticleBaseInfo.articleId, realResponseArticleBaseInfo.version, subArticleFilePath);
                break;
            case enum_1.ArticleTypeEnum.StorageObject:
                response = await this.outsideApiService.getSubObjectFile(realResponseArticleBaseInfo.articleId, subArticleFilePath);
                break;
            default:
                throw new egg_freelog_base_1.ArgumentError('不支持的作品类型数据流读取');
        }
        if (!response.res.statusCode.toString().startsWith('2')) {
            throw new egg_freelog_base_1.ApplicationError('文件读取失败');
        }
        if (!response.res.headers['content-disposition']) {
            if (response.res.headers['content-type'].includes('application/json')) {
                freelog_common_func_1.convertIntranetApiResponseData(JSON.parse(response.data.toString()), 'getSubResourceFile');
            }
            throw new egg_freelog_base_1.ApplicationError('文件读取失败');
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
    exhibitInfoResponseHandle(exhibitInfo) {
        delete exhibitInfo.versionInfo;
        this.ctx.success(exhibitInfo);
    }
    /**
     * 标的物授权失败
     * @param exhibitInfo
     * @param authResult
     */
    exhibitAuthFailedResponseHandle(authResult, exhibitInfo) {
        if (!authResult.isAuth) {
            this.exhibitAuthResultResponse(authResult, exhibitInfo);
            throw new egg_freelog_base_1.BreakOffError();
        }
    }
    /**
     * 标的物授权结果响应
     * @param exhibitInfo
     * @param authResult
     */
    exhibitAuthResultResponse(authResult, exhibitInfo) {
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
     * @param subArticleIdOrName
     * @param subArticleType
     */
    _getRealResponseArticleBaseInfo(exhibitInfo, parentNid, subArticleIdOrName, subArticleType) {
        let matchedExhibitDependencyNodeInfo;
        // 参数传递不够精确时,系统会尽量匹配.如果能匹配出唯一结果即代表匹配成功
        if (subArticleIdOrName || parentNid || subArticleType) {
            function filterExhibitDependencyTree(dependencyTree) {
                return (parentNid ? dependencyTree.parentNid === parentNid : true)
                    && (subArticleType ? dependencyTree.articleType === subArticleType : true)
                    && (subArticleIdOrName ? dependencyTree.articleId === subArticleIdOrName || dependencyTree.articleName.toLowerCase() === subArticleIdOrName.toLowerCase() : true);
            }
            const matchedEntities = exhibitInfo.versionInfo.dependencyTree.filter(filterExhibitDependencyTree);
            if (matchedEntities.length !== 1) {
                return null;
            }
            matchedExhibitDependencyNodeInfo = lodash_1.first(matchedEntities);
        }
        const exhibitDependencyTree = this.exhibitInfoAdapter.convertExhibitDependencyTree(exhibitInfo.versionInfo.dependencyTree, parentNid, 3, true);
        if (lodash_1.isEmpty(exhibitDependencyTree)) {
            return null;
        }
        const parentDependency = lodash_1.first(exhibitDependencyTree);
        if (!lodash_1.isString(subArticleIdOrName)) {
            return parentDependency;
        }
        return parentDependency.dependencies.find(x => x.articleId === matchedExhibitDependencyNodeInfo.articleId && x.articleType === matchedExhibitDependencyNodeInfo.articleType);
    }
};
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], ExhibitAuthResponseHandler.prototype, "ctx", void 0);
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], ExhibitAuthResponseHandler.prototype, "outsideApiService", void 0);
__decorate([
    midway_1.inject(),
    __metadata("design:type", exhibit_adapter_1.ExhibitInfoAdapter)
], ExhibitAuthResponseHandler.prototype, "exhibitInfoAdapter", void 0);
ExhibitAuthResponseHandler = __decorate([
    midway_1.provide()
], ExhibitAuthResponseHandler);
exports.ExhibitAuthResponseHandler = ExhibitAuthResponseHandler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhoaWJpdC1hdXRoLXJlc3BvbnNlLWhhbmRsZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvZXh0ZW5kL2F1dGgtcmVzcG9uc2UtaGFuZGxlci9leGhpYml0LWF1dGgtcmVzcG9uc2UtaGFuZGxlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7QUFBQSxtQ0FBdUM7QUFLdkMsbUNBQXVEO0FBQ3ZELHlEQUF1RDtBQUN2RCx1REFBcUg7QUFDckgsa0ZBQXdGO0FBQ3hGLHFDQUEyQztBQUMzQyx3REFBc0Q7QUFHdEQsSUFBYSwwQkFBMEIsR0FBdkMsTUFBYSwwQkFBMEI7SUFHbkMsR0FBRyxDQUFpQjtJQUVwQixpQkFBaUIsQ0FBcUI7SUFFdEMsa0JBQWtCLENBQXFCO0lBRXZDOzs7Ozs7OztPQVFHO0lBQ0gsS0FBSyxDQUFDLE1BQU0sQ0FBQyxXQUF3QixFQUFFLFVBQTZCLEVBQUUsU0FBaUIsRUFBRSxrQkFBNEIsRUFBRSxjQUFnQyxFQUFFLGtCQUEyQjtRQUVoTCxNQUFNLDJCQUEyQixHQUFHLElBQUksQ0FBQywrQkFBK0IsQ0FBQyxXQUFXLEVBQUUsU0FBUyxFQUFFLGtCQUFrQixFQUFFLGNBQWMsQ0FBQyxDQUFDO1FBQ3JJLElBQUksQ0FBQywyQkFBMkIsRUFBRTtZQUM5QixNQUFNLFVBQVUsR0FBRyxJQUFJLGtDQUFpQixDQUFDLHNDQUFtQixDQUFDLGtCQUFrQixDQUFDO2lCQUMzRSxXQUFXLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsd0JBQXdCLEVBQUUsK0JBQStCLENBQUMsQ0FBQyxDQUFDO1lBQzlGLElBQUksQ0FBQywrQkFBK0IsQ0FBQyxVQUFVLEVBQUUsV0FBVyxDQUFDLENBQUM7U0FDakU7UUFFRCxNQUFNLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxXQUFXLEVBQUUsMkJBQTJCLENBQUMsQ0FBQztRQUVoRixNQUFNLGVBQWUsR0FBRyxjQUFLLENBQUMsSUFBSSxD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