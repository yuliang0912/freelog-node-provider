import { IJsonSchemaValidate, INodeService, IOutsideApiService, IPresentableService } from '../../interface';
export declare class PresentableController {
    ctx: any;
    nodeCommonChecker: any;
    presentableCommonChecker: any;
    nodeService: INodeService;
    outsideApiService: IOutsideApiService;
    presentableService: IPresentableService;
    presentableVersionService: any;
    resolveResourcesValidator: IJsonSchemaValidate;
    presentablePolicyValidator: IJsonSchemaValidate;
    index(ctx: any): Promise<any>;
    create(ctx: any): Promise<void>;
    /**
     * 更新presentable
     * @param ctx
     * @returns {Promise<void>}
     */
    update(ctx: any): Promise<void>;
    detail(ctx: any): Promise<void>;
    /**
     * 展示presentable详情
     * @param ctx
     * @returns {Promise.<void>}
     */
    show(ctx: any): Promise<void>;
    /**
     * 策略格式校验
     * @param policies
     * @private
     */
    _policySchemaValidate(policies: any): void;
    /**
     * 解决上抛资源格式校验
     * @param resolveResources
     */
    _resolveResourcesSchemaValidate(resolveResources: any): void;
}
