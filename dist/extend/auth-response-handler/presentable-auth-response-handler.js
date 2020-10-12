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
const url_1 = require("url");
const midway_1 = require("midway");
const lodash_1 = require("lodash");
const auth_interface_1 = require("../../auth-interface");
const index_1 = require("egg-freelog-base/index");
let PresentableAuthResponseHandler = class PresentableAuthResponseHandler {
    /**
     * 授权结果统一响应处理
     * @param presentableInfo
     * @param presentableVersionInfo
     * @param authResult
     * @param entityNid
     * @param subResourceIdOrName
     */
    async handle(presentableInfo, presentableVersionInfo, authResult, parentNid, subResourceIdOrName) {
        const realResponseResourceVersionInfo = this.getRealResponseResourceInfo(presentableVersionInfo.dependencyTree, parentNid, subResourceIdOrName);
        if (!realResponseResourceVersionInfo) {
            const authResult = new auth_interface_1.SubjectAuthResult(auth_interface_1.SubjectAuthCodeEnum.AuthArgumentsError)
                .setErrorMsg(this.ctx.gettext('params-validate-failed', 'entityNid,subResourceIdOrName'));
            this.subjectAuthFailedResponseHandle(authResult);
        }
        this.commonResponseHeaderHandle(presentableVersionInfo, realResponseResourceVersionInfo);
        const apiResponseType = lodash_1.chain(url_1.parse(this.ctx.request.url, false).pathname).trimEnd('/').split('/').last().value();
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
                await this.fileStreamResponseHandle(realResponseResourceVersionInfo.fileSha1, realResponseResourceVersionInfo.resourceType, presentableInfo.presentableTitle);
                break;
            default:
                this.ctx.error(new index_1.ApplicationError('未实现的授权展示方式'));
                break;
        }
    }
    /**
     * 公共响应头处理
     * @param presentableVersionInfo
     * @param realResponseVersionInfo
     */
    commonResponseHeaderHandle(presentableVersionInfo, realResponseResourceVersionInfo) {
        const responseDependencies = realResponseResourceVersionInfo.dependencies.map(x => Object({
            id: x.resourceId, name: x.resourceName, type: 'resource', resourceType: x.resourceType
        }));
        this.ctx.set('freelog-entity-nid', realResponseResourceVersionInfo.nid);
        this.ctx.set('freelog-sub-dependencies', encodeURIComponent(JSON.stringify(responseDependencies)));
        this.ctx.set('freelog-resource-type', realResponseResourceVersionInfo.resourceType);
        this.ctx.set('freelog-meta', encodeURIComponent(JSON.stringify(presentableVersionInfo.versionProperty)));
    }
    /**
     * 文件流响应处理
     * @param presentableInfo
     * @param presentableVersionInfo
     * @param realResponseResourceVersionInfo
     */
    async fileStreamResponseHandle(fileSha1, resourceType, attachmentName) {
        const response = await this.outsideApiService.getFileStream(fileSha1);
        if ((response.res.headers['content-type'] ?? '').includes('application/json')) {
            throw new index_1.ApplicationError('文件读取失败', { msg: JSON.parse(response.data.toString())?.msg });
        }
        if (!response.res.statusCode.toString().startsWith('2')) {
            throw new index_1.ApplicationError('文件读取失败');
        }
        this.ctx.body = response.data;
        this.ctx.set('content-length', response.res.headers['content-length']);
        if (lodash_1.isString(attachmentName)) {
            this.ctx.attachment(attachmentName);
        }
        if (['video', 'audio'].includes(resourceType)) {
            this.ctx.set('Accept-Ranges', 'bytes');
        }
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
    subjectAuthFailedResponseHandle(authResult) {
        if (!authResult.isAuth) {
            throw new index_1.AuthorizationError(this.ctx.gettext('subject-authorization-failed'), {
                authCode: authResult.authCode, authResult
            });
        }
    }
    subjectAuthProcessExceptionHandle(error) {
        const authResult = new auth_interface_1.SubjectAuthResult(auth_interface_1.SubjectAuthCodeEnum.AuthApiException).setData({ error }).setErrorMsg('授权过程中出现异常');
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
     * @param presentableAuthTree
     * @param parentEntityNid
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
            const matchedResourceInfo = lodash_1.first(matchedResources);
            parentNid = matchedResourceInfo.parentNid;
            subResourceIdOrName = matchedResourceInfo.resourceId;
        }
        const dependencies = this.presentableVersionService.convertPresentableDependencyTree(flattenPresentableDependencyTree, parentNid, true, 3);
        if (lodash_1.isEmpty(dependencies)) {
            return null;
        }
        const parentDependency = lodash_1.first(dependencies);
        if (!lodash_1.isString(subResourceIdOrName)) {
            return parentDependency;
        }
        return parentDependency.dependencies.find(x => x.resourceId === subResourceIdOrName);
    }
};
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], PresentableAuthResponseHandler.prototype, "ctx", void 0);
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], PresentableAuthResponseHandler.prototype, "outsideApiService", void 0);
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], PresentableAuthResponseHandler.prototype, "presentableVersionService", void 0);
PresentableAuthResponseHandler = __decorate([
    midway_1.provide()
], PresentableAuthResponseHandler);
exports.PresentableAuthResponseHandler = PresentableAuthResponseHandler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlc2VudGFibGUtYXV0aC1yZXNwb25zZS1oYW5kbGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2V4dGVuZC9hdXRoLXJlc3BvbnNlLWhhbmRsZXIvcHJlc2VudGFibGUtYXV0aC1yZXNwb25zZS1oYW5kbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztBQUFBLDZCQUEwQjtBQUMxQixtQ0FBdUM7QUFTdkMsbUNBQXVEO0FBQ3ZELHlEQUE0RTtBQUM1RSxrREFBNEU7QUFHNUUsSUFBYSw4QkFBOEIsR0FBM0MsTUFBYSw4QkFBOEI7SUFTdkM7Ozs7Ozs7T0FPRztJQUNILEtBQUssQ0FBQyxNQUFNLENBQUMsZUFBZ0MsRUFBRSxzQkFBOEMsRUFBRSxVQUE2QixFQUFFLFNBQWtCLEVBQUUsbUJBQTRCO1FBRTFLLE1BQU0sK0JBQStCLEdBQUcsSUFBSSxDQUFDLDJCQUEyQixDQUFDLHNCQUFzQixDQUFDLGNBQWMsRUFBRSxTQUFTLEVBQUUsbUJBQW1CLENBQUMsQ0FBQztRQUNoSixJQUFJLENBQUMsK0JBQStCLEVBQUU7WUFDbEMsTUFBTSxVQUFVLEdBQUcsSUFBSSxrQ0FBaUIsQ0FBQyxvQ0FBbUIsQ0FBQyxrQkFBa0IsQ0FBQztpQkFDM0UsV0FBVyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLHdCQUF3QixFQUFFLCtCQUErQixDQUFDLENBQUMsQ0FBQztZQUM5RixJQUFJLENBQUMsK0JBQStCLENBQUMsVUFBVSxDQUFDLENBQUM7U0FDcEQ7UUFFRCxJQUFJLENBQUMsMEJBQTBCLENBQUMsc0JBQXNCLEVBQUUsK0JBQStCLENBQUMsQ0FBQztRQUV6RixNQUFNLGVBQWUsR0FBRyxjQUFLLENBQUMsV0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENB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