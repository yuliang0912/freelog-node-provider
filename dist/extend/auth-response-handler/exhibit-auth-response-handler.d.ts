import { ExhibitDependencyTree, ExhibitInfo, IOutsideApiService } from '../../interface';
import { SubjectAuthResult } from '../../auth-interface';
import { FreelogContext } from 'egg-freelog-base';
import { WorkTypeEnum } from '../../enum';
import { ExhibitInfoAdapter } from '../exhibit-adapter';
export declare class ExhibitAuthResponseHandler {
    ctx: FreelogContext;
    outsideApiService: IOutsideApiService;
    exhibitInfoAdapter: ExhibitInfoAdapter;
    /**
     * 展品响应授权处理
     * @param exhibitInfo
     * @param authResult
     * @param parentNid
     * @param subWorkIdOrName
     * @param subWorkType
     * @param subWorkFilePath
     */
    handle(exhibitInfo: ExhibitInfo, authResult: SubjectAuthResult, parentNid: string, subWorkIdOrName?: string, subWorkType?: WorkTypeEnum, subWorkFilePath?: string): Promise<void>;
    /**
     * 公共响应头处理
     * @param exhibitInfo
     * @param realResponseWorkBaseInfo
     */
    commonResponseHeaderHandle(exhibitInfo: ExhibitInfo, realResponseWorkBaseInfo: ExhibitDependencyTree): Promise<void>;
    /**
     * 文件流响应处理
     * @param realResponseWorkBaseInfo
     * @param attachmentName
     */
    fileStreamResponseHandle(realResponseWorkBaseInfo: ExhibitDependencyTree, attachmentName: string): Promise<void>;
    /**
     * 获取子资源文件
     * @param realResponseWorkBaseInfo
     * @param subWorkFilePath
     */
    workSubFileStreamResponseHandle(realResponseWorkBaseInfo: ExhibitDependencyTree, subWorkFilePath: string): Promise<void>;
    /**
     * 标的物自身信息展示
     * @param exhibitInfo
     */
    exhibitInfoResponseHandle(exhibitInfo: ExhibitInfo): void;
    /**
     * 标的物授权失败
     * @param exhibitInfo
     * @param authResult
     */
    exhibitAuthFailedResponseHandle(authResult: SubjectAuthResult, exhibitInfo?: Partial<ExhibitInfo>): void;
    /**
     * 标的物授权结果响应
     * @param exhibitInfo
     * @param authResult
     */
    exhibitAuthResultResponse(authResult: SubjectAuthResult, exhibitInfo?: Partial<ExhibitInfo>): void;
    /**
     * 获取实际需要的作品信息(或作品的依赖)
     * @param exhibitInfo
     * @param parentNid
     * @param subWorkIdOrName
     * @param subWorkType
     */
    _getRealResponseWorkBaseInfo(exhibitInfo: ExhibitInfo, parentNid: string, subWorkIdOrName?: string, subWorkType?: WorkTypeEnum): ExhibitDependencyTree;
}
