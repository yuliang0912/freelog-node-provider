import { CreatePresentableOptions, IOutsideApiService, IPresentableAuthService, IPresentableService, IPresentableVersionService, PageResult, PolicyInfo, PresentableInfo, ResolveResource, ResourceInfo, UpdatePresentableOptions } from '../../interface';
import { PresentableOnlineStatusEnum } from "../../enum";
export declare class PresentableService implements IPresentableService {
    ctx: any;
    presentableProvider: any;
    outsideApiService: IOutsideApiService;
    presentableAuthService: IPresentableAuthService;
    presentableVersionService: IPresentableVersionService;
    /**
     * 创建展品
     * @param {CreatePresentableOptions} options
     * @returns {Promise<any>}
     */
    createPresentable(options: CreatePresentableOptions): Promise<any>;
    /**
     * 更新展品
     * @param presentableInfo
     * @param options
     */
    updatePresentable(presentableInfo: PresentableInfo, options: UpdatePresentableOptions): Promise<PresentableInfo>;
    updateOnlineStatus(presentableInfo: PresentableInfo, onlineStatus: PresentableOnlineStatusEnum): Promise<any>;
    findOne(condition: object, ...args: any[]): Promise<PresentableInfo>;
    findById(presentableId: string, ...args: any[]): Promise<PresentableInfo>;
    find(condition: object, ...args: any[]): Promise<PresentableInfo[]>;
    findByIds(presentableIds: string[], ...args: any[]): Promise<PresentableInfo[]>;
    findPageList(condition: object, page: number, pageSize: number, projection: string[], orderBy: object): Promise<PageResult<PresentableInfo>>;
    findList(condition: object, page: number, pageSize: number, projection: string[], orderBy: object): Promise<PresentableInfo[]>;
    count(condition: object): Promise<number>;
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
     * @param policyIds
     * @private
     */
    _validateAndCreateSubjectPolicies(policies: PolicyInfo[]): Promise<PolicyInfo[]>;
}
