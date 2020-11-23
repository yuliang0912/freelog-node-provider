"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NodeTestRuleMatchStatus = exports.PresentableAuthStatusEnum = exports.PresentableOnlineStatusEnum = void 0;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW51bS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9lbnVtLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUNBLElBQVksMkJBWVg7QUFaRCxXQUFZLDJCQUEyQjtJQUVuQzs7O09BR0c7SUFDSCxtRkFBVyxDQUFBO0lBRVg7O09BRUc7SUFDSCxpRkFBVSxDQUFBO0FBQ2QsQ0FBQyxFQVpXLDJCQUEyQixHQUEzQixtQ0FBMkIsS0FBM0IsbUNBQTJCLFFBWXRDO0FBRUQsSUFBWSx5QkE4Qlg7QUE5QkQsV0FBWSx5QkFBeUI7SUFFakM7O09BRUc7SUFDSCwrRUFBVyxDQUFBO0lBRVg7OztPQUdHO0lBQ0gscUhBQThCLENBQUE7SUFFOUI7OztPQUdHO0lBQ0gsNkhBQWtDLENBQUE7SUFFbEM7OztPQUdHO0lBQ0gscUhBQThCLENBQUE7SUFFOUI7OztPQUdHO0lBQ0gsNkhBQWtDLENBQUE7QUFDdEMsQ0FBQyxFQTlCVyx5QkFBeUIsR0FBekIsaUNBQXlCLEtBQXpCLGlDQUF5QixRQThCcEM7QUFFRCxJQUFZLHVCQWVYO0FBZkQsV0FBWSx1QkFBdUI7SUFDL0I7O09BRUc7SUFDSCwyRUFBVyxDQUFBO0lBRVg7O09BRUc7SUFDSCx5RUFBVSxDQUFBO0lBRVY7O09BRUc7SUFDSCwrRUFBYSxDQUFBO0FBQ2pCLENBQUMsRUFmVyx1QkFBdUIsR0FBdkIsK0JBQXVCLEtBQXZCLCtCQUF1QixRQWVsQyJ9