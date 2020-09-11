import { ContractInfo, IOutsideApiService, ResourceInfo, ResourceVersionInfo, SubjectInfo, UserInfo, PolicyInfo, ObjectStorageInfo, ResourceDependencyTreeInfo } from '../../interface';
import { SubjectTypeEnum } from '../../enum';
import { ObjectDependencyTreeInfo } from '../../test-node-interface';
export declare class OutsideApiService implements IOutsideApiService {
    ctx: any;
    /**
     * 获取用户信息
     * @param {number} userId
     * @returns {Promise<UserInfo>}
     */
    getUserInfo(userId: number): Promise<UserInfo>;
    /**
     * 获取资源信息
     * @param {string} resourceId
     * @returns {Promise<ResourceInfo>}
     */
    getResourceInfo(resourceIdOrName: string, options?: object): Promise<ResourceInfo>;
    /**
     * 获取存储对象信息
     * @param objectIdOrName
     * @param options
     */
    getObjectInfo(objectIdOrName: string, options?: object): Promise<ObjectStorageInfo>;
    /**
     * 获取资源依赖树
     * @param resourceId
     * @param options
     */
    getResourceDependencyTree(resourceIdOrName: string, options?: object): Promise<ResourceDependencyTreeInfo[]>;
    /**
     * 批量根据对象全名获取存储对象
     * @param objectNames
     * @param options
     */
    getObjectListByFullNames(objectNames: string[], options?: object): Promise<ObjectStorageInfo[]>;
    /**
     * 获取对象依赖树
     * @param objectId
     * @param options
     */
    getObjectDependencyTree(objectIdOrName: string, options?: object): Promise<ObjectDependencyTreeInfo[]>;
    /**
     * 批量获取资源
     * @param resourceIds
     * @param options
     */
    getResourceListByIds(resourceIds: string[], options?: object): Promise<ResourceInfo[]>;
    /**
     * 批量获取资源
     * @param resourceNames
     * @param options
     */
    getResourceListByNames(resourceNames: string[], options?: object): Promise<ResourceInfo[]>;
    /**
     * 获取资源版本信息
     * @param {string} resourceVersionId
     * @param {string[]} projection
     * @returns {Promise<any>}
     */
    getResourceVersionInfo(resourceVersionId: string, projection?: string[]): Promise<ResourceVersionInfo>;
    /**
     * 批量获取资源版本信息
     * @param versionIds
     * @param options
     */
    getResourceVersionByVersionIds(versionIds: string[], options?: object): Promise<ResourceVersionInfo[]>;
    /**
     * 批量签约(已经签过不会重签)
     * @param nodeId
     * @param {SubjectInfo[]} subjects
     * @returns {Promise<ContractInfo[]>}
     */
    batchSignNodeContracts(nodeId: any, subjects: SubjectInfo[]): Promise<ContractInfo[]>;
    /**
     * 用户签展品合约
     * @param userId
     * @param subjectInfo
     */
    signUserPresentableContract(userId: any, subjectInfo: SubjectInfo): Promise<ContractInfo>;
    /**
     * 获取标的物策略
     * @param policyIds
     * @param projection
     */
    getPolicies(policyIds: string[], subjectType: SubjectTypeEnum, projection?: string[]): Promise<PolicyInfo[]>;
    /**
     * 获取用户与展品的合约
     * @param subjectId
     * @param licensorId
     * @param licenseeId
     * @param options
     */
    getUserPresentableContracts(subjectId: string, licensorId: number, licenseeId: number, options?: object): Promise<ContractInfo[]>;
    /**
     * 根据ID批量获取合同列表
     * @param contractIds
     * @param options
     */
    getContractByContractIds(contractIds: string[], options?: object): Promise<ContractInfo[]>;
    /**
     * 批量获取资源的授权结果
     * @param resourceVersionIds
     */
    getResourceVersionAuthResults(resourceVersionIds: string[]): Promise<any[]>;
    /**
     * 获取文件流
     * @param fileSha1
     */
    getFileStream(fileSha1: string): Promise<any>;
}