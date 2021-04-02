import { INodeService, IOutsideApiService, IPresentableService, IPresentableVersionService } from '../../interface';
import { FreelogContext, IJsonSchemaValidate } from 'egg-freelog-base';
export declare class PresentableController {
    ctx: FreelogContext;
    nodeCommonChecker: any;
    presentableCommonChecker: any;
    nodeService: INodeService;
    outsideApiService: IOutsideApiService;
    presentableService: IPresentableService;
    resolveResourcesValidator: IJsonSchemaValidate;
    presentablePolicyValidator: IJsonSchemaValidate;
    presentableRewritePropertyValidator: IJsonSchemaValidate;
    presentableVersionService: IPresentableVersionService;
    index(): Promise<FreelogContext>;
    indexForAdmin(): Promise<FreelogContext>;
    /**
     * 获取presentable列表
     * @returns {Promise<void>}
     */
    list(): Promise<void>;
    createPresentable(): Promise<void>;
    updatePresentable(): Promise<void>;
    updatePresentableOnlineStatus(): Promise<void>;
    updatePresentableVersion(): Promise<void>;
    updatePresentableRewriteProperty(): Promise<void>;
    presentableDetail(): Promise<void>;
    show(): Promise<void>;
    dependencyTree(): Promise<void>;
    authTree(): Promise<void>;
    relationTree(): Promise<void>;
    /**
     * 策略格式校验
     * @param policies
     * @param mode
     */
    _policySchemaValidate(policies: any, mode: 'addPolicy' | 'updatePolicy'): void;
    /**
     * 解决上抛资源格式校验
     * @param resolveResources
     */
    _resolveResourcesSchemaValidate(resolveResources: any): void;
}
