/**
 * 标的物类型
 */
export enum SubjectTypeEnum {
    Resource = 1,
    Presentable = 2,
    UserGroup = 3
}

/**
 * 合同类型
 */
export enum IdentityType {
    Resource = 1,
    Node,
    ClientUser
}

export enum ContractStatusEnum {
    /**
     * 正常生效中
     */
    Executed = 0,

    /**
     * 合同已终止(未授权,并且不再接受新事件)
     * @type {number}
     */
    Terminated = 1,

    /**
     * 异常的,例如签名不对,冻结等.
     * @type {number}
     */
    Exception = 2
}

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