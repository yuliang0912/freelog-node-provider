export enum PresentableOnlineStatusEnum {

    /**
     * 下线
     * @type {number}
     */
    Offline = 0,

    /**
     * 上线
     */
    Online = 1,
}

export enum PresentableAuthStatusEnum {

    /**
     * 未知
     */
    Unknown = 0,

    /**
     * 节点侧合约授权失败
     * @type {number}
     */
    NodeSideContractAuthFailed = 1,

    /**
     * 资源侧合约授权失败
     * @type {number}
     */
    ResourceSideContractAuthFailed = 2,

    /**
     * 节点侧合约授权通过
     * @type {number}
     */
    NodeSideContractAuthPassed = 4,

    /**
     * 资源侧合约授权通过
     * @type {number}
     */
    ResourceSideContractAuthPassed = 8,
}

export enum NodeTestRuleMatchStatus {

    /**
     * 待处理
     */
    ToBePending = 0,

    /**
     * 规则处理中
     */
    Pending = 1,

    /**
     * 规则匹配失败
     */
    Failed = 2,

    /**
     * 规则匹配完成
     */
    Completed = 3,
}

// 1:上线 2:下线 4:冻结
export enum NodeStatusEnum {

    /**
     * 上线
     */
    Online = 1,

    /**
     * 下线
     */
    OffLine = 2,

    /**
     * 冻结
     */
    Freeze = 4

}

export enum NodeAuditStatus {

    /**
     * 未审核.
     */
    Unreviewed = 0,

    /**
     * 审核通过
     */
    Approved = 1,

    /**
     * 审核不通过
     */
    NotApproved = 2
}

export enum ServiceStateEnum {

    Active = 1,

    TestActive = 2
}

export enum ArticleTypeEnum {
    /**
     * 独立资源
     */
    IndividualResource = 1,

    /**
     * 组合资源
     */
    CombinationResource = 2,

    /**
     * 节点组合资源
     */
    NodeCombinationResource = 3,

    /**
     * 存储对象
     */
    StorageObject = 4
}
