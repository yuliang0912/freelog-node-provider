import { ContractInfo, IOutsideApiService, ResourceInfo, ResourceVersionInfo, SubjectInfo, UserInfo, PolicyInfo } from '../../interface';
import { SubjectTypeEnum } from '../../enum';
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
    getResourceInfo(resourceId: string): Promise<ResourceInfo>;
    /**
     * 获取资源版本信息
     * @param {string} resourceVersionId
     * @param {string[]} projection
     * @returns {Promise<any>}
     */
    getResourceVersionInfo(resourceVersionId: string, projection?: string[]): Promise<ResourceVersionInfo>;
    /**
     * 批量签约(已经签过不会重签)
     * @param nodeId
     * @param {SubjectInfo[]} subjects
     * @returns {Promise<ContractInfo[]>}
     */
    batchSignNodeContracts(nodeId: any, subjects: SubjectInfo[]): Promise<ContractInfo[]>;
    /**
     * 获取标的物策略
     * @param policyIds
     * @param projection
     */
    getPolicies(policyIds: string[], subjectType: SubjectTypeEnum, projection?: string[]): Promise<PolicyInfo[]>;
}
