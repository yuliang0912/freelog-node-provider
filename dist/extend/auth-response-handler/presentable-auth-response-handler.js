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
const egg_freelog_base_1 = require("egg-freelog-base");
let PresentableAuthResponseHandler = class PresentableAuthResponseHandler {
    /**
     * 授权结果统一响应处理
     * @param presentableInfo
     * @param presentableVersionInfo
     * @param authResult
     * @param parentNid
     * @param subResourceIdOrName
     */
    async handle(presentableInfo, presentableVersionInfo, authResult, parentNid, subResourceIdOrName) {
        const realResponseResourceVersionInfo = this.getRealResponseResourceInfo(presentableVersionInfo.dependencyTree, parentNid, subResourceIdOrName);
        if (!realResponseResourceVersionInfo) {
            const authResult = new auth_interface_1.SubjectAuthResult(egg_freelog_base_1.SubjectAuthCodeEnum.AuthArgumentsError)
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
                await this.fileStreamResponseHandle(realResponseResourceVersionInfo.versionId, realResponseResourceVersionInfo.resourceType, presentableInfo.presentableTitle);
                break;
            default:
                this.ctx.error(new egg_freelog_base_1.ApplicationError('未实现的授权展示方式'));
                break;
        }
    }
    /**
     * 公共响应头处理
     * @param presentableVersionInfo
     * @param realResponseResourceVersionInfo
     */
    commonResponseHeaderHandle(presentableVersionInfo, realResponseResourceVersionInfo) {
        const responseDependencies = realResponseResourceVersionInfo.dependencies.map(x => Object({
            id: x.resourceId, name: x.resourceName, type: 'resource', resourceType: x.resourceType
        }));
        this.ctx.set('freelog-entity-nid', realResponseResourceVersionInfo.nid);
        this.ctx.set('freelog-sub-dependencies', encodeURIComponent(JSON.stringify(responseDependencies)));
        this.ctx.set('freelog-resource-type', realResponseResourceVersionInfo.resourceType);
        // realResponseResourceVersionInfo.nid === this.
        this.ctx.set('freelog-resource-property', encodeURIComponent(JSON.stringify(presentableVersionInfo.versionProperty)));
        // MDN: https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Headers/Access-Control-Expose-Headers
        this.ctx.set('Access-Control-Expose-Headers', 'freelog-entity-nid,freelog-sub-dependencies,freelog-resource-type,freelog-resource-property');
    }
    /**
     * 文件流响应处理
     * @param versionId
     * @param resourceType
     * @param attachmentName
     */
    async fileStreamResponseHandle(versionId, resourceType, attachmentName) {
        const response = await this.outsideApiService.getFileStream(versionId);
        if (!response.res.statusCode.toString().startsWith('2')) {
            throw new egg_freelog_base_1.ApplicationError('文件读取失败');
        }
        this.ctx.body = response.data;
        if (lodash_1.isString(attachmentName)) {
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
            const body = {
                ret: egg_freelog_base_1.RetCodeEnum.success,
                errCode: egg_freelog_base_1.ErrCodeEnum.authorizationError,
                msg: this.ctx.gettext('subject-authorization-failed'),
                data: authResult
            };
            this.ctx.body = body;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlc2VudGFibGUtYXV0aC1yZXNwb25zZS1oYW5kbGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2V4dGVuZC9hdXRoLXJlc3BvbnNlLWhhbmRsZXIvcHJlc2VudGFibGUtYXV0aC1yZXNwb25zZS1oYW5kbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztBQUFBLDZCQUEwQjtBQUMxQixtQ0FBdUM7QUFPdkMsbUNBQXVEO0FBQ3ZELHlEQUF1RDtBQUN2RCx1REFPMEI7QUFHMUIsSUFBYSw4QkFBOEIsR0FBM0MsTUFBYSw4QkFBOEI7SUFTdkM7Ozs7Ozs7T0FPRztJQUNILEtBQUssQ0FBQyxNQUFNLENBQUMsZUFBZ0MsRUFBRSxzQkFBOEMsRUFBRSxVQUE2QixFQUFFLFNBQWtCLEVBQUUsbUJBQTRCO1FBRTFLLE1BQU0sK0JBQStCLEdBQUcsSUFBSSxDQUFDLDJCQUEyQixDQUFDLHNCQUFzQixDQUFDLGNBQWMsRUFBRSxTQUFTLEVBQUUsbUJBQW1CLENBQUMsQ0FBQztRQUNoSixJQUFJLENBQUMsK0JBQStCLEVBQUU7WUFDbEMsTUFBTSxVQUFVLEdBQUcsSUFBSSxrQ0FBaUIsQ0FBQyxzQ0FBbUIsQ0FBQyxrQkFBa0IsQ0FBQztpQkFDM0UsV0FBVyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLHdCQUF3QixFQUFFLCtCQUErQixDQUFDLENBQUMsQ0FBQztZQUM5RixJQUFJLENBQUMsK0JBQStCLENBQUMsVUFBVSxDQUFDLENBQUM7U0FDcEQ7UUFFRCxJQUFJLENBQUMsMEJBQTBCLENBQUMsc0JBQXNCLEVBQUUsK0JBQStCLENBQUMsQ0FBQztRQUV6RixNQUFNLGVBQWUsR0FBRyxjQUFLLENBQUMsV0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENB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