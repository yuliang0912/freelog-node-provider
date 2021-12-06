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
exports.OutsideApiService = void 0;
const lodash_1 = require("lodash");
const midway_1 = require("midway");
const egg_freelog_base_1 = require("egg-freelog-base");
let OutsideApiService = class OutsideApiService {
    ctx;
    /**
     * 获取用户信息
     * @param {number} userId
     * @returns {Promise<UserInfo>}
     */
    async getUserInfo(userId) {
        return this.ctx.curlIntranetApi(`${this.ctx.webApi.userInfoV2}/${userId}`);
    }
    /**
     * 获取资源信息
     * @param resourceIdOrName
     * @param options
     */
    async getResourceInfo(resourceIdOrName, options) {
        const optionParams = options ? Object.entries(options).map(([key, value]) => `${key}=${value}`) : [];
        return this.ctx.curlIntranetApi(`${this.ctx.webApi.resourceInfoV2}/${encodeURIComponent(resourceIdOrName)}?${optionParams.join('&')}`);
    }
    /**
     * 获取存储对象信息
     * @param objectIdOrName
     * @param options
     */
    async getObjectInfo(objectIdOrName, options) {
        const optionParams = options ? Object.entries(options).map(([key, value]) => `${key}=${value}`) : [];
        return this.ctx.curlIntranetApi(`${this.ctx.webApi.storageInfo}/objects/${encodeURIComponent(objectIdOrName)}?${optionParams.join('&')}`);
    }
    /**
     * 获取资源依赖树
     * @param resourceIdOrName
     * @param options
     */
    async getResourceDependencyTree(resourceIdOrName, options) {
        const optionParams = options ? Object.entries(options).map(([key, value]) => `${key}=${value}`) : [];
        return this.ctx.curlIntranetApi(`${this.ctx.webApi.resourceInfoV2}/${encodeURIComponent(resourceIdOrName)}/dependencyTree?${optionParams.join('&')}`);
    }
    /**
     * 批量获取资源版本信息
     * @param versionIds
     * @param options
     */
    async getResourceVersionList(versionIds, options) {
        if ((0, lodash_1.isEmpty)(versionIds)) {
            return [];
        }
        const optionParams = options ? Object.entries(options).map(([key, value]) => `${key}=${value}`) : [];
        return this.ctx.curlIntranetApi(`${this.ctx.webApi.resourceInfoV2}/versions/list?versionIds=${versionIds.toString()}&${optionParams.join('&')}`);
    }
    /**
     * 批量根据对象全名获取存储对象
     * @param objectNames
     * @param options
     */
    async getObjectListByFullNames(objectNames, options) {
        if ((0, lodash_1.isEmpty)(objectNames)) {
            return [];
        }
        const optionParams = options ? Object.entries(options).map(([key, value]) => `${key}=${value}`) : [];
        return this.ctx.curlIntranetApi(`${this.ctx.webApi.storageInfo}/objects/list?fullObjectNames=${objectNames.map(objectName => encodeURIComponent(objectName)).join(',')}&${optionParams.join('&')}`);
    }
    /**
     * 批量根据对象Id获取存储对象
     * @param objectIds
     * @param options
     */
    async getObjectListByObjectIds(objectIds, options) {
        if ((0, lodash_1.isEmpty)(objectIds)) {
            return [];
        }
        const optionParams = options ? Object.entries(options).map(([key, value]) => `${key}=${value}`) : [];
        return this.ctx.curlIntranetApi(`${this.ctx.webApi.storageInfo}/objects/list?objectIds=${objectIds.toString()}&${optionParams.join('&')}`);
    }
    /**
     * 获取对象依赖树
     * @param objectIdOrName
     * @param options
     */
    async getObjectDependencyTree(objectIdOrName, options) {
        const optionParams = options ? Object.entries(options).map(([key, value]) => `${key}=${value}`) : [];
        return this.ctx.curlIntranetApi(`${this.ctx.webApi.storageInfo}/objects/${encodeURIComponent(objectIdOrName)}/dependencyTree?${optionParams.join('&')}`);
    }
    /**
     * 批量获取资源
     * @param resourceIds
     * @param options
     */
    async getResourceListByIds(resourceIds, options) {
        if ((0, lodash_1.isEmpty)(resourceIds)) {
            return [];
        }
        const optionParams = options ? Object.entries(options).map(([key, value]) => `${key}=${value}`) : [];
        return this.ctx.curlIntranetApi(`${this.ctx.webApi.resourceInfoV2}/list?resourceIds=${resourceIds.toString()}&${optionParams.join('&')}`);
    }
    /**
     * 批量获取资源
     * @param resourceNames
     * @param options
     */
    async getResourceListByNames(resourceNames, options) {
        if ((0, lodash_1.isEmpty)(resourceNames)) {
            return [];
        }
        resourceNames = resourceNames.map(x => encodeURIComponent(x));
        const optionParams = options ? Object.entries(options).map(([key, value]) => `${key}=${value}`) : [];
        return this.ctx.curlIntranetApi(`${this.ctx.webApi.resourceInfoV2}/list?resourceNames=${resourceNames.toString()}&${optionParams.join('&')}`);
    }
    /**
     * 获取资源版本信息
     * @param {string} resourceVersionId
     * @param {string[]} projection
     * @returns {Promise<any>}
     */
    async getResourceVersionInfo(resourceVersionId, projection) {
        projection = projection || [];
        return this.ctx.curlIntranetApi(`${this.ctx.webApi.resourceInfoV2}/versions/detail?versionId=${resourceVersionId}&projection=${projection.toString()}`);
    }
    /**
     * 获取资源版本的属性
     * @param resourceId
     * @param version
     */
    async getResourceVersionProperty(resourceId, version) {
        return this.ctx.curlIntranetApi(`${this.ctx.webApi.resourceInfoV2}/${resourceId}/versions/${version}/property`);
    }
    /**
     * 批量签约(已经签过不会重签)
     * @param nodeId
     * @param {SubjectInfo[]} subjects
     * @returns {Promise<ContractInfo[]>}
     */
    async batchSignNodeContracts(nodeId, subjects) {
        const postBody = {
            subjectType: egg_freelog_base_1.SubjectTypeEnum.Resource,
            licenseeIdentityType: egg_freelog_base_1.ContractLicenseeIdentityTypeEnum.Node,
            licenseeId: nodeId, subjects
        };
        return this.ctx.curlIntranetApi(`${this.ctx.webApi.contractInfoV2}/batchSign`, {
            method: 'post', contentType: 'json', data: postBody
        });
    }
    /**
     * 用户签展品合约
     * @param userId
     * @param subjectInfo
     */
    async signUserPresentableContract(userId, subjectInfo) {
        const postBody = {
            subjectId: subjectInfo.subjectId,
            policyId: subjectInfo.policyId,
            subjectType: egg_freelog_base_1.SubjectTypeEnum.Presentable,
            licenseeIdentityType: egg_freelog_base_1.ContractLicenseeIdentityTypeEnum.ClientUser,
            licenseeId: userId,
        };
        return this.ctx.curlIntranetApi(`${this.ctx.webApi.contractInfoV2}/`, {
            method: 'post', contentType: 'json', data: postBody
        });
    }
    /**
     * 创建展品策略
     * @param policyTexts
     */
    async createPolicies(policyTexts) {
        return this.ctx.curlIntranetApi(`${this.ctx.webApi.policyInfoV2}`, {
            method: 'post', contentType: 'json', data: {
                policyTexts, subjectType: egg_freelog_base_1.SubjectTypeEnum.Presentable
            }
        });
    }
    /**
     * 获取标的物策略
     * @param policyIds
     * @param subjectType
     * @param projection
     * @param isTranslate
     */
    async getPolicies(policyIds, subjectType, projection = [], isTranslate = false) {
        if ((0, lodash_1.isEmpty)(policyIds)) {
            return [];
        }
        // 目前针对策略是否是自己创建的这块逻辑验证不严格.如果需要严格,则需要在下方url中追加参数userId
        return this.ctx.curlIntranetApi(`${this.ctx.webApi.policyInfoV2}/list?policyIds=${policyIds.toString()}&subjectType=${subjectType}&projection=${projection.toString()}&isTranslate=${isTranslate}`);
    }
    /**
     * 获取用户与展品的合约
     * @param subjectId
     * @param licensorId
     * @param licenseeId
     * @param options
     */
    async getUserPresentableContracts(subjectId, licensorId, licenseeId, options) {
        const optionParams = options ? Object.entries(options).map(([key, value]) => `${key}=${value}`) : [];
        return this.ctx.curlIntranetApi(`${this.ctx.webApi.contractInfoV2}?identityType=2&subjectIds=${subjectId}&licensorId=${licensorId}&licenseeId=${licenseeId}&subjectType=${egg_freelog_base_1.SubjectTypeEnum.Presentable}&${optionParams.join('&')}`).then(pageResult => {
            return pageResult?.dataList ?? [];
        });
    }
    /**
     * 根据ID批量获取合同列表
     * @param contractIds
     * @param options
     */
    async getContractByContractIds(contractIds, options) {
        if ((0, lodash_1.isEmpty)(contractIds)) {
            return [];
        }
        const optionParams = options ? Object.entries(options).map(([key, value]) => `${key}=${value}`) : [];
        return this.ctx.curlIntranetApi(`${this.ctx.webApi.contractInfoV2}/list?contractIds=${contractIds.toString()}&${optionParams.join('&')}`);
    }
    /**
     * 批量获取资源的授权结果
     * @param resourceVersionIds
     * @param options
     */
    async getResourceVersionAuthResults(resourceVersionIds, options) {
        if ((0, lodash_1.isEmpty)(resourceVersionIds)) {
            return [];
        }
        const optionParams = options ? Object.entries(options).map(([key, value]) => `${key}=${value}`) : [];
        return this.ctx.curlIntranetApi(`${this.ctx.webApi.authInfoV2}/resources/batchAuth/result?resourceVersionIds=${resourceVersionIds.toString()}&${optionParams.join('&')}`);
    }
    /**
     * 获取文件流
     * @param versionId
     */
    getResourceFileStream(versionId) {
        return this.ctx.curlIntranetApi(`${this.ctx.webApi.resourceInfoV2}/versions/${versionId}/internalClientDownload`, null, egg_freelog_base_1.CurlResFormatEnum.Original);
    }
    /**
     * 获取资源子文件
     * @param resourceId
     * @param version
     * @param subResourceFile
     */
    getSubResourceFile(resourceId, version, subResourceFile) {
        return this.ctx.curlIntranetApi(`${this.ctx.webApi.resourceDecompressionV2}/getResourceFile?name=${resourceId}&version=${version}&tarPath=${subResourceFile}`, null, egg_freelog_base_1.CurlResFormatEnum.Original);
    }
    /**
     * 获取对象文件流
     * @param objectId
     */
    getObjectFileStream(objectId) {
        return this.ctx.curlIntranetApi(`${this.ctx.webApi.storageInfo}/objects/${objectId}/file`, null, egg_freelog_base_1.CurlResFormatEnum.Original);
    }
    /**
     * 获取对象子文件
     * @param objectId
     * @param subObjectFile
     */
    getSubObjectFile(objectId, subObjectFile) {
        return this.ctx.curlIntranetApi(`${this.ctx.webApi.resourceDecompressionV2}/getObjectFile?objectId=${objectId}&tarPath=${subObjectFile}`, null, egg_freelog_base_1.CurlResFormatEnum.Original);
    }
};
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", Object)
], OutsideApiService.prototype, "ctx", void 0);
OutsideApiService = __decorate([
    (0, midway_1.provide)()
], OutsideApiService);
exports.OutsideApiService = OutsideApiService;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3V0c2lkZS1hcGktc2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9hcHAvc2VydmljZS9vdXRzaWRlLWFwaS1zZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztBQUFBLG1DQUErQjtBQUMvQixtQ0FBdUM7QUFZdkMsdURBTTBCO0FBRzFCLElBQWEsaUJBQWlCLEdBQTlCLE1BQWEsaUJBQWlCO0lBRzFCLEdBQUcsQ0FBaUI7SUFFcEI7Ozs7T0FJRztJQUNILEtBQUssQ0FBQyxXQUFXLENBQUMsTUFBYztRQUM1QixPQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsZUFBZSxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsVUFBVSxJQUFJLE1BQU0sRUFBRSxDQUFDLENBQUM7SUFDL0UsQ0FBQztJQUVEOzs7O09BSUc7SUFDSCxLQUFLLENBQUMsZUFBZSxDQUFDLGdCQUF3QixFQUFFLE9BQWdCO1FBQzVELE1BQU0sWUFBWSxHQUFHLE9BQU8sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMsRUFBRSxFQUFFLENBQUMsR0FBRyxHQUFHLElBQUksS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO1FBQ3JHLE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxlQUFlLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxjQUFjLElBQUksa0JBQWtCLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxZQUFZLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUMzSSxDQUFDO0lBRUQ7Ozs7T0FJRztJQUNILEtBQUssQ0FBQyxhQUFhLENBQUMsY0FBc0IsRUFBRSxPQUFnQjtRQUN4RCxNQUFNLFlBQVksR0FBRyxP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