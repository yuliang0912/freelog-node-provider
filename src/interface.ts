import {DefaulterIdentityTypeEnum, SubjectAuthResult} from './auth-interface';
import {ObjectDependencyTreeInfo} from './test-node-interface';
import {PresentableAuthStatusEnum, PresentableOnlineStatusEnum, ArticleTypeEnum} from './enum';
import {
    ContractLicenseeIdentityTypeEnum,
    ContractStatusEnum,
    FreelogUserInfo,
    SubjectTypeEnum,
    PageResult
} from 'egg-freelog-base';
import {EachMessagePayload} from 'kafkajs';

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
    authStatus?: ContractAuthStatusEnum;
}

export interface BaseResourceInfo {
    resourceId: string;
    resourceName: string;
    resourceOwnerId?: number;
    resourceType?: string[];
    versionRange?: string;
}

export interface ResolveResource {
    resourceId: string;
    resourceName?: string;
    contracts: BaseContractInfo[];
    isSelf?: boolean;
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
    contracts?: ContractInfo[];
    nodeId: number;
    userId: number;
    version: string;
    resourceInfo: BaseResourceInfo;
    resolveResources: ResolveResource[];
    tags?: string[];
    coverImages: string[];
    onlineStatus: PresentableOnlineStatusEnum;
    authStatus: PresentableAuthStatusEnum;
    createDate?: Date;
    updateDate?: Date;
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
    resourceType: string[];
    bucketId?: string;
    systemProperty?: object;
    customPropertyDescriptors?: any[];
}

export interface ResourceInfo {
    resourceId?: string;
    resourceName: string;
    resourceType: string[];
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
    resourceType: string[];
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
    resourceType: string[];
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
    resourceType: string[];
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
    resourceType: string[];
    versionId: string;
    fileSha1: string;
    dependencies: PresentableDependencyTree[];
}

export interface FlattenPresentableAuthTree {
    nid: string;
    resourceId: string;
    resourceName: string;
    resourceType?: string[];
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
    resourceType: string[];
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

    batchSetOrRemoveNodeTags(nodeIds: number[], tags: string[], setType: 1 | 2): Promise<boolean>;

    // searchIntervalListByTags(condition: object, tagNames?: string[], options?: findOptions<NodeInfo>): Promise<PageResult<NodeInfo>>;

    // /**
    //  * 设置标签
    //  * @param nodeInfo
    //  * @param tagNames
    //  */
    // setTag(nodeInfo: NodeInfo, tagNames: string[]): Promise<boolean>;
    //
    // /**
    //  * 取消设置Tag
    //  * @param nodeInfo
    //  * @param tagName
    //  */
    // unsetTag(nodeInfo: NodeInfo, tagName: string): Promise<boolean>;

    /**
     * 冻结或解冻节点
     * @param nodeInfo
     * @param reason
     * @param remark
     */
    freezeOrDeArchiveResource(nodeInfo: NodeInfo, reason: string, remark?: string): Promise<boolean>;

    /**
     * 批量查找节点冻结与解封记录
     * @param nodeIds
     * @param operationType
     * @param recordLimit
     */
    batchFindFreeOrRecoverRecords(nodeIds: number[], operationType?: 1 | 2, recordLimit?: number): Promise<any[]>;

    /**
     * 填充节点冻结原因
     * @param nodes
     */
    fillNodeFreezeReason(nodes: NodeInfo[]): Promise<NodeInfo[]>;
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

    updateOnlineStatus(presentableInfo: PresentableInfo, onlineStatus: PresentableOnlineStatusEnum, updatePolicies?: PolicyInfo[]): Promise<boolean>;

    updatePresentableVersion(presentableInfo: PresentableInfo, version: string, resourceVersionId: string): Promise<boolean>;

    fillPresentablePolicyInfo(presentables: PresentableInfo[], isTranslate?: boolean): Promise<PresentableInfo[]>;

    fillPresentableVersionProperty(presentables: PresentableInfo[], isLoadResourceCustomPropertyDescriptors: boolean, isLoadPresentableRewriteProperty: boolean): Promise<PresentableInfo[]>;

    fillPresentableResourceInfo(presentables: PresentableInfo[]): Promise<PresentableInfo[]>;

    fillPresentableResourceVersionInfo(presentables: PresentableInfo[]): Promise<PresentableInfo[]>;

    nodePresentableStatistics(nodeIds: number[]): Promise<Array<{ nodeId: number, count: number }>>;
}

export interface IOutsideApiService {

    getResourceInfo(resourceIdOrName: string, options?: object): Promise<ResourceInfo>;

    getResourceVersionInfo(resourceVersionId: string, projection?: string[]): Promise<ResourceVersionInfo>;

    getResourceListByIds(resourceIds: string[], options?: object): Promise<ResourceInfo[]>;

    getResourceListByNames(resourceNames: string[], options?: object): Promise<ResourceInfo[]>;

    getResourceVersionList(versionIds: string[], options?: object): Promise<ResourceVersionInfo[]>;

    getObjectInfo(objectIdOrName: string, options?: object): Promise<ObjectStorageInfo>;

    getObjectListByObjectIds(objectIds: string[], options?: object): Promise<ObjectStorageInfo[]>;

    getObjectListByFullNames(objectNames: string[], options?: object): Promise<ObjectStorageInfo[]>;

    getUserInfo(userId: number): Promise<FreelogUserInfo>;

    createPolicies(policyTexts: string[]): Promise<BasePolicyInfo[]>;

