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
const index_1 = require("egg-freelog-base/index");
let TestResourceAuthResponseHandler = class TestResourceAuthResponseHandler {
    /**
     * 授权结果统一响应处理
     * @param presentableInfo
     * @param presentableVersionInfo
     * @param authResult
     * @param entityNid
     * @param subResourceIdOrName
     */
    async handle(testResourceInfo, flattenDependencyTree, authResult, parentNid, subEntityIdOrName, subEntityType) {
        const realResponseEntityInfo = this.getRealResponseEntityInfo(flattenDependencyTree, parentNid, subEntityIdOrName, subEntityType);
        if (!realResponseEntityInfo) {
            const authResult = new auth_interface_1.SubjectAuthResult(auth_interface_1.SubjectAuthCodeEnum.AuthArgumentsError)
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
                this.ctx.error(new index_1.ApplicationError('未实现的授权展示方式'));
                break;
        }
    }
    /**
     * 公共响应头处理
     * @param presentableVersionInfo
     * @param realResponseVersionInfo
     */
    commonResponseHeaderHandle(responseTestResourceDependencyTree) {
        this.ctx.set('freelog-entity-nid', responseTestResourceDependencyTree.nid);
        this.ctx.set('freelog-sub-dependencies', encodeURIComponent(JSON.stringify(responseTestResourceDependencyTree.dependencies)));
        this.ctx.set('freelog-resource-type', responseTestResourceDependencyTree.resourceType);
        // this.ctx.set('freelog-meta', encodeURIComponent(JSON.stringify(presentableVersionInfo.versionProperty)));
    }
    /**
     * 文件流响应处理
     * @param presentableInfo
     * @param presentableVersionInfo
     * @param realResponseResourceVersionInfo
     */
    async fileStreamResponseHandle(fileSha1, entityId, entityType, attachmentName) {
        // entityType === TestResourceOriginType.Resource
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
        if (['video', 'audio'].includes(entityType)) {
            this.ctx.set('Accept-Ranges', 'bytes');
        }
    }
    /**
     * 标的物自身信息展示
     * @param presentableInfo
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdC1yZXNvdXJjZS1hdXRoLXJlc3BvbnNlLWhhbmRsZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvZXh0ZW5kL2F1dGgtcmVzcG9uc2UtaGFuZGxlci90ZXN0LXJlc291cmNlLWF1dGgtcmVzcG9uc2UtaGFuZGxlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7QUFBQSw2QkFBMEI7QUFDMUIsbUNBQXVDO0FBQ3ZDLG1DQUF1RDtBQUN2RCx5REFBNEU7QUFDNUUsa0RBQTRFO0FBTzVFLElBQWEsK0JBQStCLEdBQTVDLE1BQWEsK0JBQStCO0lBU3hDOzs7Ozs7O09BT0c7SUFDSCxLQUFLLENBQUMsTUFBTSxDQUFDLGdCQUFrQyxFQUFFLHFCQUEwRCxFQUFFLFVBQTZCLEVBQUUsU0FBa0IsRUFBRSxpQkFBMEIsRUFBRSxhQUFzQjtRQUU5TSxNQUFNLHNCQUFzQixHQUFHLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxxQkFBcUIsRUFBRSxTQUFTLEVBQUUsaUJBQWlCLEVBQUUsYUFBYSxDQUFDLENBQUM7UUFDbEksSUFBSSxDQUFDLHNCQUFzQixFQUFFO1lBQ3pCLE1BQU0sVUFBVSxHQUFHLElBQUksa0NBQWlCLENBQUMsb0NBQW1CLENBQUMsa0JBQWtCLENBQUM7aUJBQzNFLFdBQVcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyx3QkFBd0IsRUFBRSw2QkFBNkIsQ0FBQyxDQUFDLENBQUM7WUFDNUYsSUFBSSxDQUFDLCtCQUErQixDQUFDLFVBQVUsQ0FBQyxDQUFDO1NBQ3BEO1FBRUQsSUFBSSxDQUFDLDBCQUEwQixDQUFDLHNCQUFzQixDQUFDLENBQUM7UUFFeEQsTUFBTSxlQUFlLEdBQUcsY0FBSyxDQUFDLFdBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsS0FBSyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FB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