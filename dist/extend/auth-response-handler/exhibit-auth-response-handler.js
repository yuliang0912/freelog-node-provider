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
     * @param subWorkIdOrName
     * @param subWorkType
     * @param subWorkFilePath
     */
    async handle(exhibitInfo, authResult, parentNid, subWorkIdOrName, subWorkType, subWorkFilePath) {
        const realResponseWorkBaseInfo = this._getRealResponseWorkBaseInfo(exhibitInfo, parentNid, subWorkIdOrName, subWorkType);
        if (!realResponseWorkBaseInfo) {
            const authResult = new auth_interface_1.SubjectAuthResult(egg_freelog_base_1.SubjectAuthCodeEnum.AuthArgumentsError)
                .setErrorMsg(this.ctx.gettext('params-validate-failed', 'entityNid,subResourceIdOrName'));
            this.exhibitAuthFailedResponseHandle(authResult, exhibitInfo);
        }
        await this.commonResponseHeaderHandle(exhibitInfo, realResponseWorkBaseInfo);
        const apiResponseType = lodash_1.chain(this.ctx.path).trimEnd('/').split('/').last().value();
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
                if (!subWorkFilePath) {
                    await this.fileStreamResponseHandle(realResponseWorkBaseInfo, exhibitInfo.exhibitTitle);
                }
                else {
                    await this.workSubFileStreamResponseHandle(realResponseWorkBaseInfo, subWorkFilePath);
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
     * @param realResponseWorkBaseInfo
     */
    async commonResponseHeaderHandle(exhibitInfo, realResponseWorkBaseInfo) {
        const responseDependencies = realResponseWorkBaseInfo.dependencies.map(x => Object({
            id: x.workId, name: x.workName, type: x.workType, resourceType: x.resourceType
        }));
        this.ctx.set('freelog-work-nid', realResponseWorkBaseInfo.nid);
        this.ctx.set('freelog-work-id', exhibitInfo?.exhibitId);
        this.ctx.set('freelog-work-name', encodeURIComponent(exhibitInfo?.exhibitName ?? ''));
        this.ctx.set('freelog-work-property', encodeURIComponent(JSON.stringify(exhibitInfo.versionInfo?.exhibitProperty ?? {})));
        this.ctx.set('freelog-work-sub-dependencies', encodeURIComponent(JSON.stringify(responseDependencies)));
        this.ctx.set('freelog-resource-type', realResponseWorkBaseInfo.resourceType);
        this.ctx.set('Access-Control-Expose-Headers', 'freelog-work-nid,freelog-work-id,freelog-work-name,freelog-work-property,freelog-resource-type,freelog-work-sub-dependencies');
    }
    /**
     * 文件流响应处理
     * @param realResponseWorkBaseInfo
     * @param attachmentName
     */
    async fileStreamResponseHandle(realResponseWorkBaseInfo, attachmentName) {
        let response;
        switch (realResponseWorkBaseInfo.workType) {
            case enum_1.WorkTypeEnum.IndividualResource:
                response = await this.outsideApiService.getResourceFileStream(realResponseWorkBaseInfo.versionId);
                break;
            case enum_1.WorkTypeEnum.StorageObject:
                response = await this.outsideApiService.getObjectFileStream(realResponseWorkBaseInfo.workId);
                break;
            default:
                throw new egg_freelog_base_1.ArgumentError('不支持的作品类型数据流读取');
        }
        if (!response.res.statusCode.toString().startsWith('2')) {
            throw new egg_freelog_base_1.ApplicationError('文件读取失败');
        }
        this.ctx.body = response.data;
        this.ctx.attachment(attachmentName);
        if (['video', 'audio'].includes(realResponseWorkBaseInfo.resourceType)) {
            this.ctx.set('Accept-Ranges', 'bytes');
        }
        this.ctx.set('content-length', response.res.headers['content-length']);
        // 代码需要放到ctx.attachment以后,否则不可控.
        this.ctx.set('content-type', response.res.headers['content-type']);
    }
    /**
     * 获取子资源文件
     * @param realResponseWorkBaseInfo
     * @param subWorkFilePath
     */
    async workSubFileStreamResponseHandle(realResponseWorkBaseInfo, subWorkFilePath) {
        let response;
        switch (realResponseWorkBaseInfo.workType) {
            case enum_1.WorkTypeEnum.IndividualResource:
                response = await this.outsideApiService.getSubResourceFile(realResponseWorkBaseInfo.workId, realResponseWorkBaseInfo.version, subWorkFilePath);
                break;
            case enum_1.WorkTypeEnum.StorageObject:
                response = await this.outsideApiService.getSubObjectFile(realResponseWorkBaseInfo.workId, subWorkFilePath);
                break;
            default:
                throw new egg_freelog_base_1.ArgumentError('不支持的作品类型数据流读取');
        }
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
            errorMsg: authResult.errorMsg,
            referee: authResult.referee,
            defaulterIdentityType: authResult.defaulterIdentityType,
            data: authResult.data
        });
        if (!authResult.isAuth) {
            this.ctx.status = 402;
        }
    }
    /**
     * 获取实际需要的作品信息(或作品的依赖)
     * @param exhibitInfo
     * @param parentNid
     * @param subWorkIdOrName
     * @param subWorkType
     */
    _getRealResponseWorkBaseInfo(exhibitInfo, parentNid, subWorkIdOrName, subWorkType) {
        let matchedExhibitDependencyNodeInfo;
        // 参数传递不够精确时,系统会尽量匹配.如果能匹配出唯一结果即代表匹配成功
        if (subWorkIdOrName || parentNid || subWorkType) {
            function filterExhibitDependencyTree(dependencyTree) {
                return (parentNid ? dependencyTree.parentNid === parentNid : true)
                    && (subWorkType ? dependencyTree.workType === subWorkType : true)
                    && (subWorkIdOrName ? dependencyTree.workId === subWorkIdOrName || dependencyTree.workName.toLowerCase() === subWorkIdOrName.toLowerCase() : true);
            }
            const matchedEntities = exhibitInfo.versionInfo.dependencyTree.filter(filterExhibitDependencyTree);
            if (matchedEntities.length !== 1) {
                return null;
            }
            matchedExhibitDependencyNodeInfo = lodash_1.first(matchedEntities);
        }
        const exhibitDependencyTree = this.exhibitInfoAdapter.convertExhibitDependencyTree(exhibitInfo.versionInfo.dependencyTree, parentNid, 3, true);
        if (lodash_1.isEmpty(exhibitDependencyTree)) {
            return null;
        }
        const parentDependency = lodash_1.first(exhibitDependencyTree);
        if (!lodash_1.isString(subWorkIdOrName)) {
            return parentDependency;
        }
        return parentDependency.dependencies.find(x => x.workId === matchedExhibitDependencyNodeInfo.workId && x.workType === matchedExhibitDependencyNodeInfo.workType);
    }
};
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], ExhibitAuthResponseHandler.prototype, "ctx", void 0);
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], ExhibitAuthResponseHandler.prototype, "outsideApiService", void 0);
__decorate([
    midway_1.inject(),
    __metadata("design:type", exhibit_adapter_1.ExhibitInfoAdapter)
], ExhibitAuthResponseHandler.prototype, "exhibitInfoAdapter", void 0);
ExhibitAuthResponseHandler = __decorate([
    midway_1.provide()
], ExhibitAuthResponseHandler);
exports.ExhibitAuthResponseHandler = ExhibitAuthResponseHandler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhoaWJpdC1hdXRoLXJlc3BvbnNlLWhhbmRsZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvZXh0ZW5kL2F1dGgtcmVzcG9uc2UtaGFuZGxlci9leGhpYml0LWF1dGgtcmVzcG9uc2UtaGFuZGxlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7QUFBQSxtQ0FBdUM7QUFLdkMsbUNBQXVEO0FBQ3ZELHlEQUF1RDtBQUN2RCx1REFBcUg7QUFDckgsa0ZBQXdGO0FBQ3hGLHFDQUF3QztBQUN4Qyx3REFBc0Q7QUFHdEQsSUFBYSwwQkFBMEIsR0FBdkMsTUFBYSwwQkFBMEI7SUFHbkMsR0FBRyxDQUFpQjtJQUVwQixpQkFBaUIsQ0FBcUI7SUFFdEMsa0JBQWtCLENBQXFCO0lBRXZDOzs7Ozs7OztPQVFHO0lBQ0gsS0FBSyxDQUFDLE1BQU0sQ0FBQyxXQUF3QixFQUFFLFVBQTZCLEVBQUUsU0FBaUIsRUFBRSxlQUF5QixFQUFFLFdBQTBCLEVBQUUsZUFBd0I7UUFFcEssTUFBTSx3QkFBd0IsR0FBRyxJQUFJLENBQUMsNEJBQTRCLENBQUMsV0FBVyxFQUFFLFNBQVMsRUFBRSxlQUFlLEVBQUUsV0FBVyxDQUFDLENBQUM7UUFDekgsSUFBSSxDQUFDLHdCQUF3QixFQUFFO1lBQzNCLE1BQU0sVUFBVSxHQUFHLElBQUksa0NBQWlCLENBQUMsc0NBQW1CLENBQUMsa0JBQWtCLENBQUM7aUJBQzNFLFdBQVcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyx3QkFBd0IsRUFBRSwrQkFBK0IsQ0FBQyxDQUFDLENBQUM7WUFDOUYsSUFBSSxDQUFDLCtCQUErQixDQUFDLFVBQVUsRUFBRSxXQUFXLENBQUMsQ0FBQztTQUNqRTtRQUVELE1BQU0sSUFBSSxDQUFDLDBCQUEwQixDQUFDLFdBQVcsRUFBRSx3QkFBd0IsQ0FBQyxDQUFDO1FBRTdFLE1BQU0sZUFBZSxHQUFHLGNBQUssQ0FBQyxJQUFJLENBQUMs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