"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServiceStateEnum = exports.NodeAuditStatus = exports.NodeStatusEnum = exports.NodeTestRuleMatchStatus = exports.PresentableAuthStatusEnum = exports.PresentableOnlineStatusEnum = void 0;
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
var NodeTestRuleMatchStatus;
(function (NodeTestRuleMatchStatus) {
    /**
     * 待处理
     */
    NodeTestRuleMatchStatus[NodeTestRuleMatchStatus["ToBePending"] = 0] = "ToBePending";
    /**
     * 规则处理中
     */
    NodeTestRuleMatchStatus[NodeTestRuleMatchStatus["Pending"] = 1] = "Pending";
    /**
     * 规则匹配失败
     */
    NodeTestRuleMatchStatus[NodeTestRuleMatchStatus["Failed"] = 2] = "Failed";
    /**
     * 规则匹配完成
     */
    NodeTestRuleMatchStatus[NodeTestRuleMatchStatus["Completed"] = 3] = "Completed";
})(NodeTestRuleMatchStatus = exports.NodeTestRuleMatchStatus || (exports.NodeTestRuleMatchStatus = {}));
// 1:上线 2:下线 4:冻结
var NodeStatusEnum;
(function (NodeStatusEnum) {
    /**
     * 上线
     */
    NodeStatusEnum[NodeStatusEnum["Online"] = 1] = "Online";
    /**
     * 下线
     */
    NodeStatusEnum[NodeStatusEnum["OffLine"] = 2] = "OffLine";
    /**
     * 冻结
     */
    NodeStatusEnum[NodeStatusEnum["Freeze"] = 4] = "Freeze";
})(NodeStatusEnum = exports.NodeStatusEnum || (exports.NodeStatusEnum = {}));
var NodeAuditStatus;
(function (NodeAuditStatus) {
    /**
     * 未审核.
     */
    NodeAuditStatus[NodeAuditStatus["Unreviewed"] = 0] = "Unreviewed";
    /**
     * 审核通过
     */
    NodeAuditStatus[NodeAuditStatus["Approved"] = 1] = "Approved";
    /**
     * 审核不通过
     */
    NodeAuditStatus[NodeAuditStatus["NotApproved"] = 2] = "NotApproved";
})(NodeAuditStatus = exports.NodeAuditStatus || (exports.NodeAuditStatus = {}));
var ServiceStateEnum;
(function (ServiceStateEnum) {
    ServiceStateEnum[ServiceStateEnum["Active"] = 1] = "Active";
    ServiceStateEnum[ServiceStateEnum["TestActive"] = 2] = "TestActive";
})(ServiceStateEnum = exports.ServiceStateEnum || (exports.ServiceStateEnum = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW51bS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9lbnVtLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLElBQVksMkJBWVg7QUFaRCxXQUFZLDJCQUEyQjtJQUVuQzs7O09BR0c7SUFDSCxtRkFBVyxDQUFBO0lBRVg7O09BRUc7SUFDSCxpRkFBVSxDQUFBO0FBQ2QsQ0FBQyxFQVpXLDJCQUEyQixHQUEzQixtQ0FBMkIsS0FBM0IsbUNBQTJCLFFBWXRDO0FBRUQsSUFBWSx5QkE4Qlg7QUE5QkQsV0FBWSx5QkFBeUI7SUFFakM7O09BRUc7SUFDSCwrRUFBVyxDQUFBO0lBRVg7OztPQUdHO0lBQ0gscUhBQThCLENBQUE7SUFFOUI7OztPQUdHO0lBQ0gsNkhBQWtDLENBQUE7SUFFbEM7OztPQUdHO0lBQ0gscUhBQThCLENBQUE7SUFFOUI7OztPQUdHO0lBQ0gsNkhBQWtDLENBQUE7QUFDdEMsQ0FBQyxFQTlCVyx5QkFBeUIsR0FBekIsaUNBQXlCLEtBQXpCLGlDQUF5QixRQThCcEM7QUFFRCxJQUFZLHVCQXFCWDtBQXJCRCxXQUFZLHVCQUF1QjtJQUUvQjs7T0FFRztJQUNILG1GQUFlLENBQUE7SUFFZjs7T0FFRztJQUNILDJFQUFXLENBQUE7SUFFWDs7T0FFRztJQUNILHlFQUFVLENBQUE7SUFFVjs7T0FFRztJQUNILCtFQUFhLENBQUE7QUFDakIsQ0FBQyxFQXJCVyx1QkFBdUIsR0FBdkIsK0JBQXVCLEtBQXZCLCtCQUF1QixRQXFCbEM7QUFFRCxpQkFBaUI7QUFDakIsSUFBWSxjQWlCWDtBQWpCRCxXQUFZLGNBQWM7SUFFdEI7O09BRUc7SUFDSCx1REFBVSxDQUFBO0lBRVY7O09BRUc7SUFDSCx5REFBVyxDQUFBO0lBRVg7O09BRUc7SUFDSCx1REFBVSxDQUFBO0FBRWQsQ0FBQyxFQWpCVyxjQUFjLEdBQWQsc0JBQWMsS0FBZCxzQkFBYyxRQWlCekI7QUFFRCxJQUFZLGVBZ0JYO0FBaEJELFdBQVksZUFBZTtJQUV2Qjs7T0FFRztJQUNILGlFQUFjLENBQUE7SUFFZDs7T0FFRztJQUNILDZEQUFZLENBQUE7SUFFWjs7T0FFRztJQUNILG1FQUFlLENBQUE7QUFDbkIsQ0FBQyxFQWhCVyxlQUFlLEdBQWYsdUJBQWUsS0FBZix1QkFBZSxRQWdCMUI7QUFFRCxJQUFZLGdCQUtYO0FBTEQsV0FBWSxnQkFBZ0I7SUFFeEIsMkRBQVUsQ0FBQTtJQUVWLG1FQUFjLENBQUE7QUFDbEIsQ0FBQyxFQUxXLGdCQUFnQixHQUFoQix3QkFBZ0IsS0FBaEIsd0JBQWdCLFFBSzNCIn0=