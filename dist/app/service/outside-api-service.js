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