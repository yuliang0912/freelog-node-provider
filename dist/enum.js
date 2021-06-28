"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServiceStateEnum = exports.NodeAuditStatus = exports.NodeStatus = exports.NodeTestRuleMatchStatus = exports.PresentableAuthStatusEnum = exports.PresentableOnlineStatusEnum = void 0;
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
// 0:未发布 1:已发布 2:系统冻结
var NodeStatus;
(function (NodeStatus) {
    /**
     * 正常.
     */
    NodeStatus[NodeStatus["Normal"] = 0] = "Normal";
    /**
     * 冻结
     */
    NodeStatus[NodeStatus["Freeze"] = 1] = "Freeze";
})(NodeStatus = exports.NodeStatus || (exports.NodeStatus = {}));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW51bS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9lbnVtLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLElBQVksMkJBWVg7QUFaRCxXQUFZLDJCQUEyQjtJQUVuQzs7O09BR0c7SUFDSCxtRkFBVyxDQUFBO0lBRVg7O09BRUc7SUFDSCxpRkFBVSxDQUFBO0FBQ2QsQ0FBQyxFQVpXLDJCQUEyQixHQUEzQixtQ0FBMkIsS0FBM0IsbUNBQTJCLFFBWXRDO0FBRUQsSUFBWSx5QkE4Qlg7QUE5QkQsV0FBWSx5QkFBeUI7SUFFakM7O09BRUc7SUFDSCwrRUFBVyxDQUFBO0lBRVg7OztPQUdHO0lBQ0gscUhBQThCLENBQUE7SUFFOUI7OztPQUdHO0lBQ0gsNkhBQWtDLENBQUE7SUFFbEM7OztPQUdHO0lBQ0gscUhBQThCLENBQUE7SUFFOUI7OztPQUdHO0lBQ0gsNkhBQWtDLENBQUE7QUFDdEMsQ0FBQyxFQTlCVyx5QkFBeUIsR0FBekIsaUNBQXlCLEtBQXpCLGlDQUF5QixRQThCcEM7QUFFRCxJQUFZLHVCQXFCWDtBQXJCRCxXQUFZLHVCQUF1QjtJQUUvQjs7T0FFRztJQUNILG1GQUFlLENBQUE7SUFFZjs7T0FFRztJQUNILDJFQUFXLENBQUE7SUFFWDs7T0FFRztJQUNILHlFQUFVLENBQUE7SUFFVjs7T0FFRztJQUNILCtFQUFhLENBQUE7QUFDakIsQ0FBQyxFQXJCVyx1QkFBdUIsR0FBdkIsK0JBQXVCLEtBQXZCLCtCQUF1QixRQXFCbEM7QUFFRCxxQkFBcUI7QUFDckIsSUFBWSxVQVdYO0FBWEQsV0FBWSxVQUFVO0lBRWxCOztPQUVHO0lBQ0gsK0NBQVUsQ0FBQTtJQUVWOztPQUVHO0lBQ0gsK0NBQVUsQ0FBQTtBQUNkLENBQUMsRUFYVyxVQUFVLEdBQVYsa0JBQVUsS0FBVixrQkFBVSxRQVdyQjtBQUVELElBQVksZUFnQlg7QUFoQkQsV0FBWSxlQUFlO0lBRXZCOztPQUVHO0lBQ0gsaUVBQWMsQ0FBQTtJQUVkOztPQUVHO0lBQ0gsNkRBQVksQ0FBQTtJQUVaOztPQUVHO0lBQ0gsbUVBQWUsQ0FBQTtBQUNuQixDQUFDLEVBaEJXLGVBQWUsR0FBZix1QkFBZSxLQUFmLHVCQUFlLFFBZ0IxQjtBQUVELElBQVksZ0JBS1g7QUFMRCxXQUFZLGdCQUFnQjtJQUV4QiwyREFBVSxDQUFBO0lBRVYsbUVBQWMsQ0FBQTtBQUNsQixDQUFDLEVBTFcsZ0JBQWdCLEdBQWhCLHdCQUFnQixLQUFoQix3QkFBZ0IsUUFLM0IifQ==