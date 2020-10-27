import {ValidatorResult} from 'jsonschema';
import {
    ContractStatusEnum,
    PresentableAuthStatusEnum,
    PresentableOnlineStatusEnum,
    SubjectTypeEnum,
    IdentityType
} from './enum';
import {SubjectAuthResult} from "./auth-interface";
import {ObjectDependencyTreeInfo} from "./test-node-interface";

export interface PageResult<T> {
    page: number;
    pageSize: number;
    totalItem: number;
    dataList: T[];
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
    coverImages: string[],
    onlineStatus: PresentableOnlineStatusEnum,
    authStatus: PresentableAuthStatusEnum
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
    authTree: FlattenPresentableAuthTree[]
    dependencyTree: FlattenPresentableDependencyTree[];
}

export interface UserInfo {
    userId: number;
    username: string;
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

    // 甲方相关信息
    licensorId: string | number;
    licensorName: string;
    licensorOwnerId: number;
    licensorOwnerName: string;

    // 乙方相关信息
    licenseeId: string | number;
    licenseeName: string;
    licenseeOwnerId: number;
    licenseeOwnerName: string;
    licenseeIdentityType: IdentityType;

    // 标的物相关信息
    subjectId: string;
    subjectName: string;
    subjectType: SubjectTypeEnum;

    // 合同状态机部分
    fsmCurrentState?: string | null;
    fsmRunningStatus?: number;
    fsmDeclarations?: object;

    // 其他信息
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
    children: PresentableAuthTree[];
}

export interface PresentableResolveResource {
    resourceId: string;
    resourceName: string,
    versions: Array<{
        version: string;
        versionId: string;
        dependencies: ResourceDependencyTree[];
    }>
}

export interface INodeService {

    findOne(condition: object, ...args): Promise<NodeInfo>;

    findById(nodeId: number, ...args): Promise<NodeInfo>;

    findByDomain(nodeDomain: string, ...args): Promise<NodeInfo>;

    find(condition: object, ...args): Promise<NodeInfo[]>;

    findByIds(nodeIds: number[], ...args): Promise<NodeInfo[]>;

    findPageList(condition: object, page: number, pageSize: number, projection: string[], orderBy?: object): Promise<PageResult<NodeInfo>>;

    count(condition: object): Promise<number>;

    updateNodeInfo(nodeId: number, model: object): Promise<boolean>;

    createNode(options: CreateNodeOptions): Promise<NodeInfo>;
}

export interface IPresentableService {

    createPresentable(options: CreatePresentableOptions): Promise<PresentableInfo>;

    findOne(condition: object, ...args): Promise<PresentableInfo>;

    findById(presentableId: string, ...args): Promise<PresentableInfo>;

    find(condition: object, ...args): Promise<PresentableInfo[]>;

    findByIds(presentableIds: string[], ...args): Promise<PresentableInfo[]>;

    findPageList(condition: object, page: number, pageSize: number, projection: string[], orderBy: object): Promise<PageResult<PresentableInfo>>;

    findList(condition: object, page: number, pageSize: number, projection: string[], orderBy: object): Promise<PresentableInfo[]>;

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

    getUserInfo(userId: number): Promise<UserInfo>;

    createPolicies(policyTexts: string[]): Promise<BasePolicyInfo[]>;

    getPolicies(policyIds: string[], subjectType: SubjectTypeEnum, projection: string[]): Promise<BasePolicyInfo[]>;

    batchSignNodeContracts(nodeId, subjects: SubjectInfo[]): Promise<ContractInfo[]>;

    getUserPresentableContracts(subjectId: string, licensorId: number, licenseeId: number, options?: object): Promise<ContractInfo[]>;

    signUserPresentableContract(userId, subjectInfo: SubjectInfo): Promise<ContractInfo>;

    getContractByContractIds(contractIds: string[], options?: object): Promise<ContractInfo[]>;

    getResourceVersionAuthResults(resourceVersionIds: string[], options?: object): Promise<any[]>;

    getFileStream(fileSha1: string): Promise<any>;

    getResourceDependencyTree(resourceIdOrName: string, options?: object): Promise<ResourceDependencyTree[]>;

    getObjectDependencyTree(objectIdOrName: string, options?: object): Promise<ObjectDependencyTreeInfo[]>
}

export interface IPresentableAuthService {

    contractAuth(subjectId, contracts: ContractInfo[]): SubjectAuthResult;

    presentableAuth(presentableInfo: PresentableInfo, presentableVersionAuthTree: FlattenPresentableAuthTree[]): Promise<SubjectAuthResult>;

    presentableNodeSideAuth(presentableInfo: PresentableInfo, presentableAuthTree: FlattenPresentableAuthTree[]): Promise<SubjectAuthResult>;

    presentableUpstreamAuth(presentableInfo: PresentableInfo, presentableAuthTree: FlattenPresentableAuthTree[]): Promise<SubjectAuthResult>;
}

export interface IPresentableVersionService {

    findOne(condition: object, ...args): Promise<PresentableVersionInfo>;

    findById(presentableId: string, version: string, ...args): Promise<PresentableVersionInfo>;

    find(condition: object, ...args): Promise<PresentableVersionInfo[]>;

    createOrUpdatePresentableVersion(presentableInfo: PresentableInfo, resourceVersionId: string): Promise<PresentableVersionInfo>;

    convertPresentableAuthTree(flattenAuthTree: FlattenPresentableAuthTree[], startNid: string, isContainRootNode: boolean, maxDeep: number);

    convertPresentableDependencyTree(flattenDependencies: FlattenPresentableDependencyTree[], startNid: string, isContainRootNode: boolean, maxDeep: number): PresentableDependencyTree[];

    updatePresentableRewriteProperty(presentableInfo: PresentableInfo, presentableRewriteInfo: any[]): Promise<boolean>;
}

export interface IEventHandler {
    handle(...args): Promise<any>;
}

/**
 * 针对object做校验的基础接口
 */
export interface IJsonSchemaValidate {
    validate(instance: object[] | object, ...args): ValidatorResult;
}
