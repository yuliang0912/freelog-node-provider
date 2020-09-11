import { ValidatorResult } from 'jsonschema';
import { ContractStatusEnum, PresentableAuthStatusEnum, PresentableOnlineStatusEnum, SubjectTypeEnum, IdentityType } from './enum';
import { SubjectAuthResult } from "./auth-interface";
import { ObjectDependencyTreeInfo } from "./test-node-interface";
export interface PageResult {
    page: number;
    pageSize: number;
    totalItem: number;
    dataList: any[];
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
    intro?: string;
    coverImages: string[];
    onlineStatus: PresentableOnlineStatusEnum;
    authStatus: PresentableAuthStatusEnum;
}
export interface PresentableVersionInfo {
    presentableId: string;
    version: string;
    resourceVersionId: string;
    resourceSystemProperty: object;
    resourceCustomPropertyDescriptors?: any[];
    presentableRewriteProperty?: any[];
    versionProperty: object;
    authTree: PresentableVersionAuthTreeInfo[];
    dependencyTree: PresentableVersionDependencyTreeInfo[];
}
export interface UserInfo {
    userId: number;
    username: string;
}
export interface PolicyInfo {
    policyId: string;
    policyName?: string;
    policyText?: string;
    status?: number;
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
    intro: string;
    tags: string[];
    policies: PolicyInfo[];
    nodeInfo: NodeInfo;
    resolveResources: ResolveResource[];
    coverImages: string[];
}
export interface UpdatePresentableOptions {
    intro?: string;
    presentableTitle?: string;
    tags?: string[];
    resolveResources?: ResolveResource[];
    addPolicies?: PolicyInfo[];
    updatePolicies?: PolicyInfo[];
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
    licenseeIdentityType: IdentityType;
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
    customProperty?: object;
}
export interface ResourceInfo {
    resourceId?: string;
    resourceName: string;
    resourceType: string;
    userId: number;
    username: string;
    resourceVersions: any[];
    baseUpcastResources: object[];
    intro?: string;
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
export interface ResourceDependencyTreeInfo {
    resourceId: string;
    resourceName: string;
    version: string;
    versions: string[];
    versionRange: string;
    resourceType: string;
    versionId: string;
    fileSha1: string;
    baseUpcastResources: any[];
    dependencies: ResourceDependencyTreeInfo[];
}
export interface PresentableVersionDependencyTreeInfo {
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
    dependencies?: PresentableVersionDependencyTreeInfo[];
}
export interface PresentableVersionAuthTreeInfo {
    resourceId: string;
    resourceName: string;
    version: string;
    versionId: string;
    fileSha1: string;
    parentVersionId: string;
    deep: number;
    authContractIds: string[];
}
export interface INodeService {
    findOne(condition: object, ...args: any[]): Promise<NodeInfo>;
    findById(nodeId: number, ...args: any[]): Promise<NodeInfo>;
    find(condition: object, ...args: any[]): Promise<NodeInfo[]>;
    findByIds(nodeIds: number[], ...args: any[]): Promise<NodeInfo[]>;
    findPageList(condition: object, page: number, pageSize: number, projection: string[], orderBy: object): Promise<PageResult>;
    count(condition: object): Promise<number>;
    updateNodeInfo(nodeInfo: NodeInfo, model: object): Promise<boolean>;
    createNode(options: CreateNodeOptions): Promise<NodeInfo>;
}
export interface IPresentableService {
    createPresentable(options: CreatePresentableOptions): Promise<PresentableInfo>;
    findOne(condition: object, ...args: any[]): Promise<PresentableInfo>;
    findById(presentableId: string, ...args: any[]): Promise<PresentableInfo>;
    find(condition: object, ...args: any[]): Promise<PresentableInfo[]>;
    findByIds(presentableIds: string[], ...args: any[]): Promise<PresentableInfo[]>;
    findPageList(condition: object, page: number, pageSize: number, projection: string[], orderBy: object): Promise<PageResult>;
    count(condition: object): Promise<number>;
    updatePresentable(presentableInfo: PresentableInfo, options: UpdatePresentableOptions): Promise<PresentableInfo>;
}
export interface IOutsideApiService {
    getResourceInfo(resourceIdOrName: string, options?: object): Promise<ResourceInfo>;
    getResourceVersionInfo(resourceVersionId: string, projection?: string[]): Promise<ResourceVersionInfo>;
    getResourceVersionByVersionIds(versionIds: string[], options?: object): Promise<ResourceVersionInfo[]>;
    getResourceListByIds(resourceIds: string[], options?: object): Promise<ResourceInfo[]>;
    getResourceListByNames(resourceNames: string[], options?: object): Promise<ResourceInfo[]>;
    getObjectInfo(objectIdOrName: string, options?: object): Promise<ObjectStorageInfo>;
    getObjectListByFullNames(objectNames: string[], options?: object): Promise<ObjectStorageInfo[]>;
    getUserInfo(userId: number): Promise<UserInfo>;
    getPolicies(policyIds: string[], subjectType: SubjectTypeEnum, projection: string[]): Promise<PolicyInfo[]>;
    batchSignNodeContracts(nodeId: any, subjects: SubjectInfo[]): Promise<ContractInfo[]>;
    getUserPresentableContracts(subjectId: string, licensorId: number, licenseeId: number, options?: object): Promise<ContractInfo[]>;
    signUserPresentableContract(userId: any, subjectInfo: SubjectInfo): Promise<ContractInfo>;
    getContractByContractIds(contractIds: string[], options?: object): Promise<ContractInfo[]>;
    getResourceVersionAuthResults(resourceVersionIds: string[]): Promise<any[]>;
    getFileStream(fileSha1: string): Promise<any>;
    getResourceDependencyTree(resourceIdOrName: string, options?: object): Promise<ResourceDependencyTreeInfo[]>;
    getObjectDependencyTree(objectIdOrName: string, options?: object): Promise<ObjectDependencyTreeInfo[]>;
}
export interface IPresentableAuthService {
    contractAuth(subjectId: any, contracts: ContractInfo[]): SubjectAuthResult;
    presentableAuth(presentableInfo: PresentableInfo, presentableVersionAuthTree: PresentableVersionAuthTreeInfo[]): Promise<SubjectAuthResult>;
}
export interface IPresentableVersionService {
    findOne(condition: object, ...args: any[]): Promise<PresentableVersionInfo>;
    findById(presentableId: string, version: string, ...args: any[]): Promise<PresentableVersionInfo>;
    createOrUpdatePresentableVersion(presentableInfo: PresentableInfo, resourceVersionId: string): Promise<PresentableVersionInfo>;
    buildPresentableDependencyTree(flattenDependencies: Array<any>, startNid: string, isContainRootNode: boolean, maxDeep: number): PresentableVersionDependencyTreeInfo[];
}
export interface IEventHandler {
    handle(...args: any[]): Promise<any>;
}
/**
 * 针对object做校验的基础接口
 */
export interface IJsonSchemaValidate {
    validate(instance: object[] | object, ...args: any[]): ValidatorResult;
}
