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
