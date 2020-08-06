import {provide, inject} from 'midway';
import {
    ContractInfo,
    IOutsideApiService,
    ResourceInfo,
    ResourceVersionInfo,
    SubjectInfo,
    UserInfo,
    PolicyInfo
} from '../../interface';
import {IdentityType, SubjectTypeEnum} from '../../enum';

@provide()
export class OutsideApiService implements IOutsideApiService {

    @inject()
    ctx;

    /**
     * 获取用户信息
     * @param {number} userId
     * @returns {Promise<UserInfo>}
     */
    async getUserInfo(userId: number): Promise<UserInfo> {
        return this.ctx.curlIntranetApi(`${this.ctx.webApi.userInfo}/${userId}`);
    }

    /**
     * 获取资源信息
     * @param {string} resourceId
     * @returns {Promise<ResourceInfo>}
     */
    async getResourceInfo(resourceId: string): Promise<ResourceInfo> {
        return this.ctx.curlIntranetApi(`${this.ctx.webApi.resourceInfoV2}/${resourceId}`);
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
            licenseeIdentityType: IdentityType.Node,
            licenseeId: nodeId, subjects
        };
        return this.ctx.curlIntranetApi(`${this.ctx.webApi.contractInfoV2}/batchSign`, {
            method: 'post', contentType: 'json', data: postBody
        });
    }

    /**
     * 获取标的物策略
     * @param policyIds
     * @param projection
     */
    async getPolicies(policyIds: string[], subjectType: SubjectTypeEnum, projection: string[] = []): Promise<PolicyInfo[]> {
        // 目前针对策略是否是自己创建的这块逻辑验证不严格.如果需要严格,则需要在下方url中追加参数userId
        return this.ctx.curlIntranetApi(`${this.ctx.webApi.policyInfoV2}/list?policyIds=${policyIds.toString()}&subjectType=${subjectType}&projection=${projection.toString()}`);
    }
}
