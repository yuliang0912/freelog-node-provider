import { SubjectAuthResult } from "./auth-interface";
import { ObjectDependencyTreeInfo } from "./test-node-interface";
import { PresentableAuthStatusEnum, PresentableOnlineStatusEnum } from './enum';
import { ContractLicenseeIdentityTypeEnum, ContractStatusEnum, FreelogUserInfo, SubjectTypeEnum, PageResult } from "egg-freelog-base";
export interface findOptions<T> {
    sort?: {
        [P in keyof T]?: 1 | -1 | boolean;
    };
    limit?: number;
    skip?: number;
    projection?: string;
}
export interface SubjectInfo {
    subjectId: string;
    policyId: string;
}
export interface BaseContractInfo {
    policyId: string;
    contractId?: string;
}
export interface BaseResourceInfo {
    resourceId: string;
    resourceName: string;
    resourceType?: string;
    versionRange?: string;
}
export interface ResolveResource {
    resourceId: string;
    resourceName?: string;
    contracts: BaseContractInfo[];
}
export interface NodeInfo {
    nodeId: number;
    nodeName: string;
    nodeDomain: string;
    ownerUserId: number;
    ownerUserName: string;
    nodeThemeId?: string;
    status?: number;
    uniqueKey?: string;
    nodeDetail?: NodeDetailInfo;
}
export interface NodeDetailInfo {
    tagIds: number[];
    statusChangeRemark?: string;
}
export interface PresentableInfo {
    presentableId: string;
    presentableName: string;
    presentableTitle: string;
    policies?: PolicyInfo[];
    nodeId: number;
    userId: number;
    version: string;
    resourceInfo: BaseResourceInfo;
    resolveResources: ResolveResource[];
    tags?: string[];
    coverImages: string[];
    onlineStatus: PresentableOnlineStatusEnum;
    authStatus: PresentableAuthStatusEnum;
}
export interface PresentableVersionInfo {
    presentableId: string;
    version: string;
    resourceId: string;
    presentableVersionId: string;
    resourceSystemProperty: object;
    resourceCustomPropertyDescriptors?: any[];
    presentableRewriteProperty?: any[];
    versionProperty: object;
    authTree: FlattenPresentableAuthTree[];
    dependencyTree: FlattenPresentableDependencyTree[];
}
export interface BasePolicyInfo {
    policyId: string;
    policyText: string;
    subjectType?: number;
    fsmDescriptionInfo: object;
}
export interface PolicyInfo extends BasePolicyInfo {
    status: number;
    policyName: string;
}
export interface CreateNodeOptions {
    nodeName: string;
    nodeDomain: string;
}
export interface CreatePresentableOptions {
    presentableName: string;
    presentableTitle: string;
    resourceInfo: ResourceInfo;
    version: string;
    versionId: string;
    tags: string[];
    policies: PolicyInfo[];
    nodeInfo: NodeInfo;
    resolveResources: ResolveResource[];
    coverImages: string[];
}
export interface UpdatePresentableOptions {
    presentableTitle?: string;
    tags?: string[];
    resolveResources?: ResolveResource[];
    addPolicies?: PolicyInfo[];
    updatePolicies?: PolicyInfo[];
    coverImages?: string[];
}
export interface ContractInfo {
    contractId: string;
    contractName: string;
    licensorId: string | number;
    licensorName: string;
    licensorOwnerId: number;
    licensorOwnerName: string;
    licenseeId: string | number;
    licenseeName: string;
    licenseeOwnerId: number;
    licenseeOwnerName: string;
    licenseeIdentityType: ContractLicenseeIdentityTypeEnum;
    subjectId: string;
    subjectName: string;
    subjectType: SubjectTypeEnum;
    fsmCurrentState?: string | null;
    fsmRunningStatus?: number;
    fsmDeclarations?: object;
    policyId: string;
    status?: ContractStatusEnum;
    authStatus: number;
    createDate?: Date;
    isAuth?: boolean;
    isTestAuth?: boolean;
}
export interface ObjectStorageInfo {
    objectId: string;
    userId: number;
    sha1: string;
    objectName: string;
    bucketName: string;
    resourceType: string;
    bucketId?: string;
    systemProperty?: object;
    customPropertyDescriptors?: any[];
}
export interface ResourceInfo {
    resourceId?: string;
    resourceName: string;
    resourceType: string;
    userId: number;
    username: string;
    resourceVersions: any[];
    baseUpcastResources: any[];
    coverImages?: string[];
    policies?: PolicyInfo[];
    status: number;
    latestVersion?: string;
    tags?: string[];
}
export interface ResourceVersionInfo {
    resourceId: string;
    resourceName: string;
    userId: number;
    versionId: string;
    version: string;
    resourceType: string;
    fileSha1: string;
    description?: string;
    dependencies: BaseResourceInfo[];
    upcastResources?: BaseResourceInfo[];
    resolveResources?: ResolveResource[];
    systemProperty?: object;
    customPropertyDescriptors?: object[];
    status: number;
}
export interface ResourceDependencyTree {
    resourceId: string;
    resourceName: string;
    version: string;
    versions: string[];
    versionRange: string;
    resourceType: string;
    versionId: string;
    fileSha1: string;
    baseUpcastResources: any[];
    dependencies: ResourceDependencyTree[];
}
export interface FlattenPresentableDependencyTree {
    nid?: string;
    resourceId: string;
    resourceName: string;
    version: string;
    versionRange: string;
    resourceType: string;
    versionId: string;
    fileSha1: string;
    deep: number;
    parentNid: string;
}
export interface PresentableDependencyTree {
    nid?: string;
    resourceId: string;
    resourceName: string;
    version: string;
    versionRange: string;
    resourceType: string;
    versionId: string;
    fileSha1: string;
    dependencies: PresentableDependencyTree[];
}
export interface FlattenPresentableAuthTree {
    nid: string;
    resourceId: string;
    resourceName: string;
    version: string;
    versionId: string;
    parentNid: string;
    deep: number;
}
export interface PresentableAuthTree {
    nid: string;
    resourceId: string;
    resourceName: string;
    version: string;
    versionId: string;
    contracts?: BaseContractInfo[];
    children: PresentableAuthTree[][];
}
export interface PresentableResolveResource {
    resourceId: string;
    resourceName: string;
    versions: Array<{
        version: string;
        versionId: string;
        dependencies: ResourceDependencyTree[];
    }>;
}
export interface INodeService {
    findOne(condition: object, ...args: any[]): Promise<NodeInfo>;
    findById(nodeId: number, ...args: any[]): Promise<NodeInfo>;
    findByDomain(nodeDomain: string, ...args: any[]): Promise<NodeInfo>;
    find(condition: object, ...args: any[]): Promise<NodeInfo[]>;
    findByIds(nodeIds: number[], ...args: any[]): Promise<NodeInfo[]>;
    findIntervalList(condition: object, skip?: number, limit?: number, projection?: string[], sort?: object): Promise<PageResult<NodeInfo>>;
    count(condition: object): Promise<number>;
    updateNodeInfo(nodeId: number, model: object): Promise<boolean>;
    createNode(options: CreateNodeOptions): Promise<NodeInfo>;
    findUserCreatedNodeCounts(userIds: number[]): any;
    searchIntervalListByTags(condition: object, tagIds?: number[], options?: findOptions<NodeInfo>): Promise<PageResult<NodeInfo>>;
    /**
     * 设置标签
     * @param nodeId
     * @param tagInfo
     */
    setTag(nodeId: number, tagInfos: TagInfo[]): Promise<boolean>;
    /**
     * 取消设置Tag
     * @param nodeId
     * @param tagInfo
     */
    unsetTag(nodeId: number, tagInfo: TagInfo): Promise<boolean>;
    /**
     * 更新节点详情
     * @param nodeId
     * @param model
     */
    updateNodeDetailInfo(nodeId: number, model: Partial<NodeDetailInfo>): Promise<boolean>;
}
export interface IPresentableService {
    createPresentable(options: CreatePresentableOptions): Promise<PresentableInfo>;
    findOne(condition: object, ...args: any[]): Promise<PresentableInfo>;
    findById(presentableId: string, ...args: any[]): Promise<PresentableInfo>;
    find(condition: object, ...args: any[]): Promise<PresentableInfo[]>;
    findByIds(presentableIds: string[], ...args: any[]): Promise<PresentableInfo[]>;
    findIntervalList(condition: object, skip?: number, limit?: number, projection?: string[], sort?: object): Promise<PageResult<PresentableInfo>>;
    searchIntervalList(condition: object, keywords?: string, options?: findOptions<PresentableInfo>): any;
    count(condition: object): Promise<number>;
    updatePresentable(presentableInfo: PresentableInfo, options: UpdatePresentableOptions): Promise<PresentableInfo>;
    updateOnlineStatus(presentableInfo: PresentableInfo, onlineStatus: PresentableOnlineStatusEnum): Promise<boolean>;
    updatePresentableVersion(presentableInfo: PresentableInfo, version: string, resourceVersionId: string): Promise<boolean>;
    fillPresentablePolicyInfo(presentables: PresentableInfo[]): Promise<PresentableInfo[]>;
    fillPresentableVersionProperty(presentables: PresentableInfo[], isLoadResourceCustomPropertyDescriptors: boolean, isLoadPresentableRewriteProperty: boolean): Promise<PresentableInfo[]>;
}
export interface IOutsideApiService {
    getResourceInfo(resourceIdOrName: string, options?: object): Promise<ResourceInfo>;
    getResourceVersionInfo(resourceVersionId: string, projection?: string[]): Promise<ResourceVersionInfo>;
    getResourceListByIds(resourceIds: string[], options?: object): Promise<ResourceInfo[]>;
    getResourceListByNames(resourceNames: string[], options?: object): Promise<ResourceInfo[]>;
    getResourceVersionList(versionIds: string[], options?: object): Promise<ResourceVersionInfo[]>;
    getObjectInfo(objectIdOrName: string, options?: object): Promise<ObjectStorageInfo>;
    getObjectListByFullNames(objectNames: string[], options?: object): Promise<ObjectStorageInfo[]>;
    getUserInfo(userId: number): Promise<FreelogUserInfo>;
    createPolicies(policyTexts: string[]): Promise<BasePolicyInfo[]>;
    getPolicies(policyIds: string[], subjectType: SubjectTypeEnum, projection: string[]): Promise<BasePolicyInfo[]>;
    batchSignNodeContracts(nodeId: any, subjects: SubjectInfo[]): Promise<ContractInfo[]>;
    getUserPresentableContracts(subjectId: string, licensorId: number, licenseeId: number, options?: object): Promise<ContractInfo[]>;
    signUserPresentableContract(userId: any, subjectInfo: SubjectInfo): Promise<ContractInfo>;
    getContractByContractIds(contractIds: string[], options?: object): Promise<ContractInfo[]>;
    getResourceVersionAuthResults(resourceVersionIds: string[], options?: object): Promise<any[]>;
    getFileStream(fileSha1: string): Promise<any>;
    getResourceDependencyTree(resourceIdOrName: string, options?: object): Promise<ResourceDependencyTree[]>;
    getObjectDependencyTree(objectIdOrName: string, options?: object): Promise<ObjectDependencyTreeInfo[]>;
}
export interface IPresentableAuthService {
    contractAuth(subjectId: any, contracts: ContractInfo[]): SubjectAuthResult;
    presentableAuth(presentableInfo: PresentableInfo, presentableVersionAuthTree: FlattenPresentableAuthTree[]): Promise<SubjectAuthResult>;
    presentableNodeSideAuth(presentableInfo: PresentableInfo, presentableAuthTree: FlattenPresentableAuthTree[]): Promise<SubjectAuthResult>;
    presentableUpstreamAuth(presentableInfo: PresentableInfo, presentableAuthTree: FlattenPresentableAuthTree[]): Promise<SubjectAuthResult>;
    presentableNodeSideAndUpstreamAuth(presentableInfo: PresentableInfo, presentableAuthTree: FlattenPresentableAuthTree[]): Promise<SubjectAuthResult>;
}
export interface IPresentableVersionService {
    findOne(condition: object, ...args: any[]): Promise<PresentableVersionInfo>;
    findById(presentableId: string, version: string, ...args: any[]): Promise<PresentableVersionInfo>;
    findByIds(presentableVersionIds: string[], ...args: any[]): Promise<PresentableVersionInfo[]>;
    find(condition: object, ...args: any[]): Promise<PresentableVersionInfo[]>;
    createOrUpdatePresentableVersion(presentableInfo: PresentableInfo, resourceVersionId: string): Promise<PresentableVersionInfo>;
    convertPresentableAuthTreeWithContracts(presentableInfo: PresentableInfo, flattenAuthTree: FlattenPresentableAuthTree[]): Promise<PresentableAuthTree[][]>;
    convertPresentableDependencyTree(flattenDependencies: FlattenPresentableDependencyTree[], startNid: string, isContainRootNode: boolean, maxDeep: number): PresentableDependencyTree[];
    updatePresentableRewriteProperty(presentableInfo: PresentableInfo, presentableRewriteProperty: any[]): Promise<boolean>;
}
export interface IPresentableAuthResponseHandler {
    handle(presentableInfo: PresentableInfo, presentableVersionInfo: PresentableVersionInfo, authResult: SubjectAuthResult, parentNid?: string, subResourceIdOrName?: string): Promise<void>;
    subjectAuthFailedResponseHandle(authResult: SubjectAuthResult): any;
    subjectAuthProcessExceptionHandle(error: any): any;
}
export interface IEventHandler {
    handle(...args: any[]): Promise<any>;
}
export interface IBaseService<T> {
    find(condition: object, options?: findOptions<T>): Promise<T[]>;
    findOne(condition: object, options?: findOptions<T>): Promise<T>;
    findIntervalList(condition: object, options?: findOptions<T>): Promise<PageResult<T>>;
    count(condition: object): Promise<number>;
}
export interface ITageService extends IBaseService<TagInfo> {
    create(tags: string[], type: 1 | 2): Promise<TagInfo[]>;
    /**
     * 更新tag
     * @param tagInfo
     * @param model
     */
    updateOne(tagInfo: TagInfo, model: object): Promise<boolean>;
    /**
     * 设置标签自增(自减)数量.
     * @param tagInfo
     * @param number
     */
    setTagAutoIncrementCount(tagInfo: TagInfo, number: 1 | -1): Promise<boolean>;
    /**
     * 设置标签自增(自减)数量.
     * @param tagInfo
     * @param number
     */
    setTagAutoIncrementCounts(tagIds: number[], number: 1 | -1): Promise<boolean>;
}
export interface TagInfo {
    /**
     * 标签ID
     */
    tagId: number;
    /**
     * 标签名称
     */
    tag: string;
    /**
     * 标签类型 1:手动 2:自动
     */
    type: 1 | 2;
    /**
     * 总设置数量
     */
    totalSetCount: number;
    status: 0;
}
