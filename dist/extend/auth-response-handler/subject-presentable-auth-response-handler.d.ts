import { FlattenPresentableDependencyTree, INodeService, IOutsideApiService, IPresentableVersionService, PresentableDependencyTree, PresentableInfo, PresentableVersionInfo } from '../../interface';
import { ISubjectBaseInfo, PresentableSubjectInfo, SubjectAuthResult } from '../../auth-interface';
import { FreelogContext } from 'egg-freelog-base';
export declare class SubjectPresentableAuthResponseHandler {
    ctx: FreelogContext;
    outsideApiService: IOutsideApiService;
    nodeService: INodeService;
    presentableVersionService: IPresentableVersionService;
    /**
     * 授权结果统一响应处理
     * @param presentableInfo
     * @param presentableVersionInfo
     * @param authResult
     * @param parentNid
     * @param subResourceIdOrName
     * @param subResourceFile
     */
    presentableHandle(presentableInfo: PresentableInfo, presentableVersionInfo: PresentableVersionInfo, authResult: SubjectAuthResult, parentNid?: string, subResourceIdOrName?: string, subResourceFile?: string): Promise<void>;
    /**
     * 公共响应头处理
     * @param subjectInfo
     * @param realResponseResourceVersionInfo
     */
    commonResponseHeaderHandle(subjectInfo: ISubjectBaseInfo, realResponseResourceVersionInfo: PresentableDependencyTree): Promise<void>;
    /**
     * 文件流响应处理
     * @param versionId
     * @param resourceType
     * @param attachmentName
     */
    fileStreamResponseHandle(versionId: string, resourceType: string, attachmentName?: string): Promise<void>;
    /**
     * 获取子资源文件
     * @param resourceId
     * @param version
     * @param subResourceFile
     */
    subResourceFileResponseHandle(resourceId: string, version: string, subResourceFile: string): Promise<void>;
    /**
     * 标的物自身信息展示
     * @param subjectInfo
     */
    subjectInfoResponseHandle(subjectInfo: ISubjectBaseInfo): void;
    /**
     * 标的物上游资源信息展示
     * @param resourceId
     */
    subjectUpstreamResourceInfoResponseHandle(resourceId: string): Promise<void>;
    /**
     * 标的物授权失败
     * @param subjectBaseInfo
     * @param authResult
     */
    subjectAuthFailedResponseHandle(subjectBaseInfo: ISubjectBaseInfo, authResult: SubjectAuthResult): void;
    /**
     * 标的物授权结果响应
     * @param subjectBaseInfo
     * @param authResult
     */
    subjectAuthResultResponse(subjectBaseInfo: ISubjectBaseInfo, authResult: SubjectAuthResult): void;
    /**
     * 获取实际需要响应的资源信息,例如标的物的依赖项
     * @param flattenPresentableDependencyTree
     * @param parentNid
     * @param subResourceIdOrName
     */
    _getRealResponseResourceInfo(flattenPresentableDependencyTree: FlattenPresentableDependencyTree[], parentNid: string, subResourceIdOrName?: string): PresentableDependencyTree;
    /**
     * 展品转换为标的物
     * @param presentableInfo
     * @param presentableVersionInfo
     */
    _presentableWrapToSubjectBaseInfo(presentableInfo: PresentableInfo, presentableVersionInfo: PresentableVersionInfo): PresentableSubjectInfo;
}