    getPolicies(policyIds: string[], subjectType: SubjectTypeEnum, projection: string[], isTranslate: boolean): Promise<BasePolicyInfo[]>;

    batchSignNodeContracts(nodeId, subjects: SubjectInfo[]): Promise<ContractInfo[]>;

    getUserPresentableContracts(subjectIds: string[], licenseeId: number, options?: object): Promise<ContractInfo[]>;

    signUserPresentableContract(userId, subjectInfo: SubjectInfo): Promise<ContractInfo>;

    getContractByContractIds(contractIds: string[], options?: object): Promise<ContractInfo[]>;

    getResourceVersionAuthResults(resourceVersionIds: string[], options?: object): Promise<any[]>;

    getResourceFileStream(versionId: string): Promise<any>;

    getSubResourceFile(resourceId: string, version: string, subResourceFile: string): Promise<any>;

    getObjectFileStream(objectId: string): Promise<any>;

    getSubObjectFile(objectId: string, subObjectFile: string): Promise<any>;

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

    batchDeleteTag(tagList: TagInfo[]): Promise<boolean>;

    /**
     * 设置标签自增(自减)数量.
     * @param tags
     * @param number
     */
    setTagAutoIncrementCounts(tags: string[], number: 1 | -1): Promise<boolean>;

    tagStatistics(tags: string[]): Promise<Array<{ tag: string, count: number }>>;
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
    // totalSetCount: number;

    /**
     * 创建人ID
     */
    createUserId: number;
}

/**
 * 展品信息
 */
export interface ExhibitInfo {
    exhibitId: string;
    exhibitName: string;
    exhibitTitle: string;
    exhibitSubjectType: SubjectTypeEnum; // 展品或展品组合
    tags: string[];
    coverImages: string[];
    version: string; // 默认使用的资源版本号
    status: number; // 备用
    onlineStatus: number;
    nodeId: number;
    userId: number;
    policies: BasePolicyInfo[];
    // createDate: Date;
    // updateDate: Date;
    articleInfo: MountArticleInfo; // article(作品)指广义上的资源(单品资源,组合资源,节点组合资源)+存储对象
    versionInfo?: ExhibitVersionInfo;
    createDate?: Date;
    updateDate?: Date;
    contracts?: ContractInfo[];
}


/**
 * 展品挂载的作品信息
 */
export interface MountArticleInfo {
    articleId: string;
    articleName: string;
    articleType: ArticleTypeEnum; // 1:独立资源 2:组合资源 3:节点组合资源 4:存储对象
    articleOwnerId: number;
    articleOwnerName: string;
    resourceType: string[];
    otherInfo?: {
        [key: string]: any;
    };
}

/**
 * 展品版本信息
 */
export interface ExhibitVersionInfo {
    exhibitId: string;
    version: string;
    articleId: string;
    articleSystemProperty?: {
        [key: string]: number | string | boolean | null | object;
    };
    articleCustomPropertyDescriptors?: any[];
    exhibitRewriteProperty?: any[];
    exhibitProperty?: {
        [key: string]: number | string | boolean | null | object;
    };
    authTree: ExhibitAuthNodeInfo[];
    dependencyTree: ExhibitDependencyNodeInfo[];
    // createDate: Date;
    // updateDate: Date;
}

export interface ExhibitAuthNodeInfo {
    nid: string; // 树节点ID
    articleId: string;
    articleName: string;
    articleType: ArticleTypeEnum;
    resourceType: string[];
    version: string;
    versionId: string;
    parentNid: string;
    deep: number;
}

export interface ExhibitDependencyNodeInfo {
    nid: string; // 树节点ID
    articleId: string;
    articleName: string;
    articleType: ArticleTypeEnum;
    version: string;
    versionRange: string;
    resourceType: string[];
    versionId: string;
    deep: number;
    parentNid: string;
}

//树节点ID
export interface ExhibitDependencyTree {
    nid: string;
    articleId: string;
    articleName: string;
    articleType: ArticleTypeEnum;
    version: string;
    versionRange: string;
    resourceType: string[];
    versionId: string;
    deep: number;
    parentNid: string;
    dependencies: ExhibitDependencyTree[];
}

export enum ContractAuthStatusEnum {
    /**
     * 只获得正式授权
     * @type {number}
     */
    Authorized = 1,

    /**
     * 只获得测试授权
     * @type {number}
     */
    TestNodeAuthorized = 2,

    /**
     * 未获得任何授权
     */
    Unauthorized = 128,
}

export interface IKafkaSubscribeMessageHandle {

    subscribeTopicName: string;

    consumerGroupId: string;

    messageHandle(payload: EachMessagePayload): Promise<void>;
}


export interface IContractAuthStatusChangedEventMessage {
    contractId: string;
    subjectId: string;
    subjectName: string;
    subjectType: SubjectTypeEnum;
    licenseeId: string | number;
    licenseeOwnerId: number;
    licensorId: string | number;
    licensorOwnerId: number;
    beforeAuthStatus: ContractAuthStatusEnum;
    afterAuthStatus: ContractAuthStatusEnum;
    contractStatus: ContractStatusEnum;
}

export interface ExhibitInsideAuthNode {
    resourceId: string;
    versionId: string;
    roleType: DefaulterIdentityTypeEnum; // 解决授权方的角色类型
    // 上游解决自身所用的合约ID集合,例如A解决B. 获取A的resolveResources.B.contractIds
    contractIds: string[];
    resolveVersionId: string; // 授权解决方版本ID
    // isIgnore: boolean; // 例如虽上抛但未实际使用或者作为授权树的结束节点(没有解决任何其他资源的)
}
