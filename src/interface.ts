import {ValidatorResult} from 'jsonschema';
import {
    ContractStatusEnum,
    PresentableAuthStatusEnum,
    PresentableOnlineStatusEnum,
    SubjectTypeEnum,
    IdentityType
} from './enum';

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
    resourceInfo: BaseResourceInfo
    resolveResources: ResolveResource[]
    tags?: string[];
    intro?: string;
    coverImages: string[],
    onlineStatus: PresentableOnlineStatusEnum,
    authStatus: PresentableAuthStatusEnum
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
    policies: PolicyInfo[],
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
    resolveResources?: object[];
    systemProperty?: object;
    customPropertyDescriptors?: object[];
    status: number;
}

export interface PresentableVersionDependencyTreeInfo {
    nid: string;
    resourceId: string;
    resourceName: string;
    version: string;
    versionRange: string;
    resourceType: string;
    versionId: string;
    deep: number;
    parentNid?: string;
}

export interface PresentableVersionAuthTreeInfo {
    resourceId: string;
    resourceName: string;
    version: string;
    versionId: string;
    parentVersionId?: string;
    deep: number;
}

export interface INodeService {

    findOne(condition: object, ...args): Promise<NodeInfo>;

    findById(nodeId: number, ...args): Promise<NodeInfo>;

    find(condition: object, ...args): Promise<NodeInfo[]>;

    findByIds(nodeIds: number[], ...args): Promise<NodeInfo[]>;

    findPageList(condition: object, page: number, pageSize: number, projection: string[], orderBy: object): Promise<NodeInfo[]>;

    count(condition: object): Promise<number>;

    updateNodeInfo(nodeInfo: NodeInfo, model: object): Promise<boolean>;

    createNode(options: CreateNodeOptions): Promise<NodeInfo>;
}

export interface IPresentableService {

    createPresentable(options: CreatePresentableOptions): Promise<PresentableInfo>;

    findOne(condition: object, ...args): Promise<PresentableInfo>;

    findById(presentableId: string, ...args): Promise<PresentableInfo>;

    find(condition: object, ...args): Promise<PresentableInfo[]>;

    findByIds(presentableIds: string[], ...args): Promise<PresentableInfo[]>;

    findPageList(condition: object, page: number, pageSize: number, projection: string[], orderBy: object): Promise<PresentableInfo[]>;

    count(condition: object): Promise<number>;

    updatePresentable(presentableInfo: PresentableInfo, options: UpdatePresentableOptions): Promise<PresentableInfo>;
}

export interface IOutsideApiService {

    getResourceInfo(resourceId: string): Promise<ResourceInfo>;

    getResourceVersionInfo(resourceVersionId: string, projection?: string[]): Promise<ResourceVersionInfo>;

    getUserInfo(userId: number): Promise<UserInfo>;

    getPolicies(policyIds: string[], subjectType: SubjectTypeEnum, projection: string[]): Promise<PolicyInfo[]>;

    batchSignNodeContracts(nodeId, subjects: SubjectInfo[]): Promise<ContractInfo[]>;
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
