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
exports.PresentableAuthResponseHandler = void 0;
const midway_1 = require("midway");
const lodash_1 = require("lodash");
const auth_interface_1 = require("../../auth-interface");
const egg_freelog_base_1 = require("egg-freelog-base");
const freelog_common_func_1 = require("egg-freelog-base/lib/freelog-common-func");
let PresentableAuthResponseHandler = class PresentableAuthResponseHandler {
    ctx;
    outsideApiService;
    presentableVersionService;
    /**
     * 授权结果统一响应处理
     * @param presentableInfo
     * @param presentableVersionInfo
     * @param authResult
     * @param parentNid
     * @param subResourceIdOrName
     * @param subResourceFile
     */
    async handle(presentableInfo, presentableVersionInfo, authResult, parentNid, subResourceIdOrName, subResourceFile) {
        const realResponseResourceVersionInfo = this.getRealResponseResourceInfo(presentableVersionInfo.dependencyTree, parentNid, subResourceIdOrName);
        if (!realResponseResourceVersionInfo) {
            const authResult = new auth_interface_1.SubjectAuthResult(egg_freelog_base_1.SubjectAuthCodeEnum.AuthArgumentsError)
                .setErrorMsg(this.ctx.gettext('params-validate-failed', 'entityNid,subResourceIdOrName'));
            this.subjectAuthFailedResponseHandle(authResult);
        }
        await this.commonResponseHeaderHandle(presentableInfo, presentableVersionInfo, realResponseResourceVersionInfo);
        const apiResponseType = (0, lodash_1.chain)(this.ctx.path).trimEnd('/').split('/').last().value();
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
                }
                else {
                    await this.subResourceFileResponseHandle(realResponseResourceVersionInfo.resourceId, realResponseResourceVersionInfo.version, subResourceFile);
                }
                break;
            default:
                this.ctx.error(new egg_freelog_base_1.ApplicationError('未实现的授权展示方式'));
                break;
        }
    }
    /**
     * 公共响应头处理
     * @param presentableInfo
     * @param presentableVersionInfo
     * @param realResponseResourceVersionInfo
     */
    async commonResponseHeaderHandle(presentableInfo, presentableVersionInfo, realResponseResourceVersionInfo) {
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
    async fileStreamResponseHandle(versionId, resourceType, attachmentName) {
        const response = await this.outsideApiService.getResourceFileStream(versionId);
        if (!response.res.statusCode.toString().startsWith('2')) {
            throw new egg_freelog_base_1.ApplicationError('文件读取失败');
        }
        this.ctx.body = response.data;
        if ((0, lodash_1.isString)(attachmentName)) {
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
    async subResourceFileResponseHandle(resourceId, version, subResourceFile) {
        const response = await this.outsideApiService.getSubResourceFile(resourceId, version, subResourceFile);
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
     * @param presentableInfo
     */
    subjectInfoResponseHandle(presentableInfo) {
        this.ctx.success(presentableInfo);
    }
    /**
     * 标的物上游资源信息展示
     * @param resourceId
     */
    async subjectUpstreamResourceInfoResponseHandle(resourceId) {
        const resourceInfo = await this.outsideApiService.getResourceInfo(resourceId);
        this.ctx.success(resourceInfo);
    }
    /**
     * 标的物授权失败
     * @param authResult
     */
    subjectAuthFailedResponseHandle(authResult) {
        if (!authResult.isAuth) {
            this.ctx.body = {
                ret: egg_freelog_base_1.RetCodeEnum.success,
                errCode: egg_freelog_base_1.ErrCodeEnum.authorizationError,
                msg: this.ctx.gettext('subject-authorization-failed'),
                data: authResult
            };
            throw new egg_freelog_base_1.BreakOffError();
        }
    }
    /**
     * 授权异常处理
     * @param error
     */
    subjectAuthProcessExceptionHandle(error) {
        const authResult = new auth_interface_1.SubjectAuthResult(egg_freelog_base_1.SubjectAuthCodeEnum.AuthApiException)
            .setData({ errorMsg: error.toString() })
            .setErrorMsg('授权过程中出现异常');
        this.subjectAuthFailedResponseHandle(authResult);
    }
    /**
     * 标的物授权结果响应
     * @param authResult
     */
    subjectAuthResultResponse(authResult) {
        this.ctx.success(authResult);
    }
    /**
     * 获取实际需要响应的资源信息,例如标的物的依赖项
     * @param flattenPresentableDependencyTree
     * @param parentNid
     * @param subResourceIdOrName
     */
    getRealResponseResourceInfo(flattenPresentableDependencyTree, parentNid, subResourceIdOrName) {
        // 任意条件只要能确定唯一性即可.严格的唯一正常来说需要两个参数一起生效才可以.此处为兼容模式代码
        if (subResourceIdOrName || parentNid) {
            function filterTestResourceDependencyTree(dependencyTree) {
                return (parentNid ? dependencyTree.parentNid === parentNid : true)
                    && (subResourceIdOrName ? dependencyTree.resourceId === subResourceIdOrName || dependencyTree.resourceName.toLowerCase() === subResourceIdOrName.toLowerCase() : true);
            }
            const matchedResources = flattenPresentableDependencyTree.filter(filterTestResourceDependencyTree);
            if (matchedResources.length !== 1) {
                return null;
            }
            const matchedResourceInfo = (0, lodash_1.first)(matchedResources);
            parentNid = matchedResourceInfo.parentNid;
            subResourceIdOrName = matchedResourceInfo.resourceId;
        }
        const dependencies = this.presentableVersionService.convertPresentableDependencyTree(flattenPresentableDependencyTree, parentNid, true, 3);
        if ((0, lodash_1.isEmpty)(dependencies)) {
            return null;
        }
        const parentDependency = (0, lodash_1.first)(dependencies);
        if (!(0, lodash_1.isString)(subResourceIdOrName)) {
            return parentDependency;
        }
        return parentDependency.dependencies.find(x => x.resourceId === subResourceIdOrName);
    }
};
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", Object)
], PresentableAuthResponseHandler.prototype, "ctx", void 0);
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", Object)
], PresentableAuthResponseHandler.prototype, "outsideApiService", void 0);
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", Object)
], PresentableAuthResponseHandler.prototype, "presentableVersionService", void 0);
PresentableAuthResponseHandler = __decorate([
    (0, midway_1.provide)()
], PresentableAuthResponseHandler);
exports.PresentableAuthResponseHandler = PresentableAuthResponseHandler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlc2VudGFibGUtYXV0aC1yZXNwb25zZS1oYW5kbGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2V4dGVuZC9hdXRoLXJlc3BvbnNlLWhhbmRsZXIvcHJlc2VudGFibGUtYXV0aC1yZXNwb25zZS1oYW5kbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztBQUFBLG1DQUF1QztBQVV2QyxtQ0FBdUQ7QUFDdkQseURBQXVEO0FBQ3ZELHVEQU8wQjtBQUMxQixrRkFBd0Y7QUFHeEYsSUFBYSw4QkFBOEIsR0FBM0MsTUFBYSw4QkFBOEI7SUFHdkMsR0FBRyxDQUFpQjtJQUVwQixpQkFBaUIsQ0FBcUI7SUFFdEMseUJBQXlCLENBQTZCO0lBRXREOzs7Ozs7OztPQVFHO0lBQ0gsS0FBSyxDQUFDLE1BQU0sQ0FBQyxlQUFnQyxFQUFFLHNCQUE4QyxFQUFFLFVBQTZCLEVBQUUsU0FBa0IsRUFBRSxtQkFBNEIsRUFBRSxlQUF3QjtRQUVwTSxNQUFNLCtCQUErQixHQUFHLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxzQkFBc0IsQ0FBQyxjQUFjLEVBQUUsU0FBUyxFQUFFLG1CQUFtQixDQUFDLENBQUM7UUFDaEosSUFBSSxDQUFDLCtCQUErQixFQUFFO1lBQ2xDLE1BQU0sVUFBVSxHQUFHLElBQUksa0NBQWlCLENBQUMsc0NBQW1CLENBQUMsa0JBQWtCLENBQUM7aUJBQzNFLFdBQVcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyx3QkFBd0IsRUFBRSwrQkFBK0IsQ0FBQyxDQUFDLENBQUM7WUFDOUYsSUFBSSxDQUFDLCtCQUErQixDQUFDLFVBQVUsQ0FBQyxDQUFDO1NBQ3BEO1FBRUQsTUFBTSxJQUFJLENBQUMsMEJBQTBCLENBQUMsZUFBZSxFQUFFLHNCQUFzQixFQUFFLCtCQUErQixDQUFDLENBQUM7UUFFaEgsTUFBTSxlQUFlLEdBQUcsSUFBQSxjQUFLLEVBQUMsSUFBSSxDQUFDLEdBQUcs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