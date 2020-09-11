import { PresentableInfo } from "./interface";
export declare enum TestResourceOriginType {
    Resource = "resource",
    Object = "object"
}
export declare enum TestNodeOperationEnum {
    Add = "add",
    Alter = "alter",
    ActivateTheme = "activate_theme"
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
    intro?: string;
}
export interface ReplaceOptionInfo {
    replaced: CandidateInfo;
    replacer: CandidateInfo;
    scopes: CandidateInfo[][];
}
export interface BaseTestRuleInfo {
    text: string;
    operation: TestNodeOperationEnum;
    presentableName?: string;
    themeName?: string;
    tags: string[] | null;
    replaces?: ReplaceOptionInfo[];
    online: boolean | null;
    candidate?: CandidateInfo;
}
export interface TestRuleEfficientInfo {
    type: 'setTags' | 'setOnlineStatus' | 'replace';
    count: number;
}
export interface TestRuleMatchInfo {
    id: string;
    isValid: boolean;
    matchErrors: string[];
    effectiveMatchCount: number;
    ruleInfo: BaseTestRuleInfo;
    presentableInfo?: PresentableInfo;
    testResourceOriginInfo?: TestResourceOriginInfo;
    entityDependencyTree?: TestResourceDependencyTree[];
    tags?: {
        tags: string[];
        source: string;
    };
    onlineStatus?: {
        status: number;
        source: string;
    };
    efficientCountInfos: TestRuleEfficientInfo[];
}
export interface TestResourceDependencyTree {
    nid?: string;
    id: string;
    name: string;
    type: string;
    version: string;
    versionId: string;
    resourceType: string;
    dependencies: TestResourceDependencyTree[];
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
    resourceName: string;
    contracts: BaseContractInfo[];
}
export interface DifferenceInfo {
    onlineStatusInfo?: {
        isOnline: number;
        ruleId: string;
    };
    userDefinedTagInfo?: {
        tags: string[];
        ruleId: string;
    };
}
export interface TestResourceInfo {
    nodeId: number;
    userId: number;
    testResourceId: string;
    testResourceName: string;
    coverImages: string[];
    associatedPresentableId?: string;
    resourceType: string;
    intro?: string;
    originInfo: TestResourceOriginInfo;
    differenceInfo: DifferenceInfo;
    resolveResources?: ResolveResourceInfo[];
    ruleId?: string;
    status?: number;
}
