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
        const apiResponseType = lodash_1.chain(this.ctx.path).trimEnd('/').split('/').last().value();
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdC1yZXNvdXJjZS1hdXRoLXJlc3BvbnNlLWhhbmRsZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvZXh0ZW5kL2F1dGgtcmVzcG9uc2UtaGFuZGxlci90ZXN0LXJlc291cmNlLWF1dGgtcmVzcG9uc2UtaGFuZGxlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7QUFBQSxtQ0FBdUM7QUFDdkMsbUNBQXVEO0FBQ3ZELHlEQUF1RDtBQUN2RCx1REFBMkc7QUFPM0csSUFBYSwrQkFBK0IsR0FBNUMsTUFBYSwrQkFBK0I7SUFHeEMsR0FBRyxDQUFpQjtJQUVwQixpQkFBaUIsQ0FBQztJQUVsQixpQkFBaUIsQ0FBcUI7SUFFdEM7Ozs7Ozs7O09BUUc7SUFDSCxLQUFLLENBQUMsTUFBTSxDQUFDLGdCQUFrQyxFQUFFLHFCQUEwRCxFQUFFLFVBQTZCLEVBQUUsU0FBa0IsRUFBRSxpQkFBMEIsRUFBRSxhQUFzQjtRQUU5TSxNQUFNLHNCQUFzQixHQUFHLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxxQkFBcUIsRUFBRSxTQUFTLEVBQUUsaUJBQWlCLEVBQUUsYUFBYSxDQUFDLENBQUM7UUFDbEksSUFBSSxDQUFDLHNCQUFzQixFQUFFO1lBQ3pCLE1BQU0sVUFBVSxHQUFHLElBQUksa0NBQWlCLENBQUMsc0NBQW1CLENBQUMsa0JBQWtCLENBQUM7aUJBQzNFLFdBQVcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyx3QkFBd0IsRUFBRSw2QkFBNkIsQ0FBQyxDQUFDLENBQUM7WUFDNUYsSUFBSSxDQUFDLCtCQUErQixDQUFDLFVBQVUsQ0FBQyxDQUFDO1NBQ3BEO1FBRUQsSUFBSSxDQUFDLDBCQUEwQixDQUFDLHNCQUFzQixDQUFDLENBQUM7UUFDeEQsTUFBTSxlQUFlLEdBQUcsY0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxD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