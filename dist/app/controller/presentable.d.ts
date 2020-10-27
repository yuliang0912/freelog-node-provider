import { IJsonSchemaValidate, INodeService, IOutsideApiService, IPresentableService, IPresentableVersionService } from '../../interface';
export declare class PresentableController {
    ctx: any;
    nodeCommonChecker: any;
    presentableCommonChecker: any;
    nodeService: INodeService;
    outsideApiService: IOutsideApiService;
    presentableService: IPresentableService;
    resolveResourcesValidator: IJsonSchemaValidate;
    presentablePolicyValidator: IJsonSchemaValidate;
    presentableVersionService: IPresentableVersionService;
    presentablePageList(ctx: any): Promise<any>;
    /**
     * 获取presentable列表
     * @param ctx
     * @returns {Promise<void>}
     */
    list(ctx: any): Promise<void>;
    createPresentable(ctx: any): Promise<void>;
    updatePresentable(ctx: any): Promise<void>;
    updatePresentableOnlineStatus(ctx: any): Promise<void>;
    updatePresentableVersion(ctx: any): Promise<void>;
    presentableDetail(ctx: any): Promise<void>;
    show(ctx: any): Promise<void>;
    dependencyTree(ctx: any): Promise<void>;
    authTree(ctx: any): Promise<void>;
    /**
     * 策略格式校验
     * @param policies
     * @private
     */
    _policySchemaValidate(policies: any, mode: 'addPolicy' | 'updatePolicy'): void;
    /**
     * 解决上抛资源格式校验
     * @param resolveResources
     */
    _resolveResourcesSchemaValidate(resolveResources: any): void;
}
