import { IPresentableAuthResponseHandler, IPresentableAuthService, IPresentableService, IPresentableVersionService } from '../../interface';
import { FreelogContext } from 'egg-freelog-base';
export declare class ResourceAuthController {
    ctx: FreelogContext;
    presentableCommonChecker: any;
    presentableService: IPresentableService;
    presentableAuthService: IPresentableAuthService;
    presentableVersionService: IPresentableVersionService;
    presentableAuthResponseHandler: IPresentableAuthResponseHandler;
    /**
     * 展品服务的色块(目前此接口未使用,网关层面通过已通过mock实现)
     */
    serviceStates(): Promise<void>;
    /**
     * 通过展品ID获取展品并且授权
     */
    presentableAuth(): Promise<void>;
    /**
     * 批量展品节点侧以及上游链路授权(不包含C端用户)
     */
    presentableNodeSideAndUpstreamAuth(): Promise<void>;
    /**
     * 通过节点ID和资源ID获取展品,并且授权
     */
    nodeResourceAuth(): Promise<void>;
}
