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
        const apiResponseType = (0, lodash_1.chain)(this.ctx.path).trimEnd('/').split('/').last().value();
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
            id: x.articleId, nid: x.nid, name: x.articleName, type: x.articleType, resourceType: x.resourceType
        }));
        this.ctx.set('freelog-exhibit-id', exhibitInfo?.exhibitId);
        this.ctx.set('freelog-exhibit-name', encodeURIComponent(exhibitInfo?.exhibitName ?? ''));
        this.ctx.set('freelog-exhibit-property', encodeURIComponent(JSON.stringify(exhibitInfo.versionInfo?.exhibitProperty ?? {})));
        this.ctx.set('freelog-article-nid', realResponseArticleBaseInfo.nid);
        this.ctx.set('freelog-article-sub-dependencies', encodeURIComponent(JSON.stringify(responseDependencies)));
        this.ctx.set('freelog-article-resource-type', realResponseArticleBaseInfo.resourceType);
        this.ctx.set('Access-Control-Expose-Headers', 'freelog-exhibit-id,freelog-exhibit-name,freelog-exhibit-property,freelog-article-nid,freelog-article-sub-dependencies,freelog-article-resource-type');
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
            console.log(response.res);
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
                (0, freelog_common_func_1.convertIntranetApiResponseData)(JSON.parse(response.data.toString()), 'getSubResourceFile');
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
            matchedExhibitDependencyNodeInfo = (0, lodash_1.first)(matchedEntities);
        }
        const exhibitDependencyTree = this.exhibitInfoAdapter.convertExhibitDependencyTree(exhibitInfo.versionInfo.dependencyTree, parentNid, 3, true);
        if ((0, lodash_1.isEmpty)(exhibitDependencyTree)) {
            return null;
        }
        const parentDependency = (0, lodash_1.first)(exhibitDependencyTree);
        if (!(0, lodash_1.isString)(subArticleIdOrName)) {
            return parentDependency;
        }
        return parentDependency.dependencies.find(x => x.articleId === matchedExhibitDependencyNodeInfo.articleId && x.articleType === matchedExhibitDependencyNodeInfo.articleType);
    }
};
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", Object)
], ExhibitAuthResponseHandler.prototype, "ctx", void 0);
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", Object)
], ExhibitAuthResponseHandler.prototype, "outsideApiService", void 0);
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", exhibit_adapter_1.ExhibitInfoAdapter)
], ExhibitAuthResponseHandler.prototype, "exhibitInfoAdapter", void 0);
ExhibitAuthResponseHandler = __decorate([
    (0, midway_1.provide)()
], ExhibitAuthResponseHandler);
exports.ExhibitAuthResponseHandler = ExhibitAuthResponseHandler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhoaWJpdC1hdXRoLXJlc3BvbnNlLWhhbmRsZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvZXh0ZW5kL2F1dGgtcmVzcG9uc2UtaGFuZGxlci9leGhpYml0LWF1dGgtcmVzcG9uc2UtaGFuZGxlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7QUFBQSxtQ0FBdUM7QUFLdkMsbUNBQXVEO0FBQ3ZELHlEQUF1RDtBQUN2RCx1REFBcUg7QUFDckgsa0ZBQXdGO0FBQ3hGLHFDQUEyQztBQUMzQyx3REFBc0Q7QUFHdEQsSUFBYSwwQkFBMEIsR0FBdkMsTUFBYSwwQkFBMEI7SUFHbkMsR0FBRyxDQUFpQjtJQUVwQixpQkFBaUIsQ0FBcUI7SUFFdEMsa0JBQWtCLENBQXFCO0lBRXZDOzs7Ozs7OztPQVFHO0lBQ0gsS0FBSyxDQUFDLE1BQU0sQ0FBQyxXQUF3QixFQUFFLFVBQTZCLEVBQUUsU0FBaUIsRUFBRSxrQkFBNEIsRUFBRSxjQUFnQyxFQUFFLGtCQUEyQjtRQUVoTCxNQUFNLDJCQUEyQixHQUFHLElBQUksQ0FBQywrQkFBK0IsQ0FBQyxXQUFXLEVBQUUsU0FBUyxFQUFFLGtCQUFrQixFQUFFLGNBQWMsQ0FBQyxDQUFDO1FBQ3JJLElBQUksQ0FBQywyQkFBMkIsRUFBRTtZQUM5QixNQUFNLFVBQVUsR0FBRyxJQUFJLGtDQUFpQixDQUFDLHNDQUFtQixDQUFDLGtCQUFrQixDQUFDO2lCQUMzRSxXQUFXLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsd0JBQXdCLEVBQUUsK0JBQStCLENBQUMsQ0FBQyxDQUFDO1lBQzlGLElBQUksQ0FBQywrQkFBK0IsQ0FBQyxVQUFVLEVBQUUsV0FBVyxDQUFDLENBQUM7U0FDakU7UUFFRCxNQUFNLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxXQUFXLEVBQUUsMkJBQTJCLENBQUMsQ0FBQztRQUVoRixNQUFNLGVBQWUsR0FBRyxJQUFBLGNBQUssRUFBQyxJ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