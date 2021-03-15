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
exports.TestResourceAuthResponseHandler = void 0;
const url_1 = require("url");
const midway_1 = require("midway");
const lodash_1 = require("lodash");
const auth_interface_1 = require("../../auth-interface");
const egg_freelog_base_1 = require("egg-freelog-base");
let TestResourceAuthResponseHandler = class TestResourceAuthResponseHandler {
    /**
     * 授权结果统一响应处理
     * @param testResourceInfo
     * @param flattenDependencyTree
     * @param authResult
     * @param parentNid
     * @param subEntityIdOrName
     * @param subEntityType
     */
    async handle(testResourceInfo, flattenDependencyTree, authResult, parentNid, subEntityIdOrName, subEntityType) {
        const realResponseEntityInfo = this.getRealResponseEntityInfo(flattenDependencyTree, parentNid, subEntityIdOrName, subEntityType);
        if (!realResponseEntityInfo) {
            const authResult = new auth_interface_1.SubjectAuthResult(egg_freelog_base_1.SubjectAuthCodeEnum.AuthArgumentsError)
                .setErrorMsg(this.ctx.gettext('params-validate-failed', 'parentNid,subEntityIdOrName'));
            this.subjectAuthFailedResponseHandle(authResult);
        }
        this.commonResponseHeaderHandle(realResponseEntityInfo);
        const apiResponseType = lodash_1.chain(url_1.parse(this.ctx.request.url, false).pathname).trimEnd('/').split('/').last().value();
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
                await this.fileStreamResponseHandle(realResponseEntityInfo.fileSha1, realResponseEntityInfo.id, realResponseEntityInfo.resourceType, realResponseEntityInfo.name);
                break;
            default:
                this.ctx.error(new egg_freelog_base_1.ApplicationError('未实现的授权展示方式'));
                break;
        }
    }
    /**
     * 公共响应头处理
     * @param responseTestResourceDependencyTree
     */
    commonResponseHeaderHandle(responseTestResourceDependencyTree) {
        this.ctx.set('freelog-entity-nid', responseTestResourceDependencyTree.nid);
        this.ctx.set('freelog-sub-dependencies', encodeURIComponent(JSON.stringify(responseTestResourceDependencyTree.dependencies)));
        this.ctx.set('freelog-resource-type', responseTestResourceDependencyTree.resourceType);
        // this.ctx.set('freelog-resource-property', encodeURIComponent(JSON.stringify(presentableVersionInfo.versionProperty)));
        this.ctx.set('Access-Control-Expose-Headers', 'freelog-entity-nid,freelog-sub-dependencies,freelog-resource-type');
    }
    /**
     * 文件流响应处理
     * @param fileSha1
     * @param entityId
     * @param entityType
     * @param attachmentName
     */
    async fileStreamResponseHandle(fileSha1, entityId, entityType, attachmentName) {
        // entityType === TestResourceOriginType.Resource
        const response = await this.outsideApiService.getFileStream(fileSha1);
        if ((response.res.headers['content-type'] ?? '').includes('application/json')) {
            throw new egg_freelog_base_1.ApplicationError('文件读取失败', { msg: JSON.parse(response.data.toString())?.msg });
        }
        if (!response.res.statusCode.toString().startsWith('2')) {
            throw new egg_freelog_base_1.ApplicationError('文件读取失败');
        }
        this.ctx.body = response.data;
        this.ctx.set('content-length', response.res.headers['content-length']);
        if (lodash_1.isString(attachmentName)) {
            this.ctx.attachment(attachmentName);
        }
        if (['video', 'audio'].includes(entityType)) {
            this.ctx.set('Accept-Ranges', 'bytes');
        }
    }
    /**
     * 标的物自身信息展示
     * @param testResourceInfo
     */
    subjectInfoResponseHandle(testResourceInfo) {
        this.ctx.success(testResourceInfo);
    }
    /**
     * 标的物上游资源信息展示
     * @param resourceId
     */
    async subjectUpstreamResourceInfoResponseHandle(resourceId) {
        // const resourceInfo = await this.outsideApiService.getResourceInfo(resourceId);
        // this.ctx.success(resourceInfo);
    }
    subjectAuthFailedResponseHandle(authResult) {
        if (!authResult.isAuth) {
            throw new egg_freelog_base_1.AuthorizationError(this.ctx.gettext('subject-authorization-failed'), {
                authCode: authResult.authCode, authResult
            });
        }
    }
    subjectAuthProcessExceptionHandle(error) {
        const authResult = new auth_interface_1.SubjectAuthResult(egg_freelog_base_1.SubjectAuthCodeEnum.AuthApiException).setData({ error }).setErrorMsg('授权过程中出现异常');
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
     * @param flattenTestResourceDependencyTree
     * @param parentNid
     * @param subEntityIdOrName
     * @param subEntityType
     */
    getRealResponseEntityInfo(flattenTestResourceDependencyTree, parentNid, subEntityIdOrName, subEntityType) {
        // 任意条件只要能确定唯一性即可.严格的唯一正常来说需要三个参数一起生效才可以.此处为兼容模式代码
        if (subEntityIdOrName || parentNid || subEntityType) {
            function filterTestResourceDependencyTree(dependencyTree) {
                return (parentNid ? dependencyTree.parentNid === parentNid : true)
                    && (subEntityType ? dependencyTree.type === subEntityType : true)
                    && (subEntityIdOrName ? dependencyTree.id === subEntityIdOrName || dependencyTree.name.toLowerCase() === subEntityIdOrName.toLowerCase() : true);
            }
            const matchedEntities = flattenTestResourceDependencyTree.filter(filterTestResourceDependencyTree);
            if (matchedEntities.length !== 1) {
                return null;
            }
            const matchedEntityInfo = lodash_1.first(matchedEntities);
            parentNid = matchedEntityInfo.parentNid;
            subEntityIdOrName = matchedEntityInfo.id;
            subEntityType = matchedEntityInfo.type;
        }
        const dependencies = this.testNodeGenerator.generateTestResourceDependencyTree(flattenTestResourceDependencyTree, parentNid, 3, true);
        if (lodash_1.isEmpty(dependencies)) {
            return null;
        }
        const parentDependency = lodash_1.first(dependencies);
        if (!lodash_1.isString(subEntityIdOrName)) {
            return parentDependency;
        }
        return parentDependency.dependencies.find(x => x.id === subEntityIdOrName && x.type === subEntityType);
    }
};
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], TestResourceAuthResponseHandler.prototype, "ctx", void 0);
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], TestResourceAuthResponseHandler.prototype, "testNodeGenerator", void 0);
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], TestResourceAuthResponseHandler.prototype, "outsideApiService", void 0);
TestResourceAuthResponseHandler = __decorate([
    midway_1.provide()
], TestResourceAuthResponseHandler);
exports.TestResourceAuthResponseHandler = TestResourceAuthResponseHandler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdC1yZXNvdXJjZS1hdXRoLXJlc3BvbnNlLWhhbmRsZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvZXh0ZW5kL2F1dGgtcmVzcG9uc2UtaGFuZGxlci90ZXN0LXJlc291cmNlLWF1dGgtcmVzcG9uc2UtaGFuZGxlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7QUFBQSw2QkFBMEI7QUFDMUIsbUNBQXVDO0FBQ3ZDLG1DQUF1RDtBQUN2RCx5REFBdUQ7QUFDdkQsdURBQTJHO0FBTzNHLElBQWEsK0JBQStCLEdBQTVDLE1BQWEsK0JBQStCO0lBU3hDOzs7Ozs7OztPQVFHO0lBQ0gsS0FBSyxDQUFDLE1BQU0sQ0FBQyxnQkFBa0MsRUFBRSxxQkFBMEQsRUFBRSxVQUE2QixFQUFFLFNBQWtCLEVBQUUsaUJBQTBCLEVBQUUsYUFBc0I7UUFFOU0sTUFBTSxzQkFBc0IsR0FBRyxJQUFJLENBQUMseUJBQXlCLENBQUMscUJBQXFCLEVBQUUsU0FBUyxFQUFFLGlCQUFpQixFQUFFLGFBQWEsQ0FBQyxDQUFDO1FBQ2xJLElBQUksQ0FBQyxzQkFBc0IsRUFBRTtZQUN6QixNQUFNLFVBQVUsR0FBRyxJQUFJLGtDQUFpQixDQUFDLHNDQUFtQixDQUFDLGtCQUFrQixDQUFDO2lCQUMzRSxXQUFXLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsd0JBQXdCLEVBQUUsNkJBQTZCLENBQUMsQ0FBQyxDQUFDO1lBQzVGLElBQUksQ0FBQywrQkFBK0IsQ0FBQyxVQUFVLENBQUMsQ0FBQztTQUNwRDtRQUVELElBQUksQ0FBQywwQkFBMEIsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO1FBRXhELE1BQU0sZUFBZSxHQUFHLGNBQUssQ0FBQyxXQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLEtBQUssQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENB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