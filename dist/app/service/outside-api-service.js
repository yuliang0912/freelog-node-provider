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
     * 批量获取用户信息
     * @param userIds
     * @param options
     */
    async getUserList(userIds, options) {
        if ((0, lodash_1.isEmpty)(userIds)) {
            return [];
        }
        const optionParams = options ? Object.entries(options).map(([key, value]) => `${key}=${value}`) : [];
        return this.ctx.curlIntranetApi(`${this.ctx.webApi.userInfoV2}/list?userIds=${userIds.toString()}&${optionParams.join('&')}`);
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
        const tasks = (0, lodash_1.chunk)((0, lodash_1.uniq)(versionIds), 100).map(versionIdChunk => {
            const url = `${this.ctx.webApi.resourceInfoV2}/versions/list?versionIds=${versionIdChunk.toString()}&${optionParams.join('&')}`;
            return this.ctx.curlIntranetApi(url);
        });
        return Promise.all(tasks).then(results => (0, lodash_1.flatten)(results));
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
     * @param subjectIds
     * @param licenseeId
     * @param options
     */
    async getUserPresentableContracts(subjectIds, licenseeId, options) {
        if ((0, lodash_1.isEmpty)(subjectIds)) {
            return [];
        }
        const optionParams = options ? Object.entries(options).map(([key, value]) => `${key}=${value}`) : [];
        const tasks = (0, lodash_1.chunk)((0, lodash_1.uniq)(subjectIds), 100).map(subjectIdChunk => {
            const url = `${this.ctx.webApi.contractInfoV2}/list?subjectIds=${subjectIdChunk.toString()}&licenseeId=${licenseeId}&subjectType=${egg_freelog_base_1.SubjectTypeEnum.Presentable}&${optionParams.join('&')}`;
            return this.ctx.curlIntranetApi(url);
        });
        return Promise.all(tasks).then(results => (0, lodash_1.flatten)(results));
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
        const tasks = (0, lodash_1.chunk)((0, lodash_1.uniq)(contractIds), 100).map(contractIdChunk => {
            const url = `${this.ctx.webApi.contractInfoV2}/list?contractIds=${contractIdChunk.toString()}&${optionParams.join('&')}`;
            return this.ctx.curlIntranetApi(url);
        });
        return Promise.all(tasks).then(results => (0, lodash_1.flatten)(results));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3V0c2lkZS1hcGktc2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9hcHAvc2VydmljZS9vdXRzaWRlLWFwaS1zZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztBQUFBLG1DQUFxRDtBQUNyRCxtQ0FBdUM7QUFZdkMsdURBTTBCO0FBRzFCLElBQWEsaUJBQWlCLEdBQTlCLE1BQWEsaUJBQWlCO0lBRzFCLEdBQUcsQ0FBaUI7SUFFcEI7Ozs7T0FJRztJQUNILEtBQUssQ0FBQyxXQUFXLENBQUMsTUFBYztRQUM1QixPQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsZUFBZSxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsVUFBVSxJQUFJLE1BQU0sRUFBRSxDQUFDLENBQUM7SUFDL0UsQ0FBQztJQUVEOzs7O09BSUc7SUFDSCxLQUFLLENBQUMsV0FBVyxDQUFDLE9BQWlCLEVBQUUsT0FBZ0I7UUFDakQsSUFBSSxJQUFBLGdCQUFPLEVBQUMsT0FBTyxDQUFDLEVBQUU7WUFDbEIsT0FBTyxFQUFFLENBQUM7U0FDYjtRQUNELE1BQU0sWUFBWSxHQUFHLE9BQU8sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMsRUFBRSxFQUFFLENBQUMsR0FBRyxHQUFHLElBQUksS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO1FBQ3JHLE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxlQUFlLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxVQUFVLGlCQUFpQixPQUFPLENBQUMsUUFBUSxFQUFFLElBQUksWUFBWSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDbEksQ0FBQztJQUVEOzs7O09BSUc7SUFDSCxLQUFLLENBQUMsZUFBZSxDQUFDLGdCQUF3QixFQUFFLE9BQWdCO1FBQzVELE1BQU0sWUFBWSxHQUFHLE9BQU8sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMsRUFBRSxFQUFFLENBQUMsR0FBRyxHQUFHLElBQUksS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO1FBQ3JHLE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxlQUFlLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxjQUFjLElBQUksa0JBQWtCLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxZQUFZLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUMzSSxDQUFDO0lBRUQ7Ozs7T0FJRztJQUNILEtBQUssQ0FBQyxhQUFhLENBQUMsY0FBc0IsRUFBRSxPQUFnQjtRQUN4RCxNQUFNLFlBQVksR0FBRyxPQUFPLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsS0FBSyxDQUFDLEVBQUUsRUFBRSxDQUFDLEdBQUcsR0FBRyxJQUFJLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztRQUNyRyxPQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsZUFBZSxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsV0FBVyxZQUFZLGtCQUFrQixDQUFDLGNBQWMsQ0FBQyxJQUFJLFlBQVksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQzlJLENBQUM7SUFFRDs7OztPQUlHO0lBQ0gsS0FBSyxDQUFDLHlCQUF5QixDQUFDLGdCQUF3QixFQUFFLE9BQWdCO1FBQ3RFLE1BQU0sWUFBWSxHQUFHLE9BQU8sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMsRUFBRSxFQUFFLENBQUMsR0FBRyxHQUFHLElBQUksS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO1FBQ3JHLE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxlQUFlLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxjQUFjLElBQUksa0JBQWtCLENBQUMsZ0JBQWdCLENBQUMsbUJBQW1CLFlBQVksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQzFKLENBQUM7SUFFRDs7OztPQUlHO0lBQ0gsS0FBSyxDQUFDLHNCQUFzQixDQUFDLFVBQW9CLEVBQUUsT0FBZ0I7UUFDL0QsSUFBSSxJQUFBLGdCQUFPLEVBQUMsVUFBVSxDQUFDLEVBQUU7WUFDckIsT0FBTyxFQUFFLENBQUM7U0FDYjtRQUNELE1BQU0sWUFBWSxHQUFHLE9BQU8sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMsRUFBRSxFQUFFLENBQUMsR0FBRyxHQUFHLElBQUksS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO1FBQ3JHLE1BQU0sS0FBSyxHQUFHLElBQUEsY0FBSyxFQUFDLElBQUEsYUFBSSxFQUFDLFVBQVUsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsRUFBRTtZQUM1RCxNQUFNLEdBQUcsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLGNBQWMsNkJBQTZCLGNBQWMsQ0FBQyxRQUFRLEVBQUUsSUFBSSxZQUFZLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDaEksT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUN6QyxDQUFDLENBQUMsQ0FBQztRQUNILE9BQU8sT0FBTyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxJQUFBLGdCQUFPLEVBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztJQUNoRSxDQUFDO0lBRUQ7Ozs7T0FJRztJQUNILEtBQUssQ0FBQyx3QkFBd0IsQ0FBQyxXQUFxQixFQUFFLE9BQWdCO1FBQ2xFLElBQUksSUFBQSxnQkFBTyxFQUFDLFdBQVcsQ0FBQyxFQUFFO1lBQ3RCLE9BQU8sRUFBRSxDQUFDO1NBQ2I7UUFDRCxNQUFNLFlBQVksR0FBRyxPQUFPLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsS0FBSyxDQUFDLEVBQUUsRUFBRSxDQUFDLEdBQUcsR0FBRyxJQUFJLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztRQUNyRyxPQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsZUFBZSxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsV0FBVyxpQ0FBaUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLGtCQUFrQixDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLFlBQVksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ3hNLENBQUM7SUFFRDs7OztPQUlHO0lBQ0gsS0FBSyxDQUFDLHdCQUF3QixDQUFDLFNBQW1CLEVBQUUsT0FBZ0I7UUFDaEUsSUFBSSxJQUFBLGdCQUFPLEVBQUMsU0FBUyxDQUFDLEVBQUU7WUFDcEIsT0FBTyxFQUFFLENBQUM7U0FDYjtRQUNELE1BQU0sWUFBWSxHQUFHLE9BQU8sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMsRUFBRSxFQUFFLENBQUMsR0FBRyxHQUFHLElBQUksS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO1FBQ3JHLE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxlQUFlLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxXQUFXLDJCQUEyQixTQUFTLENBQUMsUUFBUSxFQUFFLElBQUksWUFBWSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDL0ksQ0FBQztJQUVEOzs7O09BSUc7SUFDSCxLQUFLLENBQUMsdUJBQXVCLENBQUMsY0FBc0IsRUFBRSxPQUFnQjtRQUNsRSxNQUFNLFlBQVksR0FBRyxPQUFPLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsS0FBSyxDQUFDLEVBQUUsRUFBRSxDQUFDLEdBQUcsR0FBRyxJQUFJLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztRQUNyRyxPQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsZUFBZSxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsV0FBVyxZQUFZLGtCQUFrQixDQUFDLGNBQWMsQ0FBQyxtQkFBbUIsWUFBWSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDN0osQ0FBQztJQUVEOzs7O09BSUc7SUFDSCxLQUFLLENBQUMsb0JBQW9CLENBQUMsV0FBcUIsRUFBRSxPQUFnQjtRQUM5RCxJQUFJLElBQUEsZ0JBQU8sRUFBQyxXQUFXLENBQUMsRUFBRTtZQUN0QixPQUFPLEVBQUUsQ0FBQztTQUNiO1FBQ0QsTUFBTSxZQUFZLEdBQUcsT0FBTyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLEtBQUssQ0FBQyxFQUFFLEVBQUUsQ0FBQyxHQUFHLEdBQUcsSUFBSSxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7UUFDckcsT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLGNBQWMscUJBQXFCLFdBQVcsQ0FBQyxRQUFRLEVBQUUsSUFBSSxZQUFZLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUM5SSxDQUFDO0lBRUQ7Ozs7T0FJRztJQUNILEtBQUssQ0FBQyxzQkFBc0IsQ0FBQyxhQUF1QixFQUFFLE9BQWdCO1FBQ2xFLElBQUksSUFBQSxnQkFBTyxFQUFDLGFBQWEsQ0FBQyxFQUFFO1lBQ3hCLE9BQU8sRUFBRSxDQUFDO1NBQ2I7UUFDRCxhQUFhLEdBQUcsYUFBYSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDOUQsTUFBTSxZQUFZLEdBQUcsT0FBTyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLEtBQUssQ0FBQyxFQUFFLEVBQUUsQ0FBQyxHQUFHLEdBQUcsSUFBSSxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7UUFDckcsT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLGNBQWMsdUJBQXVCLGFBQWEsQ0FBQyxRQUFRLEVBQUUsSUFBSSxZQUFZLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUNsSixDQUFDO0lBRUQ7Ozs7O09BS0c7SUFDSCxLQUFLLENBQUMsc0JBQXNCLENBQUMsaUJBQXlCLEVBQUUsVUFBcUI7UUFDekUsVUFBVSxHQUFHLFVBQVUsSUFBSSxFQUFFLENBQUM7UUFDOUIsT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLGNBQWMsOEJBQThCLGlCQUFpQixlQUFlLFVBQVUsQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFDNUosQ0FBQztJQUVEOzs7O09BSUc7SUFDSCxLQUFLLENBQUMsMEJBQTBCLENBQUMsVUFBa0IsRUFBRSxPQUFlO1FBQ2hFLE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxlQUFlLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxjQUFjLElBQUksVUFBVSxhQUFhLE9BQU8sV0FBVyxDQUFDLENBQUM7SUFDcEgsQ0FBQztJQUVEOzs7OztPQUtHO0lBQ0gsS0FBSyxDQUFDLHNCQUFzQixDQUFDLE1BQU0sRUFBRSxRQUF1QjtRQUN4RCxNQUFNLFFBQVEsR0FBRztZQUNiLFdBQVcsRUFBRSxrQ0FBZSxDQUFDLFFBQVE7WUFDckMsb0JBQW9CLEVBQUUsbURBQWdDLENBQUMsSUFBSTtZQUMzRCxVQUFVLEVBQUUsTUFBTSxFQUFFLFFBQVE7U0FDL0IsQ0FBQztRQUNGLE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxlQUFlLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxjQUFjLFlBQVksRUFBRTtZQUMzRSxNQUFNLEVBQUUsTUFBTSxFQUFFLFdBQVcsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLFFBQVE7U0FDdEQsQ0FBQyxDQUFDO0lBQ1AsQ0FBQztJQUVEOzs7O09BSUc7SUFDSCxLQUFLLENBQUMsMkJBQTJCLENBQUMsTUFBTSxFQUFFLFdBQXdCO1FBQzlELE1BQU0sUUFBUSxHQUFHO1lBQ2IsU0FBUyxFQUFFLFdBQVcsQ0FBQyxTQUFTO1lBQ2hDLFFBQVEsRUFBRSxXQUFXLENBQUMsUUFBUTtZQUM5QixXQUFXLEVBQUUsa0NBQWUsQ0FBQyxXQUFXO1lBQ3hDLG9CQUFvQixFQUFFLG1EQUFnQyxDQUFDLFVBQVU7WUFDakUsVUFBVSxFQUFFLE1BQU07U0FDckIsQ0FBQztRQUNGLE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxlQUFlLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxjQUFjLEdBQUcsRUFBRTtZQUNsRSxNQUFNLEVBQUUsTUFBTSxFQUFFLFdBQVcsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLFFBQVE7U0FDdEQsQ0FBQyxDQUFDO0lBQ1AsQ0FBQztJQUVEOzs7T0FHRztJQUNILEtBQUssQ0FBQyxjQUFjLENBQUMsV0FBcUI7UUFDdEMsT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLFlBQVksRUFBRSxFQUFFO1lBQy9ELE1BQU0sRUFBRSxNQUFNLEVBQUUsV0FBVyxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUU7Z0JBQ3ZDLFdBQVcsRUFBRSxXQUFXLEVBQUUsa0NBQWUsQ0FBQyxXQUFXO2FBQ3hEO1NBQ0osQ0FBQyxDQUFDO0lBQ1AsQ0FBQztJQUVEOzs7Ozs7T0FNRztJQUNILEtBQUssQ0FBQyxXQUFXLENBQUMsU0FBbUIsRUFBRSxXQUE0QixFQUFFLGFBQXVCLEVBQUUsRUFBRSxXQUFXLEdBQUcsS0FBSztRQUMvRyxJQUFJLElBQUEsZ0JBQU8sRUFBQyxTQUFTLENBQUMsRUFBRTtZQUNwQixPQUFPLEVBQUUsQ0FBQztTQUNiO1FBQ0Qsc0RBQXNEO1FBQ3RELE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxlQUFlLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxZQUFZLG1CQUFtQixTQUFTLENBQUMsUUFBUSxFQUFFLGdCQUFnQixXQUFXLGVBQWUsVUFBVSxDQUFDLFFBQVEsRUFBRSxnQkFBZ0IsV0FBVyxFQUFFLENBQUMsQ0FBQztJQUN4TSxDQUFDO0lBRUQ7Ozs7O09BS0c7SUFDSCxLQUFLLENBQUMsMkJBQTJCLENBQUMsVUFBb0IsRUFBRSxVQUFrQixFQUFFLE9BQWdCO1FBQ3hGLElBQUksSUFBQSxnQkFBTyxFQUFDLFVBQVUsQ0FBQyxFQUFFO1lBQ3JCLE9BQU8sRUFBRSxDQUFDO1NBQ2I7UUFDRCxNQUFNLFlBQVksR0FBRyxPQUFPLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsS0FBSyxDQUFDLEVBQUUsRUFBRSxDQUFDLEdBQUcsR0FBRyxJQUFJLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztRQUNyRyxNQUFNLEtBQUssR0FBRyxJQUFBLGNBQUssRUFBQyxJQUFBLGFBQUksRUFBQyxVQUFVLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLEVBQUU7WUFDNUQsTUFBTSxHQUFHLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxjQUFjLG9CQUFvQixjQUFjLENBQUMsUUFBUSxFQUFFLGVBQWUsVUFBVSxnQkFBZ0Isa0NBQWUsQ0FBQyxXQUFXLElBQUksWUFBWSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQzNMLE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDekMsQ0FBQyxDQUFDLENBQUM7UUFDSCxPQUFPLE9BQU8sQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsSUFBQSxnQkFBTyxFQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7SUFDaEUsQ0FBQztJQUVEOzs7O09BSUc7SUFDSCxLQUFLLENBQUMsd0JBQXdCLENBQUMsV0FBcUIsRUFBRSxPQUFnQjtRQUNsRSxJQUFJLElBQUEsZ0JBQU8sRUFBQyxXQUFXLENBQUMsRUFBRTtZQUN0QixPQUFPLEVBQUUsQ0FBQztTQUNiO1FBQ0QsTUFBTSxZQUFZLEdBQUcsT0FBTyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLEtBQUssQ0FBQyxFQUFFLEVBQUUsQ0FBQyxHQUFHLEdBQUcsSUFBSSxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7UUFDckcsTUFBTSxLQUFLLEdBQUcsSUFBQSxjQUFLLEVBQUMsSUFBQSxhQUFJLEVBQUMsV0FBVyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FBQyxFQUFFO1lBQzlELE1BQU0sR0FBRyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsY0FBYyxxQkFBcUIsZUFBZSxDQUFDLFFBQVEsRUFBRSxJQUFJLFlBQVksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUN6SCxPQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ3pDLENBQUMsQ0FBQyxDQUFDO1FBQ0gsT0FBTyxPQUFPLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLElBQUEsZ0JBQU8sRUFBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO0lBQ2hFLENBQUM7SUFFRDs7OztPQUlHO0lBQ0gsS0FBSyxDQUFDLDZCQUE2QixDQUFDLGtCQUE0QixFQUFFLE9BQWdCO1FBQzlFLElBQUksSUFBQSxnQkFBTyxFQUFDLGtCQUFrQixDQUFDLEVBQUU7WUFDN0IsT0FBTyxFQUFFLENBQUM7U0FDYjtRQUNELE1BQU0sWUFBWSxHQUFHLE9BQU8sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMsRUFBRSxFQUFFLENBQUMsR0FBRyxHQUFHLElBQUksS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO1FBQ3JHLE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxlQUFlLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxVQUFVLGtEQUFrRCxrQkFBa0IsQ0FBQyxRQUFRLEVBQUUsSUFBSSxZQUFZLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUM5SyxDQUFDO0lBRUQ7OztPQUdHO0lBQ0gscUJBQXFCLENBQUMsU0FBaUI7UUFDbkMsT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLGNBQWMsYUFBYSxTQUFTLHlCQUF5QixFQUFFLElBQUksRUFBRSxvQ0FBaUIsQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUN4SixDQUFDO0lBRUQ7Ozs7O09BS0c7SUFDSCxrQkFBa0IsQ0FBQyxVQUFrQixFQUFFLE9BQWUsRUFBRSxlQUF1QjtRQUMzRSxPQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsZUFBZSxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsdUJBQXVCLHlCQUF5QixVQUFVLFlBQVksT0FBTyxZQUFZLGVBQWUsRUFBRSxFQUFFLElBQUksRUFBRSxvQ0FBaUIsQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUNyTSxDQUFDO0lBRUQ7OztPQUdHO0lBQ0gsbUJBQW1CLENBQUMsUUFBZ0I7UUFDaEMsT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLFdBQVcsWUFBWSxRQUFRLE9BQU8sRUFBRSxJQUFJLEVBQUUsb0NBQWlCLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDakksQ0FBQztJQUVEOzs7O09BSUc7SUFDSCxnQkFBZ0IsQ0FBQyxRQUFnQixFQUFFLGFBQXFCO1FBQ3BELE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxlQUFlLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyx1QkFBdUIsMkJBQTJCLFFBQVEsWUFBWSxhQUFhLEVBQUUsRUFBRSxJQUFJLEVBQUUsb0NBQWlCLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDaEwsQ0FBQztDQUNKLENBQUE7QUExU0c7SUFEQyxJQUFBLGVBQU0sR0FBRTs7OENBQ1c7QUFIWCxpQkFBaUI7SUFEN0IsSUFBQSxnQkFBTyxHQUFFO0dBQ0csaUJBQWlCLENBNlM3QjtBQTdTWSw4Q0FBaUIifQ==