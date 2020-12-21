import {isEmpty} from 'lodash';
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
} from "egg-freelog-base";

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
        return this.ctx.curlIntranetApi(`${this.ctx.webApi.userInfo}/${userId}`);
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
        return this.ctx.curlIntranetApi(`${this.ctx.webApi.resourceInfoV2}/versions/list?versionIds=${versionIds.toString()}&${optionParams.join('&')}`);
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
        return this.ctx.curlIntranetApi(`${this.ctx.webApi.storageInfo}/objects/list?fullObjectNames=${objectNames.join('.')}&${optionParams.join('&')}`);
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
     */
    async getPolicies(policyIds: string[], subjectType: SubjectTypeEnum, projection: string[] = []): Promise<BasePolicyInfo[]> {
        if (isEmpty(policyIds)) {
            return [];
        }
        // 目前针对策略是否是自己创建的这块逻辑验证不严格.如果需要严格,则需要在下方url中追加参数userId
        return this.ctx.curlIntranetApi(`${this.ctx.webApi.policyInfoV2}/list?policyIds=${policyIds.toString()}&subjectType=${subjectType}&projection=${projection.toString()}`);
    }

    /**
     * 获取用户与展品的合约
     * @param subjectId
     * @param licensorId
     * @param licenseeId
     * @param options
     */
    async getUserPresentableContracts(subjectId: string, licensorId: number, licenseeId: number, options?: object): Promise<ContractInfo[]> {
        const optionParams = options ? Object.entries(options).map(([key, value]) => `${key}=${value}`) : [];
        return this.ctx.curlIntranetApi(`${this.ctx.webApi.contractInfoV2}?identityType=2&subjectId=${subjectId}&licensorId=${licensorId}&licenseeId=${licenseeId}&subjectType=${SubjectTypeEnum.Presentable}&${optionParams.join('&')}`).then(pageResult => {
            return pageResult?.dataList ?? [];
        });
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
        return this.ctx.curlIntranetApi(`${this.ctx.webApi.contractInfoV2}/list?contractIds=${contractIds.toString()}&${optionParams.join('&')}`);
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
     * @param fileSha1
     */
    async getFileStream(fileSha1: string): Promise<any> {
        return this.ctx.curlIntranetApi(`${this.ctx.webApi.storageInfo}/files/${fileSha1}/download`, null, CurlResFormatEnum.Original);
    }
}
