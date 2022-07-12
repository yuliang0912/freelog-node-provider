import {chunk, flatten, isEmpty, uniq} from 'lodash';
import {inject, provide} from 'midway';
import {
    BasePolicyInfo,
    ContractInfo,
    IOutsideApiService,
    ObjectStorageInfo,
    ResourceDependencyTree,
    ResourceInfo,
    ResourceVersionInfo,
    SubjectInfo
} from '../../interface';
import {ObjectDependencyTreeInfo} from '../../test-node-interface';
import {
    ContractLicenseeIdentityTypeEnum,
    CurlResFormatEnum,
    FreelogContext,
    FreelogUserInfo,
    SubjectTypeEnum
} from 'egg-freelog-base';

@provide()
export class OutsideApiService implements IOutsideApiService {

    @inject()
    ctx: FreelogContext;

    /**
     * 获取用户信息
     * @param {number} userId
     * @returns {Promise<UserInfo>}
     */
    async getUserInfo(userId: number): Promise<FreelogUserInfo> {
        return this.ctx.curlIntranetApi(`${this.ctx.webApi.userInfoV2}/${userId}`);
    }

    /**
     * 批量获取用户信息
     * @param userIds
     * @param options
     */
    async getUserList(userIds: number[], options?: object): Promise<FreelogUserInfo[]> {
        if (isEmpty(userIds)) {
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
    async getResourceInfo(resourceIdOrName: string, options?: object): Promise<ResourceInfo> {
        const optionParams = options ? Object.entries(options).map(([key, value]) => `${key}=${value}`) : [];
        return this.ctx.curlIntranetApi(`${this.ctx.webApi.resourceInfoV2}/${encodeURIComponent(resourceIdOrName)}?${optionParams.join('&')}`);
    }

    /**
     * 获取存储对象信息
     * @param objectIdOrName
     * @param options
     */
    async getObjectInfo(objectIdOrName: string, options?: object): Promise<ObjectStorageInfo> {
        const optionParams = options ? Object.entries(options).map(([key, value]) => `${key}=${value}`) : [];
        return this.ctx.curlIntranetApi(`${this.ctx.webApi.storageInfo}/objects/${encodeURIComponent(objectIdOrName)}?${optionParams.join('&')}`);
    }

    /**
     * 获取资源依赖树
     * @param resourceIdOrName
     * @param options
     */
    async getResourceDependencyTree(resourceIdOrName: string, options?: object): Promise<ResourceDependencyTree[]> {
        const optionParams = options ? Object.entries(options).map(([key, value]) => `${key}=${value}`) : [];
        return this.ctx.curlIntranetApi(`${this.ctx.webApi.resourceInfoV2}/${encodeURIComponent(resourceIdOrName)}/dependencyTree?${optionParams.join('&')}`);
    }

    /**
     * 批量获取资源版本信息
     * @param versionIds
     * @param options
     */
    async getResourceVersionList(versionIds: string[], options?: object): Promise<ResourceVersionInfo[]> {
        if (isEmpty(versionIds)) {
            return [];
        }
        const optionParams = options ? Object.entries(options).map(([key, value]) => `${key}=${value}`) : [];
        const tasks = chunk(uniq(versionIds), 100).map(versionIdChunk => {
            const url = `${this.ctx.webApi.resourceInfoV2}/versions/list?versionIds=${versionIdChunk.toString()}&${optionParams.join('&')}`;
            return this.ctx.curlIntranetApi(url);
        });
        return Promise.all(tasks).then(results => flatten(results));
    }

    /**
     * 批量根据对象全名获取存储对象
     * @param objectNames
     * @param options
     */
    async getObjectListByFullNames(objectNames: string[], options?: object): Promise<ObjectStorageInfo[]> {
        if (isEmpty(objectNames)) {
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
    async getObjectListByObjectIds(objectIds: string[], options?: object): Promise<ObjectStorageInfo[]> {
        if (isEmpty(objectIds)) {
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
    async getObjectDependencyTree(objectIdOrName: string, options?: object): Promise<ObjectDependencyTreeInfo[]> {
        const optionParams = options ? Object.entries(options).map(([key, value]) => `${key}=${value}`) : [];
        return this.ctx.curlIntranetApi(`${this.ctx.webApi.storageInfo}/objects/${encodeURIComponent(objectIdOrName)}/dependencyTree?${optionParams.join('&')}`);
    }

    /**
     * 批量获取资源
     * @param resourceIds
     * @param options
     */
    async getResourceListByIds(resourceIds: string[], options?: object): Promise<ResourceInfo[]> {
        if (isEmpty(resourceIds)) {
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
    async getResourceListByNames(resourceNames: string[], options?: object): Promise<ResourceInfo[]> {
        if (isEmpty(resourceNames)) {
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
    async getResourceVersionInfo(resourceVersionId: string, projection?: string[]): Promise<ResourceVersionInfo> {
        projection = projection || [];
        return this.ctx.curlIntranetApi(`${this.ctx.webApi.resourceInfoV2}/versions/detail?versionId=${resourceVersionId}&projection=${projection.toString()}`);
    }

    /**
     * 获取资源版本的属性
     * @param resourceId
     * @param version
     */
    async getResourceVersionProperty(resourceId: string, version: string) {
        return this.ctx.curlIntranetApi(`${this.ctx.webApi.resourceInfoV2}/${resourceId}/versions/${version}/property`);
    }

    /**
     * 批量签约(已经签过不会重签)
     * @param nodeId
     * @param {SubjectInfo[]} subjects
     * @returns {Promise<ContractInfo[]>}
     */
    async batchSignNodeContracts(nodeId, subjects: SubjectInfo[]): Promise<ContractInfo[]> {
        const postBody = {
            subjectType: SubjectTypeEnum.Resource,
            licenseeIdentityType: ContractLicenseeIdentityTypeEnum.Node,
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
    async signUserPresentableContract(userId, subjectInfo: SubjectInfo): Promise<ContractInfo> {
        const postBody = {
            subjectId: subjectInfo.subjectId,
            policyId: subjectInfo.policyId,
            subjectType: SubjectTypeEnum.Presentable,
            licenseeIdentityType: ContractLicenseeIdentityTypeEnum.ClientUser,
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
    async createPolicies(policyTexts: string[]): Promise<BasePolicyInfo[]> {
        return this.ctx.curlIntranetApi(`${this.ctx.webApi.policyInfoV2}`, {
            method: 'post', contentType: 'json', data: {
                policyTexts, subjectType: SubjectTypeEnum.Presentable
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
    async getPolicies(policyIds: string[], subjectType: SubjectTypeEnum, projection: string[] = [], isTranslate = false): Promise<BasePolicyInfo[]> {
        if (isEmpty(policyIds)) {
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
    async getUserPresentableContracts(subjectIds: string[], licenseeId: number, options?: object): Promise<ContractInfo[]> {
        if (isEmpty(subjectIds)) {
            return [];
        }
        const optionParams = options ? Object.entries(options).map(([key, value]) => `${key}=${value}`) : [];
        const tasks = chunk(uniq(subjectIds), 100).map(subjectIdChunk => {
            const url = `${this.ctx.webApi.contractInfoV2}/list?subjectIds=${subjectIdChunk.toString()}&licenseeId=${licenseeId}&subjectType=${SubjectTypeEnum.Presentable}&${optionParams.join('&')}`;
            return this.ctx.curlIntranetApi(url);
        });
        return Promise.all(tasks).then(results => flatten(results));
    }

    /**
     * 根据ID批量获取合同列表
     * @param contractIds
     * @param options
     */
    async getContractByContractIds(contractIds: string[], options?: object): Promise<ContractInfo[]> {
        if (isEmpty(contractIds)) {
            return [];
        }
        const optionParams = options ? Object.entries(options).map(([key, value]) => `${key}=${value}`) : [];
        const tasks = chunk(uniq(contractIds), 100).map(contractIdChunk => {
            const url = `${this.ctx.webApi.contractInfoV2}/list?contractIds=${contractIdChunk.toString()}&${optionParams.join('&')}`;
            return this.ctx.curlIntranetApi(url);
        });
        return Promise.all(tasks).then(results => flatten(results));
    }

    /**
     * 批量获取资源的授权结果
     * @param resourceVersionIds
     * @param options
     */
    async getResourceVersionAuthResults(resourceVersionIds: string[], options?: object): Promise<any[]> {
        if (isEmpty(resourceVersionIds)) {
            return [];
        }
        const optionParams = options ? Object.entries(options).map(([key, value]) => `${key}=${value}`) : [];
        return this.ctx.curlIntranetApi(`${this.ctx.webApi.authInfoV2}/resources/batchAuth/result?resourceVersionIds=${resourceVersionIds.toString()}&${optionParams.join('&')}`);
    }

    /**
     * 获取文件流
     * @param versionId
     */
    getResourceFileStream(versionId: string): Promise<any> {
        return this.ctx.curlIntranetApi(`${this.ctx.webApi.resourceInfoV2}/versions/${versionId}/internalClientDownload`, null, CurlResFormatEnum.Original);
    }

    /**
     * 获取资源子文件
     * @param resourceId
     * @param version
     * @param subResourceFile
     */
    getSubResourceFile(resourceId: string, version: string, subResourceFile: string) {
        return this.ctx.curlIntranetApi(`${this.ctx.webApi.resourceDecompressionV2}/getResourceFile?name=${resourceId}&version=${version}&tarPath=${subResourceFile}`, null, CurlResFormatEnum.Original);
    }

    /**
     * 获取对象文件流
     * @param objectId
     */
    getObjectFileStream(objectId: string): Promise<any> {
        return this.ctx.curlIntranetApi(`${this.ctx.webApi.storageInfo}/objects/${objectId}/file`, null, CurlResFormatEnum.Original);
    }

    /**
     * 获取对象子文件
     * @param objectId
     * @param subObjectFile
     */
    getSubObjectFile(objectId: string, subObjectFile: string) {
        return this.ctx.curlIntranetApi(`${this.ctx.webApi.resourceDecompressionV2}/getObjectFile?objectId=${objectId}&tarPath=${subObjectFile}`, null, CurlResFormatEnum.Original);
    }
}
