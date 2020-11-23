import { SubjectAuthResult } from '../../auth-interface';
import { FreelogContext } from 'egg-freelog-base';
import { IOutsideApiService } from '../../interface';
import { FlattenTestResourceDependencyTree, TestResourceDependencyTree, TestResourceInfo } from "../../test-node-interface";
export declare class TestResourceAuthResponseHandler {
    ctx: FreelogContext;
    testNodeGenerator: any;
    outsideApiService: IOutsideApiService;
    /**
     * 授权结果统一响应处理
     * @param testResourceInfo
     * @param flattenDependencyTree
     * @param authResult
     * @param parentNid
     * @param subEntityIdOrName
     * @param subEntityType
     */
    handle(testResourceInfo: TestResourceInfo, flattenDependencyTree: FlattenTestResourceDependencyTree[], authResult: SubjectAuthResult, parentNid?: string, subEntityIdOrName?: string, subEntityType?: string): Promise<void>;
    /**
     * 公共响应头处理
     * @param responseTestResourceDependencyTree
     */
    commonResponseHeaderHandle(responseTestResourceDependencyTree: TestResourceDependencyTree): void;
    /**
     * 文件流响应处理
     * @param fileSha1
     * @param entityId
     * @param entityType
     * @param attachmentName
     */
    fileStreamResponseHandle(fileSha1: string, entityId: string, entityType: string, attachmentName?: string): Promise<void>;
    /**
     * 标的物自身信息展示
     * @param testResourceInfo
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
     * @param flattenTestResourceDependencyTree
     * @param parentNid
     * @param subEntityIdOrName
     * @param subEntityType
     */
    getRealResponseEntityInfo(flattenTestResourceDependencyTree: FlattenTestResourceDependencyTree[], parentNid: string, subEntityIdOrName?: string, subEntityType?: string): TestResourceDependencyTree;
}
