import { IOutsideApiService, IPresentableVersionService, PresentableInfo, PresentableVersionDependencyTreeInfo, PresentableVersionInfo } from '../../interface';
import { SubjectAuthResult } from '../../auth-interface';
export declare class PresentableAuthResponseHandler {
    ctx: any;
    outsideApiService: IOutsideApiService;
    presentableVersionService: IPresentableVersionService;
    /**
     * 授权结果统一响应处理
     * @param presentableInfo
     * @param presentableVersionInfo
     * @param authResult
     * @param entityNid
     * @param subResourceIdOrName
     */
    handle(presentableInfo: PresentableInfo, presentableVersionInfo: PresentableVersionInfo, authResult: SubjectAuthResult, entityNid?: string, subResourceIdOrName?: string): Promise<void>;
    /**
     * 公共响应头处理
     * @param presentableVersionInfo
     * @param realResponseVersionInfo
     */
    commonResponseHeaderHandle(presentableVersionInfo: PresentableVersionInfo, realResponseResourceVersionInfo: PresentableVersionDependencyTreeInfo): void;
    /**
     * 文件流响应处理
     * @param presentableInfo
     * @param presentableVersionInfo
     * @param realResponseResourceVersionInfo
     */
    fileStreamResponseHandle(presentableInfo: PresentableInfo, presentableVersionInfo: PresentableVersionInfo, realResponseResourceVersionInfo: PresentableVersionDependencyTreeInfo): Promise<void>;
    /**
     * 标的物自身信息展示
     * @param presentableInfo
     */
    subjectInfoResponseHandle(presentableInfo: PresentableInfo): void;
    /**
     * 标的物上游资源信息展示
     * @param resourceId
     */
    subjectUpstreamResourceInfoResponseHandle(resourceId: any): Promise<void>;
    subjectAuthFailedResponseHandle(authResult: SubjectAuthResult): void;
    subjectAuthProcessExceptionHandle(error: any): void;
    /**
     * 标的物授权结果响应
     * @param authResult
     */
    subjectAuthResultResponse(authResult: SubjectAuthResult): void;
    /**
     * 获取实际需要响应的资源信息,例如标的物的依赖项
     * @param presentableVersionAuthTree
     * @param parentEntityNid
     * @param subResourceIdOrName
     */
    getRealResponseResourceInfo(presentableVersionAuthTree: PresentableVersionDependencyTreeInfo[], parentEntityNid: string, subResourceIdOrName?: string): PresentableVersionDependencyTreeInfo;
}
