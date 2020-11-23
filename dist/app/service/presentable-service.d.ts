import { PresentableOnlineStatusEnum } from "../../enum";
import { CreatePresentableOptions, INodeService, IOutsideApiService, IPresentableAuthService, IPresentableService, IPresentableVersionService, PolicyInfo, PresentableInfo, ResolveResource, ResourceInfo, UpdatePresentableOptions } from '../../interface';
import { FreelogContext, IMongodbOperation, PageResult } from 'egg-freelog-base';
export declare class PresentableService implements IPresentableService {
    ctx: FreelogContext;
    nodeService: INodeService;
    outsideApiService: IOutsideApiService;
    presentableAuthService: IPresentableAuthService;
    presentableVersionService: IPresentableVersionService;
    presentableProvider: IMongodbOperation<PresentableInfo>;
    /**
     * 创建展品
     * @param {CreatePresentableOptions} options
     * @returns {Promise<any>}
     */
    createPresentable(options: CreatePresentableOptions): Promise<PresentableInfo>;
    /**
     * 更新展品
     * @param presentableInfo
     * @param options
     */
    updatePresentable(presentableInfo: PresentableInfo, options: UpdatePresentableOptions): Promise<PresentableInfo>;
    /**
     * 更新展品版本
     * @param presentableInfo
     * @param version
     * @param resourceVersionId
     */
    updatePresentableVersion(presentableInfo: PresentableInfo, version: string, resourceVersionId: string): Promise<boolean>;
    /**
     * 更新展品上下线状态
     * @param presentableInfo
     * @param onlineStatus
     */
    updateOnlineStatus(presentableInfo: PresentableInfo, onlineStatus: PresentableOnlineStatusEnum): Promise<boolean>;
    findOne(condition: object, ...args: any[]): Promise<PresentableInfo>;
    findById(presentableId: string, ...args: any[]): Promise<PresentableInfo>;
    find(condition: object, ...args: any[]): Promise<PresentableInfo[]>;
    findByIds(presentableIds: string[], ...args: any[]): Promise<PresentableInfo[]>;
    findPageList(condition: object, page: number, pageSize: number, projection: string[], orderBy: object): Promise<PageResult<PresentableInfo>>;
    findList(condition: object, page: number, pageSize: number, projection: string[], orderBy: object): Promise<PresentableInfo[]>;
    count(condition: object): Promise<number>;
    fillPresentableVersionProperty(presentables: PresentableInfo[], isLoadResourceCustomPropertyDescriptors: boolean, isLoadPresentableRewriteProperty: boolean): Promise<PresentableInfo[]>;
    fillPresentablePolicyInfo(presentables: PresentableInfo[]): Promise<PresentableInfo[]>;
    /**
     * 校验resolveResources参数
     * @param resourceInfo
     * @param resolveResources
     * @returns {Promise<void>}
     * @private
     */
    _validateResolveResources(resourceInfo: ResourceInfo, resolveResources: ResolveResource[]): Promise<void>;
    /**
     * 策略校验
     * @param policies
     */
    _validateAndCreateSubjectPolicies(policies: PolicyInfo[]): Promise<PolicyInfo[]>;
}
