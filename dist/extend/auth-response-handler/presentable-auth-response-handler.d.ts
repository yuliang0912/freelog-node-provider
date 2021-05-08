import { FlattenPresentableDependencyTree, IOutsideApiService, IPresentableVersionService, PresentableInfo, PresentableDependencyTree, PresentableVersionInfo, IPresentableAuthResponseHandler } from '../../interface';
import { SubjectAuthResult } from '../../auth-interface';
import { FreelogContext } from 'egg-freelog-base';
export declare class PresentableAuthResponseHandler implements IPresentableAuthResponseHandler {
    ctx: FreelogContext;
    outsideApiService: IOutsideApiService;
    presentableVersionService: IPresentableVersionService;
    /**
     * 授权结果统一响应处理
     * @param presentableInfo
     * @param presentableVersionInfo
     * @param authResult
     * @param parentNid
     * @param subResourceIdOrName
     */
    handle(presentableInfo: PresentableInfo, presentableVersionInfo: PresentableVersionInfo, authResult: SubjectAuthResult, parentNid?: string, subResourceIdOrName?: string): Promise<void>;
    /**
     * 公共响应头处理
     * @param presentableInfo
     * @param presentableVersionInfo
     * @param realResponseResourceVersionInfo
     */
    commonResponseHeaderHandle(presentableInfo: PresentableInfo, presentableVersionInfo: PresentableVersionInfo, realResponseResourceVersionInfo: PresentableDependencyTree): void;
    /**
     * 文件流响应处理
     * @param versionId
     * @param resourceType
     * @param attachmentName
     */
    fileStreamResponseHandle(versionId: string, resourceType: string, attachmentName?: string): Promise<void>;
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
    /**
     * 标的物授权失败
     * @param authResult
     */
    subjectAuthFailedResponseHandle(authResult: SubjectAuthResult): void;
    /**
     * 授权异常处理
     * @param error
     */
    subjectAuthProcessExceptionHandle(error: any): void;
    /**
     * 标的物授权结果响应
     * @param authResult
     */
    subjectAuthResultResponse(authResult: SubjectAuthResult): void;
    /**
     * 获取实际需要响应的资源信息,例如标的物的依赖项
     * @param flattenPresentableDependencyTree
     * @param parentNid
     * @param subResourceIdOrName
     */
    getRealResponseResourceInfo(flattenPresentableDependencyTree: FlattenPresentableDependencyTree[], parentNid: string, subResourceIdOrName?: string): PresentableDependencyTree;
}
