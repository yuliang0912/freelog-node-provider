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
exports.SubjectPresentableAuthResponseHandler = void 0;
const midway_1 = require("midway");
const lodash_1 = require("lodash");
const auth_interface_1 = require("../../auth-interface");
const egg_freelog_base_1 = require("egg-freelog-base");
const freelog_common_func_1 = require("egg-freelog-base/lib/freelog-common-func");
let SubjectPresentableAuthResponseHandler = class SubjectPresentableAuthResponseHandler {
    ctx;
    outsideApiService;
    nodeService;
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
    async presentableHandle(presentableInfo, presentableVersionInfo, authResult, parentNid, subResourceIdOrName, subResourceFile) {
        const subjectInfo = this._presentableWrapToSubjectBaseInfo(presentableInfo, presentableVersionInfo);
        const realResponseResourceVersionInfo = this._getRealResponseResourceInfo(presentableVersionInfo.dependencyTree, parentNid, subResourceIdOrName);
        if (!realResponseResourceVersionInfo) {
            const authResult = new auth_interface_1.SubjectAuthResult(egg_freelog_base_1.SubjectAuthCodeEnum.AuthArgumentsError)
                .setErrorMsg(this.ctx.gettext('params-validate-failed', 'entityNid,subResourceIdOrName'));
            this.subjectAuthFailedResponseHandle(subjectInfo, authResult);
        }
        await this.commonResponseHeaderHandle(subjectInfo, realResponseResourceVersionInfo);
        const apiResponseType = lodash_1.chain(this.ctx.path).trimEnd('/').split('/').last().value();
        switch (apiResponseType) {
            case 'result':
                this.subjectAuthResultResponse(subjectInfo, authResult);
                break;
            case 'info':
                this.subjectAuthFailedResponseHandle(subjectInfo, authResult);
                if (realResponseResourceVersionInfo.resourceId === subjectInfo.subjectId) {
                    this.subjectInfoResponseHandle(subjectInfo);
                }
                else {
                    this.subjectInfoResponseHandle(subjectInfo);
                }
                break;
            case 'resourceInfo':
                this.subjectAuthFailedResponseHandle(subjectInfo, authResult);
                await this.subjectUpstreamResourceInfoResponseHandle(realResponseResourceVersionInfo.resourceId);
                break;
            case 'fileStream':
                this.subjectAuthFailedResponseHandle(subjectInfo, authResult);
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
     * @param subjectInfo
     * @param realResponseResourceVersionInfo
     */
    async commonResponseHeaderHandle(subjectInfo, realResponseResourceVersionInfo) {
        const responseDependencies = realResponseResourceVersionInfo.dependencies.map(x => Object({
            id: x.resourceId, name: x.resourceName, type: 'resource', resourceType: x.resourceType
        }));
        this.ctx.set('freelog-entity-nid', realResponseResourceVersionInfo.nid);
        this.ctx.set('freelog-subject-id', subjectInfo?.subjectId);
        this.ctx.set('freelog-subject-name', encodeURIComponent(subjectInfo?.subjectName ?? ''));
        this.ctx.set('freelog-subject-property', encodeURIComponent(JSON.stringify(subjectInfo.meta ?? {})));
        this.ctx.set('freelog-sub-dependencies', encodeURIComponent(JSON.stringify(responseDependencies)));
        this.ctx.set('freelog-resource-type', realResponseResourceVersionInfo.resourceType);
        this.ctx.set('Access-Control-Expose-Headers', 'freelog-entity-nid,freelog-subject-id,freelog-subject-name,freelog-sub-dependencies,freelog-resource-type,freelog-subject-property');
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
     * @param subjectInfo
     */
    subjectInfoResponseHandle(subjectInfo) {
        this.ctx.success(subjectInfo);
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
     * @param subjectBaseInfo
     * @param authResult
     */
    subjectAuthFailedResponseHandle(subjectBaseInfo, authResult) {
        if (!authResult.isAuth) {
            this.subjectAuthResultResponse(subjectBaseInfo, authResult);
            this.ctx.status = 402;
            throw new egg_freelog_base_1.BreakOffError();
        }
    }
    /**
     * 标的物授权结果响应
     * @param subjectBaseInfo
     * @param authResult
     */
    subjectAuthResultResponse(subjectBaseInfo, authResult) {
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
     * @param flattenPresentableDependencyTree
     * @param parentNid
     * @param subResourceIdOrName
     */
    _getRealResponseResourceInfo(flattenPresentableDependencyTree, parentNid, subResourceIdOrName) {
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
    /**
     * 展品转换为标的物
     * @param presentableInfo
     * @param presentableVersionInfo
     */
    _presentableWrapToSubjectBaseInfo(presentableInfo, presentableVersionInfo) {
        const subjectInfo = {
            subjectId: presentableInfo.presentableId,
            subjectType: egg_freelog_base_1.SubjectTypeEnum.Presentable,
            subjectName: presentableInfo.presentableName,
            licensorId: presentableInfo.nodeId,
            licensorName: presentableInfo.nodeId.toString(),
            licensorOwnerId: presentableInfo.userId,
            licensorOwnerName: presentableInfo.userId.toString(),
            policies: presentableInfo.policies,
            status: presentableInfo.onlineStatus === 1 ? 1 : 0,
            meta: presentableVersionInfo.versionProperty,
            // 以下为展品拓展属性
            subjectTitle: presentableInfo.presentableTitle,
            coverImages: presentableInfo.coverImages,
            tags: presentableInfo.tags,
            onlineStatus: presentableInfo.onlineStatus,
            version: presentableInfo.version,
            resourceInfo: presentableInfo.resourceInfo
        };
        return subjectInfo;
    }
};
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], SubjectPresentableAuthResponseHandler.prototype, "ctx", void 0);
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], SubjectPresentableAuthResponseHandler.prototype, "outsideApiService", void 0);
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], SubjectPresentableAuthResponseHandler.prototype, "nodeService", void 0);
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], SubjectPresentableAuthResponseHandler.prototype, "presentableVersionService", void 0);
SubjectPresentableAuthResponseHandler = __decorate([
    midway_1.provide()
], SubjectPresentableAuthResponseHandler);
exports.SubjectPresentableAuthResponseHandler = SubjectPresentableAuthResponseHandler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3ViamVjdC1wcmVzZW50YWJsZS1hdXRoLXJlc3BvbnNlLWhhbmRsZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvZXh0ZW5kL2F1dGgtcmVzcG9uc2UtaGFuZGxlci9zdWJqZWN0LXByZXNlbnRhYmxlLWF1dGgtcmVzcG9uc2UtaGFuZGxlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7QUFBQSxtQ0FBdUM7QUFVdkMsbUNBQXVEO0FBQ3ZELHlEQUFpRztBQUNqRyx1REFNMEI7QUFDMUIsa0ZBQXdGO0FBR3hGLElBQWEscUNBQXFDLEdBQWxELE1BQWEscUNBQXFDO0lBRzlDLEdBQUcsQ0FBaUI7SUFFcEIsaUJBQWlCLENBQXFCO0lBRXRDLFdBQVcsQ0FBZTtJQUUxQix5QkFBeUIsQ0FBNkI7SUFFdEQ7Ozs7Ozs7O09BUUc7SUFDSCxLQUFLLENBQUMsaUJBQWlCLENBQUMsZUFBZ0MsRUFBRSxzQkFBOEMsRUFBRSxVQUE2QixFQUFFLFNBQWtCLEVBQUUsbUJBQTRCLEVBQUUsZUFBd0I7UUFFL00sTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLGlDQUFpQyxDQUFDLGVBQWUsRUFBRSxzQkFBc0IsQ0FBQyxDQUFDO1FBQ3BHLE1BQU0sK0JBQStCLEdBQUcsSUFBSSxDQUFDLDRCQUE0QixDQUFDLHNCQUFzQixDQUFDLGNBQWMsRUFBRSxTQUFTLEVBQUUsbUJBQW1CLENBQUMsQ0FBQztRQUNqSixJQUFJLENBQUMsK0JBQStCLEVBQUU7WUFDbEMsTUFBTSxVQUFVLEdBQUcsSUFBSSxrQ0FBaUIsQ0FBQyxzQ0FBbUIsQ0FBQyxrQkFBa0IsQ0FBQztpQkFDM0UsV0FBVyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLHdCQUF3QixFQUFFLCtCQUErQixDQUFDLENBQUMsQ0FBQztZQUM5RixJQUFJLENBQUMsK0JBQStCLENBQUMsV0FBVyxFQUFFLFVBQVUsQ0FBQyxDQUFDO1NBQ2pFO1FBRUQsTUFB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