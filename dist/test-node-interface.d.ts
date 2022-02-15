import { PresentableInfo } from './interface';
import { SubjectAuthResult } from './auth-interface';
import { FreelogContext, FreelogUserInfo, PageResult } from 'egg-freelog-base';
export declare enum TestResourceOriginType {
    Resource = "resource",
    Object = "object"
}
export declare enum TestNodeOperationEnum {
    Add = "add",
    Alter = "alter",
    ActivateTheme = "activate_theme",
    Comment = "comment"
}
export declare enum ActionOperationEnum {
    SetLabels = "set_labels",
    Replace = "replace",
    Online = "online",
    SetTitle = "set_title",
    SetCover = "set_cover",
    AddAttr = "add_attr",
    DeleteAttr = "delete_attr",
    Comment = "comment"
}
export interface BaseTestResourceOriginInfo {
    name: string;
    type: TestResourceOriginType;
}
export interface CandidateInfo extends BaseTestResourceOriginInfo {
    versionRange?: string;
}
export interface TestResourceOriginInfo extends BaseTestResourceOriginInfo {
    id: string;
    version?: string;
    versions?: string[];
    versionRange?: string;
    coverImages?: string[];
    resourceType: string;
    ownerUserId?: number;
}
export interface TestResourcePropertyInfo {
    key: string;
    value: string;
    remark: string;
    isRuleSet?: boolean;
    isRuleAdd?: boolean;
    authority: 1 | 2 | 4 | 6;
}
export interface BaseTestRuleInfo {
    text: string;
    operation: TestNodeOperationEnum;
    exhibitName?: string;
    candidate?: CandidateInfo;
    actions: Action<ContentSetLabel[] | ContentReplace | ContentSetOnline | ContentSetTitle | ContentSetCover | ContentSetAttr | ContentDeleteAttr | ContentComment>[];
}
export interface Action<T extends ContentSetLabel[] | ContentReplace | ContentSetOnline | ContentSetTitle | ContentSetCover | ContentSetAttr | ContentDeleteAttr | ContentComment> {
    operation: ActionOperationEnum;
    content: T;
}
export interface ContentSetLabel extends String {
}
export interface ContentSetOnline extends Boolean {
}
export interface ContentSetTitle extends String {
}
export interface ContentSetCover extends String {
}
export interface ContentSetAttr {
    key: string;
    value: string;
    description: string;
}
export interface ContentDeleteAttr {
    key: string;
}
export interface ContentComment extends String {
}
export interface ScopePathChain {
    name: string;
    type: string;
    version?: string;
}
export interface ContentReplace {
    replaced: CandidateInfo;
    replacer: CandidateInfo;
    scopes: CandidateInfo[][];
}
export interface TestRuleEfficientInfo {
    type: ActionOperationEnum | TestNodeOperationEnum;
    count: number;
}
export interface TestRuleMatchInfo {
    id: string;
    isValid: boolean;
    matchWarnings: string[];
    matchErrors: string[];
    ruleInfo: BaseTestRuleInfo;
    presentableInfo?: PresentableInfo;
    presentableRewriteProperty?: any[];
    testResourceOriginInfo?: TestResourceOriginInfo;
    entityDependencyTree?: TestResourceDependencyTree[];
    propertyMap?: Map<string, TestResourcePropertyInfo>;
    tagInfo?: {
        tags: string[];
        source: string;
    };
    onlineStatusInfo?: {
        status: number;
        source: string;
    };
    titleInfo?: {
        title: string;
        source: string;
    };
    coverInfo?: {
        coverImages: string[];
        source: string;
    };
    attrInfo?: {
        source: string;
    };
    efficientInfos: TestRuleEfficientInfo[];
    themeInfo: {
        isActivatedTheme: number;
        ruleId: string;
    };
    replaceRecords?: any[];
}
export interface BaseReplacedInfo {
    id: string;
    name: string;
    type: TestResourceOriginType;
}
export interface TestResourceAuthTree {
    nid: string;
    id: string;
    name: string;
    type: TestResourceOriginType;
    version: string;
    versionId: string;
    userId?: number;
    children: TestResourceAuthTree[];
}
export interface FlattenTestResourceAuthTree {
    nid: string;
    id: string;
    name: string;
    type: TestResourceOriginType;
    version: string;
    versionId: string;
    deep: number;
    parentNid: string;
}
export interface TestResourceDependencyTree {
    nid?: string;
    id: string;
    name: string;
    type: TestResourceOriginType;
    version: string;
    versionId: string;
    resourceType: string;
    dependencies: TestResourceDependencyTree[];
    replaceRecords?: BaseReplacedInfo[];
    versions?: string[];
    versionRange?: string;
}
export interface FlattenTestResourceDependencyTree {
    nid: string;
    id: string;
    name: string;
    type: TestResourceOriginType;
    version: string;
    versionId?: string;
    resourceType: string;
    deep: number;
    parentNid: string;
}
export interface ObjectDependencyTreeInfo {
    id: string;
    name: string;
    version?: string;
    versionId?: string;
    versionRange?: string;
    versions?: string[];
    type: 'object' | 'resource';
    resourceType: string;
    dependencies: ObjectDependencyTreeInfo[];
}
/**
 * 以下为DB数据结构
 */
