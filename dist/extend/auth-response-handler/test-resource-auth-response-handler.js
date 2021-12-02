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
const test_node_interface_1 = require("../../test-node-interface");
const freelog_common_func_1 = require("egg-freelog-base/lib/freelog-common-func");
const test_node_generator_1 = require("../test-node-generator");
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
     * @param subEntityFile
     */
    async handle(testResourceInfo, flattenDependencyTree, authResult, parentNid, subEntityIdOrName, subEntityType, subEntityFile) {
        const realResponseEntityInfo = this.getRealResponseEntityInfo(flattenDependencyTree, parentNid, subEntityIdOrName, subEntityType);
        if (!realResponseEntityInfo) {
            const authResult = new auth_interface_1.SubjectAuthResult(egg_freelog_base_1.SubjectAuthCodeEnum.AuthArgumentsError)
                .setErrorMsg(this.ctx.gettext('params-validate-failed', 'parentNid,subEntityIdOrName'));
            this.subjectAuthFailedResponseHandle(authResult);
        }
        this.commonResponseHeaderHandle(testResourceInfo, realResponseEntityInfo);
        const apiResponseType = (0, lodash_1.chain)(this.ctx.path).trimEnd('/').split('/').last().value();
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
                if (!subEntityFile) {
                    await this.fileStreamResponseHandle(realResponseEntityInfo);
                }
                else {
                    await this.subEntityFileResponseHandle(realResponseEntityInfo, subEntityFile);
                }
                break;
            default:
                this.ctx.error(new egg_freelog_base_1.ApplicationError('未实现的授权展示方式'));
                break;
        }
    }
    /**
     * 公共响应头处理
     * @param testResourceInfo
     * @param responseTestResourceDependencyTree
     */
    commonResponseHeaderHandle(testResourceInfo, responseTestResourceDependencyTree) {
        this.ctx.set('freelog-entity-nid', responseTestResourceDependencyTree.nid);
        this.ctx.set('freelog-test-resource-id', testResourceInfo.testResourceId);
        this.ctx.set('freelog-test-resource-name', encodeURIComponent(testResourceInfo.testResourceName));
        this.ctx.set('freelog-sub-dependencies', encodeURIComponent(JSON.stringify(responseTestResourceDependencyTree.dependencies)));
        this.ctx.set('freelog-resource-type', responseTestResourceDependencyTree.resourceType);
        //if (responseTestResourceDependencyTree.id === testResourceInfo.originInfo.id) {
        const versionProperty = this.testNodeGenerator._calculateTestResourceProperty(testResourceInfo);
        this.ctx.set('freelog-entity-property', encodeURIComponent(JSON.stringify(versionProperty)));
        // } else {
        //
        // }
        this.ctx.set('Access-Control-Expose-Headers', 'freelog-entity-nid,freelog-test-resource-id,freelog-test-resource-name,freelog-sub-dependencies,freelog-resource-type,freelog-entity-property');
    }
    /**
     * 文件流响应处理
     * @param realResponseEntityInfo
     */
    async fileStreamResponseHandle(realResponseEntityInfo) {
        let response = null;
        if (realResponseEntityInfo.type === test_node_interface_1.TestResourceOriginType.Resource) {
            response = await this.outsideApiService.getResourceFileStream(realResponseEntityInfo.versionId);
        }
        else {
            response = await this.outsideApiService.getObjectFileStream(realResponseEntityInfo.id);
        }
        if ((response.res.headers['content-type'] ?? '').includes('application/json')) {
            throw new egg_freelog_base_1.ApplicationError('文件读取失败', { msg: JSON.parse(response.data.toString())?.msg });
        }
        if (!response.res.statusCode.toString().startsWith('2')) {
            throw new egg_freelog_base_1.ApplicationError('文件读取失败');
        }
        this.ctx.body = response.data;
        this.ctx.attachment(realResponseEntityInfo.name);
        if (['video', 'audio'].includes(realResponseEntityInfo.resourceType)) {
            this.ctx.set('Accept-Ranges', 'bytes');
        }
        this.ctx.set('content-length', response.res.headers['content-length']);
        // 代码需要放到ctx.attachment以后,否则不可控.
        this.ctx.set('content-type', response.res.headers['content-type']);
    }
    /**
     * 获取子资源文件
     * @param realResponseEntityInfo
     * @param subEntityFile
     */
    async subEntityFileResponseHandle(realResponseEntityInfo, subEntityFile) {
        let response = null;
        if (realResponseEntityInfo.type === test_node_interface_1.TestResourceOriginType.Resource) {
            response = await this.outsideApiService.getSubResourceFile(realResponseEntityInfo.id, realResponseEntityInfo.version, subEntityFile);
        }
        else {
            response = await this.outsideApiService.getSubObjectFile(realResponseEntityInfo.id, subEntityFile);
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
            const matchedEntityInfo = (0, lodash_1.first)(matchedEntities);
            parentNid = matchedEntityInfo.parentNid;
            subEntityIdOrName = matchedEntityInfo.id;
            subEntityType = matchedEntityInfo.type;
        }
        const dependencies = this.testNodeGenerator.generateTestResourceDependencyTree(flattenTestResourceDependencyTree, parentNid, 3, true);
        if ((0, lodash_1.isEmpty)(dependencies)) {
            return null;
        }
        const parentDependency = (0, lodash_1.first)(dependencies);
        if (!(0, lodash_1.isString)(subEntityIdOrName)) {
            return parentDependency;
        }
        return parentDependency.dependencies.find(x => x.id === subEntityIdOrName && x.type === subEntityType);
    }
};
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", Object)
], TestResourceAuthResponseHandler.prototype, "ctx", void 0);
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", test_node_generator_1.TestNodeGenerator)
], TestResourceAuthResponseHandler.prototype, "testNodeGenerator", void 0);
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", Object)
], TestResourceAuthResponseHandler.prototype, "outsideApiService", void 0);
TestResourceAuthResponseHandler = __decorate([
    (0, midway_1.provide)()
], TestResourceAuthResponseHandler);
exports.TestResourceAuthResponseHandler = TestResourceAuthResponseHandler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdC1yZXNvdXJjZS1hdXRoLXJlc3BvbnNlLWhhbmRsZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvZXh0ZW5kL2F1dGgtcmVzcG9uc2UtaGFuZGxlci90ZXN0LXJlc291cmNlLWF1dGgtcmVzcG9uc2UtaGFuZGxlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7QUFBQSxtQ0FBdUM7QUFDdkMsbUNBQXVEO0FBQ3ZELHlEQUF1RDtBQUN2RCx1REFBMkc7QUFFM0csbUVBRW1DO0FBQ25DLGtGQUF3RjtBQUN4RixnRUFBeUQ7QUFHekQsSUFBYSwrQkFBK0IsR0FBNUMsTUFBYSwrQkFBK0I7SUFHeEMsR0FBRyxDQUFpQjtJQUVwQixpQkFBaUIsQ0FBb0I7SUFFckMsaUJBQWlCLENBQXFCO0lBRXRDOzs7Ozs7Ozs7T0FTRztJQUNILEtBQUssQ0FBQyxNQUFNLENBQUMsZ0JBQWtDLEVBQUUscUJBQTBELEVBQUUsVUFBNkIsRUFBRSxTQUFrQixFQUFFLGlCQUEwQixFQUFFLGFBQXNCLEVBQUUsYUFBc0I7UUFFdE8sTUFBTSxzQkFBc0IsR0FBRyxJQUFJLENBQUMseUJBQXlCLENBQUMscUJBQXFCLEVBQUUsU0FBUyxFQUFFLGlCQUFpQixFQUFFLGFBQWEsQ0FBQyxDQUFDO1FBQ2xJLElBQUksQ0FBQyxzQkFBc0IsRUFBRTtZQUN6QixNQUFNLFVBQVUsR0FBRyxJQUFJLGtDQUFpQixDQUFDLHNDQUFtQixDQUFDLGtCQUFrQixDQUFDO2lCQUMzRSxXQUFXLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsd0JBQXdCLEVBQUUsNkJBQTZCLENBQUMsQ0FBQyxDQUFDO1lBQzVGLElBQUksQ0FBQywrQkFBK0IsQ0FBQyxVQUFVLENBQUMsQ0FBQztTQUNwRDtRQUVELElBQUksQ0FBQywwQkFBMEIsQ0FBQyxnQkFBZ0IsRUFBRSxzQkFBc0IsQ0FBQyxDQUFDO1FBQzFFLE1BQU0sZUFBZSxHQUFHLElB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