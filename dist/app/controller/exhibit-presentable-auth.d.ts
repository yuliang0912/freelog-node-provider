import { IPresentableAuthService, IPresentableService, IPresentableVersionService, PresentableInfo } from '../../interface';
import { FreelogContext } from 'egg-freelog-base';
import { ExhibitAuthResponseHandler } from '../../extend/auth-response-handler/exhibit-auth-response-handler';
import { PresentableAdapter } from '../../extend/exhibit-adapter/presentable-adapter';
import { WorkTypeEnum } from '../../enum';
export declare class PresentableSubjectAuthController {
    ctx: FreelogContext;
    presentableCommonChecker: any;
    presentableService: IPresentableService;
    presentableAuthService: IPresentableAuthService;
    presentableVersionService: IPresentableVersionService;
    presentableAdapter: PresentableAdapter;
    exhibitAuthResponseHandler: ExhibitAuthResponseHandler;
    /**
     * 通过展品ID获取展品
     */
    exhibitAuth(): Promise<void>;
    /**
     * 通过节点ID和作品ID获取展品
     */
    exhibitAuthByNodeAndWork(): Promise<void>;
    /**
     * 批量展品节点侧以及上游链路授权(不包含C端用户)
     */
    exhibitBatchAuth(): Promise<FreelogContext>;
    /**
     * 展品授权处理
     * @param presentableInfo
     * @param parentNid
     * @param subWorkName
     * @param subWorkType
     * @param subFilePath
     */
    _presentableAuthHandle(presentableInfo: PresentableInfo, parentNid: string, subWorkName: string, subWorkType: WorkTypeEnum, subFilePath: string): Promise<void>;
}
