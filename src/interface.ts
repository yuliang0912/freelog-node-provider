import {SubjectAuthResult} from './auth-interface';
import {ObjectDependencyTreeInfo} from './test-node-interface';
import {PresentableAuthStatusEnum, PresentableOnlineStatusEnum} from './enum';
import {
    ContractLicenseeIdentityTypeEnum,
    ContractStatusEnum,
    FreelogUserInfo,
    SubjectTypeEnum,
    PageResult
} from 'egg-freelog-base';

export interface findOptions<T> {
    sort?: {
        [P in keyof T]?: 1 | -1 | boolean;
    },
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
    tags: string[];
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
    authTree: FlattenPresentableAuthTree[]
    dependencyTree: FlattenPresentableDependencyTree[];
}

export interface BasePolicyInfo {
    policyId: string;
    policyText: string;
    subjectType?: number;
    fsmDescriptionInfo: FsmDescriptionInfo;
    fsmDeclarationInfo?: any;
    translateInfo?: any;
}

export interface FsmDescriptionInfo {
    [stateName: string]: FsmStateDescriptionInfo;
}

export interface FsmStateDescriptionInfo {
    isAuth: boolean;
    isTestAuth: boolean;
    isInitial?: boolean;
    isTerminate?: boolean;
    serviceStates: string[];
    transitions: PolicyEventInfo[];
}

export interface PolicyEventInfo {
    code: string;
    service: string;
    name: string;
    eventId: string;
    toState: string;
    args?: {
        [paramName: string]: any;
    };
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
    licenseeIdentityType: ContractLicenseeIdentityTypeEnum;

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
    resourceType: string;
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
    resourceType: string;
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

    findIntervalList(condition: object, skip?: number, limit?: number, projection?: string[], sort?: object): Promise<PageResult<NodeInfo>>;

    count(condition: object): Promise<number>;

    updateNodeInfo(nodeId: number, model: object): Promise<boolean>;

    createNode(options: CreateNodeOptions): Promise<NodeInfo>;

    findUserCreatedNodeCounts(userIds: number[]);

    // searchIntervalListByTags(condition: object, tagNames?: string[], options?: findOptions<NodeInfo>): Promise<PageResult<NodeInfo>>;

    /**
     * 设置标签
     * @param nodeInfo
     * @param tagNames
     */
    setTag(nodeInfo: NodeInfo, tagNames: string[]): Promise<boolean>;

    /**
     * 取消设置Tag
     * @param nodeInfo
     * @param tagName
     */
    unsetTag(nodeInfo: NodeInfo, tagName: string): Promise<boolean>;

    /**
     * 冻结或解冻节点
     * @param nodeInfo
     * @param remark
     */
    freezeOrDeArchiveResource(nodeInfo: NodeInfo, remark: string): Promise<boolean>;

    findNodeFreezeRecords(nodeId: number, ...args): Promise<any>;
}

export interface IPresentableService {

    contractAppliedPresentable(nodeId: number, contractIds: string[]): Promise<any[]>;

    createPresentable(options: CreatePresentableOptions): Promise<PresentableInfo>;

    findOne(condition: object, ...args): Promise<PresentableInfo>;

    findById(presentableId: string, ...args): Promise<PresentableInfo>;

    find(condition: object, ...args): Promise<PresentableInfo[]>;

    findByIds(presentableIds: string[], ...args): Promise<PresentableInfo[]>;

    findIntervalList(condition: object, skip?: number, limit?: number, projection?: string[], sort?: object): Promise<PageResult<PresentableInfo>>;

    searchIntervalList(condition: object, keywords?: string, options?: findOptions<PresentableInfo>);

    count(condition: object): Promise<number>;

    updatePresentable(presentableInfo: PresentableInfo, options: UpdatePresentableOptions): Promise<PresentableInfo>;

    updateOnlineStatus(presentableInfo: PresentableInfo, onlineStatus: PresentableOnlineStatusEnum): Promise<boolean>;

    updatePresentableVersion(presentableInfo: PresentableInfo, version: string, resourceVersionId: string): Promise<boolean>;

    fillPresentablePolicyInfo(presentables: PresentableInfo[], isTranslate?: boolean): Promise<PresentableInfo[]>;

    fillPresentableVersionProperty(presentables: PresentableInfo[], isLoadResourceCustomPropertyDescriptors: boolean, isLoadPresentableRewriteProperty: boolean): Promise<PresentableInfo[]>;

    fillPresentableResourceInfo(presentables: PresentableInfo[]): Promise<PresentableInfo[]>;

    fillPresentableResourceVersionInfo(presentables: PresentableInfo[]): Promise<PresentableInfo[]>;
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

    getPolicies(policyIds: string[], subjectType: SubjectTypeEnum, projection: string[], isTranslate: boolean): Promise<BasePolicyInfo[]>;

    batchSignNodeContracts(nodeId, subjects: SubjectInfo[]): Promise<ContractInfo[]>;

