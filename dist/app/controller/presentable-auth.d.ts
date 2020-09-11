import { IOutsideApiService, IPresentableAuthService, IPresentableService, IPresentableVersionService } from '../../interface';
export declare class ResourceAuthController {
    ctx: any;
    outsideApiService: IOutsideApiService;
    presentableService: IPresentableService;
    presentableAuthService: IPresentableAuthService;
    presentableVersionService: IPresentableVersionService;
    presentableAuthResponseHandler: any;
    presentableAuth(ctx: any): Promise<void>;
    nodeResourceAuth(ctx: any): Promise<void>;
}
