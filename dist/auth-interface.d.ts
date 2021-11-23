/**
 * 授权码规则:
 * 以2开头的代表通过授权,例如200,201,202
 * 以3开头的代表标的物的合同方面存在问题或未通过授权
 * 以4开头的代表标的物本身存在问题,例如为找到标的物、标的物状态不对等错误
 * 以5开头的代表甲方或乙方存在问题,例如节点被冻结、未登陆(乙方用户认证失败)非法请求等错误
 * 以9开头代表API内部异常,例如内部API调用失败、代码异常、参数不全等错误
 */
import { SubjectTypeEnum, ISubjectAuthResult, SubjectAuthCodeEnum } from 'egg-freelog-base';
import { BasePolicyInfo, BaseResourceInfo, FlattenPresentableAuthTree, FlattenPresentableDependencyTree, ResolveResource } from './interface';
import { PresentableAuthStatusEnum, PresentableOnlineStatusEnum } from './enum';
import { TestResourceOriginInfo } from './test-node-interface';
/**
 * 授权出错时的责任方
 */
export declare enum BreachResponsibilityTypeEnum {
    /**
     * 无违约方
     */
    Default = 0,
    /**
     * 资源方
     */
    Resource = 1,
    /**
     * 节点
     */
    Node = 2,
    /**
     * C端消费者
     */
    ClientUser = 4,
    /**
     * 未知的
     */
    Unknown = 128
}
export declare class SubjectAuthResult implements ISubjectAuthResult {
    data: any;
    errorMsg: string;
    authCode: SubjectAuthCodeEnum;
    referee: SubjectTypeEnum;
    breachResponsibilityType: BreachResponsibilityTypeEnum;
    constructor(authCode?: SubjectAuthCodeEnum);
    setErrorMsg(errorMsg: string): this;
    setData(data: any): this;
    setReferee(subjectType: SubjectTypeEnum): this;
    setBreachResponsibilityType(breachResponsibilityType: BreachResponsibilityTypeEnum): this;
    setAuthCode(authCode: SubjectAuthCodeEnum): this;
    get isAuth(): boolean;
    toJSON(): {
        referee: SubjectTypeEnum;
        breachResponsibilityType: BreachResponsibilityTypeEnum;
        authCode: SubjectAuthCodeEnum;
        isAuth: boolean;
        data: any;
        errorMsg: string;
    };
}
export interface SubjectPolicyInfo {
    policyId: string;
    policyName: string;
    status: number;
}
export interface ISubjectBaseInfo {
    subjectId: string;
    subjectType: SubjectTypeEnum;
    subjectName: string;
    licensorId: string | number;
    licensorName: string;
    licensorOwnerId: number;
    licensorOwnerName: string;
    policies: SubjectPolicyInfo[];
    status: number;
    meta?: any;
}
/**
 * 展品标的物
 */
export interface PresentableSubjectInfo extends ISubjectBaseInfo {
    subjectTitle: string;
    version: string;
    resourceInfo: BaseResourceInfo;
    resolveResources: ResolveResource[];
    tags?: string[];
    coverImages: string[];
    onlineStatus: PresentableOnlineStatusEnum;
    authStatus: PresentableAuthStatusEnum;
}
export interface TestResourceSubjectInfo extends ISubjectBaseInfo {
    subjectTitle: string;
    version: string;
    entityInfo: TestResourceOriginInfo;
    tags?: string[];
    coverImages: string[];
    onlineStatus: PresentableOnlineStatusEnum;
}
export interface ExhibitsInfo {
    exhibitsId: string;
    exhibitsName: string;
    exhibitsTitle: string;
    exhibitsType: string;
    tags: string[];
    intro: string;
    coverImages: string[];
    version: string;
    onlineStatus: number;
    nodeId: number;
    userId: number;
    createDate: Date;
    updateDate: Date;
    policies: BasePolicyInfo[];
    mountEntityInfo?: ExhibitsMountEntityInfo;
}
export interface ExhibitsVersionInfo {
    exhibitsVersionId: string;
    exhibitsId: string;
    version: string;
    entityId: string;
    entitySystemProperty: object;
    entityCustomPropertyDescriptors?: any[];
    exhibitsRewriteProperty?: any[];
    exhibitsProperty: object;
    authTree: FlattenPresentableAuthTree[];
    dependencyTree: FlattenPresentableDependencyTree[];
}
export interface ExhibitsMountEntityInfo {
    entityId: string;
    entityName: string;
    entityType: string;
    entityOwnerId: number;
    entityOwnerName: string;
    otherInfo: {
        resourceType: string;
        [key: string]: string | number;
    };
}
