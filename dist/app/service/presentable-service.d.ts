import { PresentableOnlineStatusEnum } from '../../enum';
import { CreatePresentableOptions, findOptions, INodeService, IOutsideApiService, IPresentableAuthService, IPresentableService, IPresentableVersionService, PolicyInfo, PresentableInfo, ResolveResource, ResourceInfo, UpdatePresentableOptions } from '../../interface';
import { FreelogContext, IMongodbOperation, PageResult } from 'egg-freelog-base';
import { PresentableCommonChecker } from '../../extend/presentable-common-checker';
export declare class PresentableService implements IPresentableService {
    ctx: FreelogContext;
    mongoose: any;
    nodeService: INodeService;
    outsideApiService: IOutsideApiService;
    presentableAuthService: IPresentableAuthService;
    presentableVersionService: IPresentableVersionService;
    presentableProvider: IMongodbOperation<PresentableInfo>;
    presentableCommonChecker: PresentableCommonChecker;
    /**
     * 查询合约被应用于那些展品
     * @param nodeId
     * @param contractIds
     */
    contractAppliedPresentable(nodeId: number, contractIds: string[]): Promise<{
        contractId: string;
        presentables: Pick<PresentableInfo, keyof PresentableInfo>[];
    }[]>;
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
    /**
     * 搜索展品列表
     * @param condition
     * @param keywords
     * @param options
     */
    searchIntervalList(condition: object, keywords?: string, options?: findOptions<PresentableInfo>): Promise<{
        skip: number;
        limit: number;
        totalItem: any;
        dataList: any;
    }>;
    findOne(condition: object, ...args: any[]): Promise<PresentableInfo>;
    findById(presentableId: string, ...args: any[]): Promise<PresentableInfo>;
    find(condition: object, ...args: any[]): Promise<PresentableInfo[]>;
    findByIds(presentableIds: string[], ...args: any[]): Promise<PresentableInfo[]>;
    findIntervalList(condition: object, skip?: number, limit?: number, projection?: string[], sort?: object): Promise<PageResult<PresentableInfo>>;
    count(condition: object): Promise<number>;
    /**
     * 填充展品版本属性
     * @param presentables
     * @param isLoadResourceCustomPropertyDescriptors
     * @param isLoadPresentableRewriteProperty
     */
    fillPresentableVersionProperty(presentables: PresentableInfo[], isLoadResourceCustomPropertyDescriptors: boolean, isLoadPresentableRewriteProperty: boolean): Promise<PresentableInfo[]>;
    /**
     * 填充展品策略信息
     * @param presentables
     * @param isTranslate
     */
    fillPresentablePolicyInfo(presentables: PresentableInfo[], isTranslate?: boolean): Promise<PresentableInfo[]>;
    /**
     * 填充展品的资源信息
     */
    fillPresentableResourceInfo(presentables: PresentableInfo[]): Promise<PresentableInfo[]>;
    /**
     * 填充展品资源版本信息
     * @param presentables
     */
    fillPresentableResourceVersionInfo(presentables: PresentableInfo[]): Promise<PresentableInfo[]>;
    /**
     * 节点创建的展品数量统计
     * @param nodeIds
     */
    nodePresentableStatistics(nodeIds: number[]): Promise<Array<{
        nodeId: number;
        count: number;
    }>>;
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
