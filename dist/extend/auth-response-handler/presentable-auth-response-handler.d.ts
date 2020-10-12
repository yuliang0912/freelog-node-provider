import { FlattenPresentableDependencyTree, IOutsideApiService, IPresentableVersionService, PresentableInfo, PresentableDependencyTree, PresentableVersionInfo } from '../../interface';
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
    handle(presentableInfo: PresentableInfo, presentableVersionInfo: PresentableVersionInfo, authResult: SubjectAuthResult, parentNid?: string, subResourceIdOrName?: string): Promise<void>;
    /**
     * 公共响应头处理
     * @param presentableVersionInfo
     * @param realResponseVersionInfo
     */
    commonResponseHeaderHandle(presentableVersionInfo: PresentableVersionInfo, realResponseResourceVersionInfo: PresentableDependencyTree): void;
    /**
     * 文件流响应处理
     * @param presentableInfo
     * @param presentableVersionInfo
     * @param realResponseResourceVersionInfo
     */
    fileStreamResponseHandle(fileSha1: string, resourceType: string, attachmentName?: string): Promise<void>;
    /**
     * 标的物自身信息展示
     * @param presentableInfo
     */
    subjectInfoResponseHandle(presentableInfo: PresentableInfo): void;
    /**
     * 标的物上游资源信息展示
     * @param resourceId
     */
    subjectUpstreamResourceInfoResponseHandle(resourceId: string): Promise<void>;
    subjectAuthFailedResponseHandle(authResult: SubjectAuthResult): void;
    subjectAuthProcessExceptionHandle(error: any): void;
    /**
     * 标的物授权结果响应
     * @param authResult
     */
    subjectAuthResultResponse(authResult: SubjectAuthResult): void;
    /**
     * 获取实际需要响应的资源信息,例如标的物的依赖项
     * @param presentableAuthTree
     * @param parentEntityNid
     * @param subResourceIdOrName
     */
    getRealResponseResourceInfo(flattenPresentableDependencyTree: FlattenPresentableDependencyTree[], parentNid: string, subResourceIdOrName?: string): PresentableDependencyTree;
}
