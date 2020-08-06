"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var NodeCommonChecker_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NodeCommonChecker = void 0;
const midway_1 = require("midway");
const egg_freelog_base_1 = require("egg-freelog-base");
let NodeCommonChecker = NodeCommonChecker_1 = class NodeCommonChecker {
    /**
     * 检查节点域名
     * 先参考天猫:https://wenku.baidu.com/view/d5ab601db52acfc789ebc98f.html
     * @param nodeDomain
     */
    async checkRegisterNodeDomainAndName(nodeDomain, nodeName) {
        if (NodeCommonChecker_1.systemRetain.some(item => item.toLowerCase() === nodeDomain.toLocaleString())) {
            throw new egg_freelog_base_1.ArgumentError(this.ctx.gettext('节点域名不能注册系统保留字段'));
        }
        const nodeList = await this.nodeService.find({ $or: [{ nodeName }, { nodeDomain }] });
        if (nodeList.some(x => x.nodeName.toLowerCase() === nodeName.toLocaleString())) {
            throw new egg_freelog_base_1.ApplicationError(this.ctx.gettext('node-name-has-already-existed'), { nodeName });
        }
        if (nodeList.some(x => x.nodeDomain.toLowerCase() === nodeDomain.toLowerCase())) {
            throw new egg_freelog_base_1.ApplicationError(this.ctx.gettext('node-domain-has-already-existed'), { nodeDomain });
        }
    }
    /**
     * 检查节点创建数量限制
     * @returns {Promise<void>}
     */
    async checkNodeCreatedLimit() {
        if (!this.ctx.userId) {
            return;
        }
        const createdNodeCount = await this.nodeService.count({ ownerUserId: this.ctx.userId });
        if (createdNodeCount > 15) {
            throw new egg_freelog_base_1.ApplicationError(this.ctx.gettext('user-node-count-limit-error'), { createdNodeCount });
        }
    }
    nullObjectAndUserAuthorizationCheck(nodeInfo) {
        this.ctx.entityNullValueAndUserAuthorizationCheck(nodeInfo, {
            property: 'ownerUserId',
            msg: this.ctx.gettext('params-validate-failed', 'nodeId'),
        });
    }
    /**
     * 获取系统保留字段
     * @returns {[string,string]}
     */
    static get systemRetain() {
        return ['freelog', 'www', 'account', 'docs', 'free', 'democracy', 'service', 'node', 'nodes', 'admin', 'self', 'public', 'system', 'user', 'group', 'copyright', 'platform', 'china', 'xijinping', 'company', 'maozedong', 'dengxiaop', 'zhouenlai', 'likeqiang', 'jiangzeming', 'hujingtao'];
    }
};
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], NodeCommonChecker.prototype, "ctx", void 0);
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], NodeCommonChecker.prototype, "nodeService", void 0);
NodeCommonChecker = NodeCommonChecker_1 = __decorate([
    midway_1.provide()
], NodeCommonChecker);
exports.NodeCommonChecker = NodeCommonChecker;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm9kZS1jb21tb24tY2hlY2tlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9leHRlbmQvbm9kZS1jb21tb24tY2hlY2tlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7O0FBQUEsbUNBQXVDO0FBRXZDLHVEQUFpRTtBQUdqRSxJQUFhLGlCQUFpQix5QkFBOUIsTUFBYSxpQkFBaUI7SUFPMUI7Ozs7T0FJRztJQUNILEtBQUssQ0FBQyw4QkFBOEIsQ0FBQyxVQUFVLEVBQUUsUUFBUTtRQUVyRCxJQUFJLG1CQUFpQixDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLEtBQUssVUFBVSxDQUFDLGNBQWMsRUFBRSxDQUFDLEVBQUU7WUFDakcsTUFBTSxJQUFJLGdDQUFhLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDO1NBQy9EO1FBRUQsTUFBTSxRQUFRLEdBQUcsTUFBTSxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxFQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUMsUUFBUSxFQUFDLEVBQUUsRUFBQyxVQUFVLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQztRQUNoRixJQUFJLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLFdBQVcsRUFBRSxLQUFLLFFBQVEsQ0FBQyxjQUFjLEVBQUUsQ0FBQyxFQUFFO1lBQzVFLE1BQU0sSUFBSSxtQ0FBZ0IsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQywrQkFBK0IsQ0FBQyxFQUFFLEVBQUMsUUFBUSxFQUFDLENBQUMsQ0FBQTtTQUM1RjtRQUNELElBQUksUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsV0FBVyxFQUFFLEtBQUssVUFBVSxDQUFDLFdBQVcsRUFBRSxDQUFDLEVBQUU7WUFDN0UsTUFBTSxJQUFJLG1DQUFnQixDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLGlDQUFpQyxDQUFDLEVBQUUsRUFBQyxVQUFVLEVBQUMsQ0FBQyxDQUFBO1NBQ2hHO0lBQ0wsQ0FBQztJQUVEOzs7T0FHRztJQUNILEtBQUssQ0FBQyxxQkFBcUI7UUFDdkIsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFO1lBQ2xCLE9BQU87U0FDVjtRQUNELE1BQU0sZ0JBQWdCLEdBQUcsTUFBTSxJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxFQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBQyxDQUFDLENBQUM7UUFDdEYsSUFBSSxnQkFBZ0IsR0FBRyxFQUFFLEVBQUU7WUFDdkIsTUFBTSxJQUFJLG1DQUFnQixDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLDZCQUE2QixDQUFDLEVBQUUsRUFBQyxnQkFBZ0IsRUFBQyxDQUFDLENBQUE7U0FDbEc7SUFDTCxDQUFDO0lBRUQsbUNBQW1DLENBQUMsUUFBa0I7UUFDbEQsSUFBSSxDQUFDLEdBQUcsQ0FBQyx3Q0FBd0MsQ0FBQyxRQUFRLEVBQUU7WUFDeEQsUUFBUSxFQUFFLGFBQWE7WUFDdkIsR0FBRyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLHdCQUF3QixFQUFFLFFBQVEsQ0FBQztTQUM1RCxDQUFDLENBQUE7SUFDTixDQUFDO0lBRUQ7OztPQUdHO0lBQ0gsTUFBTSxLQUFLLFlBQVk7UUFDbkIsT0FBTyxDQUFDLFNBQVMsRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsV0FBVyxFQUFFLFNBQVMsRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxVQUFVLEVBQUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxTQUFTLEVBQUUsV0FBVyxFQUFFLFdBQVcsRUFBRSxXQUFXLEVBQUUsV0FBVyxFQUFFLGFBQWEsRUFBRSxXQUFXLENBQUMsQ0FBQTtJQUNqUyxDQUFDO0NBQ0osQ0FBQTtBQXBERztJQURDLGVBQU0sRUFBRTs7OENBQ0w7QUFFSjtJQURDLGVBQU0sRUFBRTs7c0RBQ2lCO0FBTGpCLGlCQUFpQjtJQUQ3QixnQkFBTyxFQUFFO0dBQ0csaUJBQWlCLENBdUQ3QjtBQXZEWSw4Q0FBaUIifQ==