    getUserPresentableContracts(subjectId: string, licensorId: number, licenseeId: number, options?: object): Promise<ContractInfo[]>;

    signUserPresentableContract(userId, subjectInfo: SubjectInfo): Promise<ContractInfo>;

    getContractByContractIds(contractIds: string[], options?: object): Promise<ContractInfo[]>;

    getResourceVersionAuthResults(resourceVersionIds: string[], options?: object): Promise<any[]>;

    getFileStream(fileSha1: string): Promise<any>;

    getSubResourceFile(resourceId: string, versionId: string, subResourceFile: string): Promise<any>;

    getSubObjectFile(objectId: string, subObjectFile: string): Promise<any>

    getResourceDependencyTree(resourceIdOrName: string, options?: object): Promise<ResourceDependencyTree[]>;

    getObjectDependencyTree(objectIdOrName: string, options?: object): Promise<ObjectDependencyTreeInfo[]>;

    getResourceVersionProperty(resourceId: string, version: string): Promise<object>;
}

export interface IPresentableAuthService {

    contractAuth(subjectId, contracts: ContractInfo[]): SubjectAuthResult;

    presentableAuth(presentableInfo: PresentableInfo, presentableVersionAuthTree: FlattenPresentableAuthTree[]): Promise<SubjectAuthResult>;

    presentableNodeSideAuth(presentableInfo: PresentableInfo, presentableAuthTree: FlattenPresentableAuthTree[]): Promise<SubjectAuthResult>;

    presentableUpstreamAuth(presentableInfo: PresentableInfo, presentableAuthTree: FlattenPresentableAuthTree[]): Promise<SubjectAuthResult>;

    presentableNodeSideAndUpstreamAuth(presentableInfo: PresentableInfo, presentableAuthTree: FlattenPresentableAuthTree[]): Promise<SubjectAuthResult>;
}

export interface IPresentableVersionService {

    findOne(condition: object, ...args): Promise<PresentableVersionInfo>;

    findById(presentableId: string, version: string, ...args): Promise<PresentableVersionInfo>;

    findByIds(presentableVersionIds: string[], ...args): Promise<PresentableVersionInfo[]>;

    find(condition: object, ...args): Promise<PresentableVersionInfo[]>;

    createOrUpdatePresentableVersion(presentableInfo: PresentableInfo, resourceVersionId: string, newVersion: string): Promise<PresentableVersionInfo>;

    // convertPresentableAuthTree(flattenAuthTree: FlattenPresentableAuthTree[], startNid: string, isContainRootNode: boolean, maxDeep: number);

    convertPresentableAuthTreeWithContracts(presentableInfo: PresentableInfo, flattenAuthTree: FlattenPresentableAuthTree[]): Promise<PresentableAuthTree[][]>;

    convertPresentableDependencyTree(flattenDependencies: FlattenPresentableDependencyTree[], startNid: string, isContainRootNode: boolean, maxDeep: number): PresentableDependencyTree[];

    updatePresentableRewriteProperty(presentableInfo: PresentableInfo, presentableRewriteProperty: any[]): Promise<boolean>;

    getRelationTree(presentableInfo: PresentableInfo, versionInfo: PresentableVersionInfo): Promise<any[]>;
}

export interface IPresentableAuthResponseHandler {

    handle(presentableInfo: PresentableInfo, presentableVersionInfo: PresentableVersionInfo, authResult: SubjectAuthResult, parentNid?: string, subResourceIdOrName?: string, subResourceFile?: string): Promise<void>;

    subjectAuthFailedResponseHandle(authResult: SubjectAuthResult);

    subjectAuthProcessExceptionHandle(error);
}

export interface IEventHandler {
    handle(...args): Promise<any>;
}

export interface IBaseService<T> {

    find(condition: object, options?: findOptions<T>): Promise<T[]>;

    findOne(condition: object, options?: findOptions<T>): Promise<T>;

    findIntervalList(condition: object, options?: findOptions<T>): Promise<PageResult<T>>;

    count(condition: object): Promise<number>;
}

export interface ITageService extends IBaseService<TagInfo> {

    create(tags: string[]): Promise<TagInfo[]>;

    /**
     * 更新tag
     * @param tagInfo
     * @param tagName
     */
    updateOne(tagInfo: TagInfo, tagName: string): Promise<boolean>;

    deleteTag(tagInfo: TagInfo): Promise<boolean>;

    /**
     * 设置标签自增(自减)数量.
     * @param tags
     * @param number
     */
    setTagAutoIncrementCounts(tags: string[], number: 1 | -1): Promise<boolean>;
}

export interface TagInfo {

    /**
     * 标签ID
     */
    tagId: string;

    /**
     * 标签名称
     */
    tagName: string;

    /**
     * 总设置数量
     */
    totalSetCount: number;

    /**
     * 创建人ID
     */
    createUserId: number;
}