export interface BaseContractInfo {
    policyId: string;
    contractId?: string;
}
export interface ResolveResourceInfo {
    resourceId: string;
    resourceName?: string;
    contracts: BaseContractInfo[];
    isSelf?: boolean;
}
export interface StateInfo {
    onlineStatusInfo?: {
        onlineStatus: number;
        ruleId: string;
    };
    tagInfo?: {
        tags: string[];
        ruleId: string;
    };
    titleInfo?: {
        title: string;
        ruleId: string;
    };
    coverInfo?: {
        coverImages: string[];
        ruleId: string;
    };
    themeInfo?: {
        isActivatedTheme: number;
        ruleId: string;
    };
    propertyInfo?: {
        testResourceProperty: TestResourcePropertyInfo[];
        ruleId: string;
    };
    replaceInfo?: {
        rootResourceReplacer?: TestResourceOriginInfo;
        replaceRecords: any[];
        ruleId: string;
    };
}
export interface ruleOperationInfo {
    ruleId: string;
    operations: string[];
}
export interface TestResourceInfo {
    nodeId: number;
    userId: number;
    testResourceId: string;
    testResourceName: string;
    associatedPresentableId?: string;
    resourceType: string;
    originInfo: TestResourceOriginInfo;
    stateInfo: StateInfo;
    resolveResources?: ResolveResourceInfo[];
    resolveResourceSignStatus: number;
    dependencyTree?: FlattenTestResourceDependencyTree[];
    authTree?: FlattenTestResourceAuthTree[];
    ruleId?: string;
    status?: number;
    rules: ruleOperationInfo[];
    createDate?: Date;
    updateDate?: Date;
}
export interface TestResourceTreeInfo {
    nodeId: number;
    testResourceId: string;
    testResourceName: string;
    resourceType: string;
    systemProperty?: object;
    resourceCustomPropertyDescriptors?: any[];
    presentableRewriteProperty?: any[];
    testResourceProperty?: object;
    dependencyTree: FlattenTestResourceDependencyTree[];
    authTree: FlattenTestResourceAuthTree[];
}
export interface NodeTestRuleInfo {
    nodeId: number;
    userId: number;
    ruleText: string;
    themeId?: string;
    testRules: any[];
    status?: number;
    matchResultDate?: Date;
    updateDate?: Date;
}
export interface TestRuleMatchResult {
    ruleId: string;
    isValid: boolean;
    matchErrors: string[];
    efficientInfos: TestRuleEfficientInfo[];
    associatedPresentableId?: string;
}
export interface IMatchTestRuleEventHandler {
    handle(nodeId: number, userInfo: FreelogUserInfo, isMandatoryMatch: boolean): Promise<void>;
}
export interface ITestNodeService {
    testResourceCount(condition: object): Promise<number>;
    findOneTestResource(condition: object, ...args: any[]): Promise<TestResourceInfo>;
    findTestResources(condition: object, ...args: any[]): Promise<TestResourceInfo[]>;
    findOneTestResourceTreeInfo(condition: object, ...args: any[]): Promise<TestResourceTreeInfo>;
    findTestResourceTreeInfos(condition: object, ...args: any[]): Promise<TestResourceTreeInfo[]>;
    findNodeTestRuleInfoById(nodeId: number, ...args: any[]): Promise<NodeTestRuleInfo>;
    matchAndSaveNodeTestRule(nodeId: number, testRuleText: string): Promise<NodeTestRuleInfo>;
    tryMatchNodeTestRule(nodeId: number, isMandatoryMatch: boolean): Promise<NodeTestRuleInfo>;
    updateTestResource(testResource: TestResourceInfo, resolveResources: ResolveResourceInfo[]): Promise<TestResourceInfo>;
    findIntervalResourceList(condition: object, skip: number, limit: number, projection: string[], sort?: object): Promise<PageResult<TestResourceInfo>>;
    searchTestResourceTreeInfos(nodeId: number, keywords: string, resourceType: string, omitResourceType: string): Promise<TestResourceTreeInfo[]>;
    preExecutionNodeTestRule(nodeId: number, testRuleText: string): Promise<TestRuleMatchInfo[]>;
    matchTestResourceTreeInfos(nodeId: number, dependentEntityId: string, resourceType: string, omitResourceType: string): any;
}
export interface ITestResourceAuthService {
    testResourceAuth(testResourceInfo: TestResourceInfo, testResourceAuthTree: FlattenTestResourceAuthTree[]): Promise<SubjectAuthResult>;
    testResourceNodeSideAuth(testResourceInfo: TestResourceInfo, testResourceAuthTree: FlattenTestResourceAuthTree[]): Promise<SubjectAuthResult>;
    testResourceUpstreamAuth(testResourceInfo: TestResourceInfo, testResourceAuthTree: FlattenTestResourceAuthTree[]): Promise<SubjectAuthResult>;
}
export interface IActionHandler<T extends ContentSetLabel[] | ContentReplace | ContentSetOnline | ContentSetTitle | ContentSetCover | ContentSetAttr | ContentDeleteAttr | ContentComment> {
    handle(ctx: FreelogContext, testRuleInfo: TestRuleMatchInfo, action: Action<T>): Promise<boolean>;
}
export interface IOperationHandler {
    handle(testRuleList: TestRuleMatchInfo[], ...args: any[]): Promise<boolean>;
}
