export declare enum PresentableOnlineStatusEnum {
    /**
     * 下线
     * @type {number}
     */
    Offline = 0,
    /**
     * 上线
     */
    Online = 1
}
export declare enum PresentableAuthStatusEnum {
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
    ResourceSideContractAuthPassed = 8
}
export declare enum NodeTestRuleMatchStatus {
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
    Completed = 3
}
export declare enum NodeStatus {
    /**
     * 正常.
     */
    Normal = 0,
    /**
     * 冻结
     */
    Freeze = 1
}
export declare enum NodeAuditStatus {
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
export declare enum ServiceStateEnum {
    Active = 1,
    TestActive = 2
}
