import { IPresentableAuthService, IPresentableService, IPresentableVersionService } from '../../interface';
export declare class ResourceAuthController {
    presentableAuthResponseHandler: any;
    presentableService: IPresentableService;
    presentableAuthService: IPresentableAuthService;
    presentableVersionService: IPresentableVersionService;
    /**
     * 通过展品ID获取展品并且授权
     * @param ctx
     */
    presentableAuth(ctx: any): Promise<void>;
    /**
     * 通过节点ID和资源ID获取展品,并且授权
     * @param ctx
     */
    nodeResourceAuth(ctx: any): Promise<void>;
}
