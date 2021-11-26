import { IOutsideApiService } from '../../interface';
import { ISubjectBaseInfo, SubjectAuthResult, TestResourceSubjectInfo } from '../../auth-interface';
import { FreelogContext } from 'egg-freelog-base';
import { FlattenTestResourceDependencyTree, TestResourceDependencyTree, TestResourceInfo } from '../../test-node-interface';
import { TestNodeGenerator } from '../test-node-generator';
export declare class ExhibitTestAuthResponseHandler {
    ctx: FreelogContext;
    outsideApiService: IOutsideApiService;
    testNodeGenerator: TestNodeGenerator;
    /**
     * 授权结果统一响应处理
     * @param testResourceInfo
     * @param flattenDependencyTree
     * @param authResult
     * @param parentNid
     * @param subEntityIdOrName
     * @param subEntityType
     * @param subEntityFile
     */
    testResourceHandle(testResourceInfo: TestResourceInfo, flattenDependencyTree: FlattenTestResourceDependencyTree[], authResult: SubjectAuthResult, parentNid?: string, subEntityIdOrName?: string, subEntityType?: string, subEntityFile?: string): Promise<void>;
    /**
     * 公共响应头处理
     * @param subjectInfo
     * @param responseTestResourceDependencyTree
     */
    commonResponseHeaderHandle(subjectInfo: ISubjectBaseInfo, responseTestResourceDependencyTree: TestResourceDependencyTree): void;
    /**
     * 文件流响应处理
     * @param realResponseEntityInfo
     */
    fileStreamResponseHandle(realResponseEntityInfo: TestResourceDependencyTree): Promise<void>;
    /**
     * 获取子资源文件
     * @param realResponseEntityInfo
     * @param subEntityFile
     */
    subEntityFileResponseHandle(realResponseEntityInfo: TestResourceDependencyTree, subEntityFile: string): Promise<void>;
    /**
     * 标的物自身信息展示
     * @param subjectInfo
     */
    subjectInfoResponseHandle(subjectInfo: ISubjectBaseInfo): void;
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
     * @param flattenTestResourceDependencyTree
     * @param parentNid
     * @param subEntityIdOrName
     * @param subEntityType
     */
    getRealResponseEntityInfo(flattenTestResourceDependencyTree: FlattenTestResourceDependencyTree[], parentNid: string, subEntityIdOrName?: string, subEntityType?: string): TestResourceDependencyTree;
    /**
     * 测试资源转换为标的物
     * @param testResource
     */
    _testResourceWrapToSubjectBaseInfo(testResource: TestResourceInfo): TestResourceSubjectInfo;
}
