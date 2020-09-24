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
    index(ctx: any): Promise<any>;
    create(ctx: any): Promise<void>;
    update(ctx: any): Promise<void>;
    detail(ctx: any): Promise<void>;
    show(ctx: any): Promise<void>;
    dependencyTree(ctx: any): Promise<void>;
    authTree(ctx: any): Promise<void>;
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
