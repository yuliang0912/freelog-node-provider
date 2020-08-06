"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PresentableAuthStatusEnum = exports.PresentableOnlineStatusEnum = exports.ContractStatusEnum = exports.IdentityType = exports.SubjectTypeEnum = void 0;
/**
 * 标的物类型
 */
var SubjectTypeEnum;
(function (SubjectTypeEnum) {
    SubjectTypeEnum[SubjectTypeEnum["Resource"] = 1] = "Resource";
    SubjectTypeEnum[SubjectTypeEnum["Presentable"] = 2] = "Presentable";
    SubjectTypeEnum[SubjectTypeEnum["UserGroup"] = 3] = "UserGroup";
})(SubjectTypeEnum = exports.SubjectTypeEnum || (exports.SubjectTypeEnum = {}));
/**
 * 合同类型
 */
var IdentityType;
(function (IdentityType) {
    IdentityType[IdentityType["Resource"] = 1] = "Resource";
    IdentityType[IdentityType["Node"] = 2] = "Node";
    IdentityType[IdentityType["ClientUser"] = 3] = "ClientUser";
})(IdentityType = exports.IdentityType || (exports.IdentityType = {}));
var ContractStatusEnum;
(function (ContractStatusEnum) {
    /**
     * 正常生效中
     */
    ContractStatusEnum[ContractStatusEnum["Executed"] = 0] = "Executed";
    /**
     * 合同已终止(未授权,并且不再接受新事件)
     * @type {number}
     */
    ContractStatusEnum[ContractStatusEnum["Terminated"] = 1] = "Terminated";
    /**
     * 异常的,例如签名不对,冻结等.
     * @type {number}
     */
    ContractStatusEnum[ContractStatusEnum["Exception"] = 2] = "Exception";
})(ContractStatusEnum = exports.ContractStatusEnum || (exports.ContractStatusEnum = {}));
var PresentableOnlineStatusEnum;
(function (PresentableOnlineStatusEnum) {
    /**
     * 下线
     * @type {number}
     */
    PresentableOnlineStatusEnum[PresentableOnlineStatusEnum["Offline"] = 0] = "Offline";
    /**
     * 上线
     */
    PresentableOnlineStatusEnum[PresentableOnlineStatusEnum["Online"] = 1] = "Online";
})(PresentableOnlineStatusEnum = exports.PresentableOnlineStatusEnum || (exports.PresentableOnlineStatusEnum = {}));
var PresentableAuthStatusEnum;
(function (PresentableAuthStatusEnum) {
    /**
     * 未知
     */
    PresentableAuthStatusEnum[PresentableAuthStatusEnum["Unknown"] = 0] = "Unknown";
    /**
     * 节点侧合约授权失败
     * @type {number}
     */
    PresentableAuthStatusEnum[PresentableAuthStatusEnum["NodeSideContractAuthFailed"] = 1] = "NodeSideContractAuthFailed";
    /**
     * 资源侧合约授权失败
     * @type {number}
     */
    PresentableAuthStatusEnum[PresentableAuthStatusEnum["ResourceSideContractAuthFailed"] = 2] = "ResourceSideContractAuthFailed";
    /**
     * 节点侧合约授权通过
     * @type {number}
     */
    PresentableAuthStatusEnum[PresentableAuthStatusEnum["NodeSideContractAuthPassed"] = 4] = "NodeSideContractAuthPassed";
    /**
     * 资源侧合约授权通过
     * @type {number}
     */
    PresentableAuthStatusEnum[PresentableAuthStatusEnum["ResourceSideContractAuthPassed"] = 8] = "ResourceSideContractAuthPassed";
})(PresentableAuthStatusEnum = exports.PresentableAuthStatusEnum || (exports.PresentableAuthStatusEnum = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW51bS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9lbnVtLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBOztHQUVHO0FBQ0gsSUFBWSxlQUlYO0FBSkQsV0FBWSxlQUFlO0lBQ3ZCLDZEQUFZLENBQUE7SUFDWixtRUFBZSxDQUFBO0lBQ2YsK0RBQWEsQ0FBQTtBQUNqQixDQUFDLEVBSlcsZUFBZSxHQUFmLHVCQUFlLEtBQWYsdUJBQWUsUUFJMUI7QUFFRDs7R0FFRztBQUNILElBQVksWUFJWDtBQUpELFdBQVksWUFBWTtJQUNwQix1REFBWSxDQUFBO0lBQ1osK0NBQUksQ0FBQTtJQUNKLDJEQUFVLENBQUE7QUFDZCxDQUFDLEVBSlcsWUFBWSxHQUFaLG9CQUFZLEtBQVosb0JBQVksUUFJdkI7QUFFRCxJQUFZLGtCQWlCWDtBQWpCRCxXQUFZLGtCQUFrQjtJQUMxQjs7T0FFRztJQUNILG1FQUFZLENBQUE7SUFFWjs7O09BR0c7SUFDSCx1RUFBYyxDQUFBO0lBRWQ7OztPQUdHO0lBQ0gscUVBQWEsQ0FBQTtBQUNqQixDQUFDLEVBakJXLGtCQUFrQixHQUFsQiwwQkFBa0IsS0FBbEIsMEJBQWtCLFFBaUI3QjtBQUVELElBQVksMkJBWVg7QUFaRCxXQUFZLDJCQUEyQjtJQUVuQzs7O09BR0c7SUFDSCxtRkFBVyxDQUFBO0lBRVg7O09BRUc7SUFDSCxpRkFBVSxDQUFBO0FBQ2QsQ0FBQyxFQVpXLDJCQUEyQixHQUEzQixtQ0FBMkIsS0FBM0IsbUNBQTJCLFFBWXRDO0FBRUQsSUFBWSx5QkE4Qlg7QUE5QkQsV0FBWSx5QkFBeUI7SUFFakM7O09BRUc7SUFDSCwrRUFBVyxDQUFBO0lBRVg7OztPQUdHO0lBQ0gscUhBQThCLENBQUE7SUFFOUI7OztPQUdHO0lBQ0gsNkhBQWtDLENBQUE7SUFFbEM7OztPQUdHO0lBQ0gscUhBQThCLENBQUE7SUFFOUI7OztPQUdHO0lBQ0gsNkhBQWtDLENBQUE7QUFDdEMsQ0FBQyxFQTlCVyx5QkFBeUIsR0FBekIsaUNBQXlCLEtBQXpCLGlDQUF5QixRQThCcEMifQ==