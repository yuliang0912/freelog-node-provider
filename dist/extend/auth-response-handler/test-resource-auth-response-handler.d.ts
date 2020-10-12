import { SubjectAuthResult } from '../../auth-interface';
import { IOutsideApiService } from '../../interface';
import { FlattenTestResourceDependencyTree, TestResourceDependencyTree, TestResourceInfo } from "../../test-node-interface";
export declare class TestResourceAuthResponseHandler {
    ctx: any;
    testNodeGenerator: any;
    outsideApiService: IOutsideApiService;
    /**
     * 授权结果统一响应处理
     * @param presentableInfo
     * @param presentableVersionInfo
     * @param authResult
     * @param entityNid
     * @param subResourceIdOrName
     */
    handle(testResourceInfo: TestResourceInfo, flattenDependencyTree: FlattenTestResourceDependencyTree[], authResult: SubjectAuthResult, parentNid?: string, subEntityIdOrName?: string, subEntityType?: string): Promise<void>;
    /**
     * 公共响应头处理
     * @param presentableVersionInfo
     * @param realResponseVersionInfo
     */
    commonResponseHeaderHandle(responseTestResourceDependencyTree: TestResourceDependencyTree): void;
    /**
     * 文件流响应处理
     * @param presentableInfo
     * @param presentableVersionInfo
     * @param realResponseResourceVersionInfo
     */
    fileStreamResponseHandle(fileSha1: string, entityId: string, entityType: string, attachmentName?: string): Promise<void>;
    /**
     * 标的物自身信息展示
     * @param presentableInfo
     */
    subjectInfoResponseHandle(testResourceInfo: TestResourceInfo): void;
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
    getRealResponseEntityInfo(flattenTestResourceDependencyTree: FlattenTestResourceDependencyTree[], parentNid: string, subEntityIdOrName?: string, subEntityType?: string): TestResourceDependencyTree;
}
