import {PresentableInfo} from "./interface";
import {SubjectAuthResult} from "./auth-interface";
import {PageResult} from 'egg-freelog-base'

export enum TestResourceOriginType {
    Resource = 'resource',
    Object = 'object'
}

export enum TestNodeOperationEnum {
    Add = 'add',
    Alter = 'alter',
    ActivateTheme = 'activate_theme'
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
    coverImages?: string[];
    resourceType: string;
    systemProperty?: object;
    customPropertyDescriptors?: any[];
    // _originInfo: ResourceInfo | ObjectStorageInfo //此处为resource或者object
}

export interface ReplaceOptionInfo {
    replaced: CandidateInfo;
    replacer: CandidateInfo;
    scopes: CandidateInfo[][];
    efficientCount: number;
}

export interface TestResourcePropertyRuleInfo {
    operation: 'add' | 'delete';
    key: string;
    value?: string;
    description?: string;
}

export interface TestResourcePropertyInfo {
    key: string;
    value: string;
    remark: string;
}

export interface BaseTestRuleInfo {
    text: string;
    operation: TestNodeOperationEnum;
    exhibitName?: string;
    themeName?: string;  // 此处理论上不应该存在. 激活的主题名称应该使用presentableName表示即可.需要规则编译器端调整
    labels: string[] | null; // null代表不操作此项,沿用展品的标签属性
    replaces?: ReplaceOptionInfo[];
    online: boolean | null; // null代表不操作此项,沿用展品的上下线状态
    cover?: string;
    title?: string;
    attrs?: TestResourcePropertyRuleInfo[];
    candidate?: CandidateInfo;
}

export interface TestRuleEfficientInfo {
    type: 'alter' | 'add' | 'setTags' | 'setOnlineStatus' | 'replace' | 'setAttr' | 'setCover' | 'setTitle' | 'activateTheme',
    count: number;
}

export interface TestRuleMatchInfo {
    id: string;
    isValid: boolean;
    matchErrors: string[];
    ruleInfo: BaseTestRuleInfo;

    // 展品比较特殊,比resource和object多了一层包装
    presentableInfo?: PresentableInfo;
    presentableRewriteProperty?: any[];

    testResourceOriginInfo?: TestResourceOriginInfo;
    entityDependencyTree?: TestResourceDependencyTree[];

    tagInfo?: { tags: string[], source: string };
    onlineStatusInfo?: { status: number, source: string };
    titleInfo?: { title: string, source: string };
    coverInfo?: { coverImages: string[], source: string };
    attrInfo?: { attrs: TestResourcePropertyInfo[] | null, source: string };
    efficientInfos: TestRuleEfficientInfo[];
    themeInfo: { isActivatedTheme: number, ruleId: string };
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
    userId: number;
}

export interface TestResourceDependencyTree {
    nid?: string;
    id: string;
    name: string;
    type: TestResourceOriginType;
    version: string;
    versionId: string;
    resourceType: string;
    fileSha1: string;
    replaceRecords?: BaseReplacedInfo[];
    dependencies: TestResourceDependencyTree[];
}

export interface FlattenTestResourceDependencyTree {
    nid: string;
    id: string;
    name: string;
    type: TestResourceOriginType;
    version: string;
    versionId: string;
    fileSha1: string;
    resourceType: string;
    deep: number;
    parentNid: string;
    userId?: number;
    // replaced?: BaseReplacedInfo;
}

export interface ObjectDependencyTreeInfo {
    id: string;
    name: string;
    version?: string;
    versionId?: string;
    versionRange?: string;
    versions?: string[];
    fileSha1: string;
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
}

export interface StateInfo {
    onlineStatusInfo?: { onlineStatus: number, ruleId: string },
    tagInfo?: { tags: string[], ruleId: string },
    titleInfo?: { title: string, ruleId: string },
    coverInfo?: { coverImages: string[], ruleId: string },
    themeInfo?: { isActivatedTheme: number, ruleId: string };
    propertyInfo?: {
        testResourceProperty: TestResourcePropertyInfo[], ruleId: string
    };
    replaceInfo?: {
        replaceRecords: any[], ruleId: string;
    }
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
}

export interface TestResourceTreeInfo {
    nodeId: number;
    testResourceId: string;
    testResourceName: string;
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
    handle(nodeId: number, isMandatoryMatch: boolean): Promise<void>;
}

export interface ITestNodeService {

    testResourceCount(condition: object): Promise<number>;

    findOneTestResource(condition: object, ...args): Promise<TestResourceInfo>;

    findTestResources(condition: object, ...args): Promise<TestResourceInfo[]>;

    findOneTestResourceTreeInfo(condition: object, ...args): Promise<TestResourceTreeInfo>;

    findTestResourceTreeInfos(condition: object, ...args): Promise<TestResourceTreeInfo[]>;

    findNodeTestRuleInfoById(nodeId: number, ...args): Promise<NodeTestRuleInfo>;

    matchAndSaveNodeTestRule(nodeId: number, testRuleText: string): Promise<NodeTestRuleInfo>;

    tryMatchNodeTestRule(nodeId: number, isMandatoryMatch: boolean): Promise<NodeTestRuleInfo>;

    updateTestResource(testResource: TestResourceInfo, resolveResources: ResolveResourceInfo[]): Promise<TestResourceInfo>;

    findIntervalResourceList(condition: object, skip: number, limit: number, projection: string[], sort?: object): Promise<PageResult<TestResourceInfo>>;

    searchTestResourceTreeInfos(nodeId: number, keywords: string): Promise<TestResourceTreeInfo[]>;
}

export interface ITestResourceAuthService {

    testResourceAuth(testResourceInfo: TestResourceInfo, testResourceAuthTree: FlattenTestResourceAuthTree[]): Promise<SubjectAuthResult>;

}
