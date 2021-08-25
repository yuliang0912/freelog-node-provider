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
    ctx;
    testNodeGenerator;
    outsideApiService;
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
        const apiResponseType = lodash_1.chain(new url_1.URL(this.ctx.request.url).pathname).trimEnd('/').split('/').last().value();
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdC1yZXNvdXJjZS1hdXRoLXJlc3BvbnNlLWhhbmRsZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvZXh0ZW5kL2F1dGgtcmVzcG9uc2UtaGFuZGxlci90ZXN0LXJlc291cmNlLWF1dGgtcmVzcG9uc2UtaGFuZGxlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7QUFBQSw2QkFBd0I7QUFDeEIsbUNBQXVDO0FBQ3ZDLG1DQUF1RDtBQUN2RCx5REFBdUQ7QUFDdkQsdURBQTJHO0FBTzNHLElBQWEsK0JBQStCLEdBQTVDLE1BQWEsK0JBQStCO0lBR3hDLEdBQUcsQ0FBaUI7SUFFcEIsaUJBQWlCLENBQUM7SUFFbEIsaUJBQWlCLENBQXFCO0lBRXRDOzs7Ozs7OztPQVFHO0lBQ0gsS0FBSyxDQUFDLE1BQU0sQ0FBQyxnQkFBa0MsRUFBRSxxQkFBMEQsRUFBRSxVQUE2QixFQUFFLFNBQWtCLEVBQUUsaUJBQTBCLEVBQUUsYUFBc0I7UUFFOU0sTUFBTSxzQkFBc0IsR0FBRyxJQUFJLENBQUMseUJBQXlCLENBQUMscUJBQXFCLEVBQUUsU0FBUyxFQUFFLGlCQUFpQixFQUFFLGFBQWEsQ0FBQyxDQUFDO1FBQ2xJLElBQUksQ0FBQyxzQkFBc0IsRUFBRTtZQUN6QixNQUFNLFVBQVUsR0FBRyxJQUFJLGtDQUFpQixDQUFDLHNDQUFtQixDQUFDLGtCQUFrQixDQUFDO2lCQUMzRSxXQUFXLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsd0JBQXdCLEVBQUUsNkJBQTZCLENBQUMsQ0FBQyxDQUFDO1lBQzVGLElBQUksQ0FBQywrQkFBK0IsQ0FBQyxVQUFVLENBQUMsQ0FBQztTQUNwRDtRQUVELElBQUksQ0FBQywwQkFBMEIsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO1FBRXhELE1BQU0sZUFBZSxHQUFHLGNBQUssQ0FBQyxJQUFJLFNBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FB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