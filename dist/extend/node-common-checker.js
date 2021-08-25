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
    ctx;
    nodeService;
    /**
     * 检查节点域名
     * 先参考天猫:https://wenku.baidu.com/view/d5ab601db52acfc789ebc98f.html
     * @param nodeDomain
     * @param nodeName
     */
    async checkRegisterNodeDomainAndName(nodeDomain, nodeName) {
        if (NodeCommonChecker_1.systemRetain.some(item => item.toLowerCase() === nodeDomain.toLowerCase())) {
            throw new egg_freelog_base_1.ArgumentError(this.ctx.gettext('节点域名不能注册系统保留字段'));
        }
        // TODO:动态检查,模拟请求域名,如果返回非404,则代表已经被使用
        // this.ctx.curl(`https://${nodeDomain}.freelog.com`).then(res => {
        //     if (res.httpCode != 404) {
        //         throw new ArgumentError(this.ctx.gettext('节点域名已被使用'));
        //     }
        // });
        const uniqueKey = this.generateNodeUniqueKey(nodeDomain);
        const nodeList = await this.nodeService.find({ $or: [{ nodeName }, { uniqueKey }] });
        if (nodeList.some(x => x.nodeName.toLowerCase() === nodeName.toLowerCase())) {
            throw new egg_freelog_base_1.ApplicationError(this.ctx.gettext('node-name-has-already-existed'), { nodeName });
        }
        if (nodeList.some(x => x.uniqueKey === uniqueKey)) {
            throw new egg_freelog_base_1.ApplicationError(this.ctx.gettext('node-domain-has-already-existed'), { nodeDomain });
        }
    }
    /**
     * 生成规则ID
     * @param nodeDomain
     */
    generateNodeUniqueKey(nodeDomain) {
        return egg_freelog_base_1.CryptoHelper.md5(`freelog-node-unique-key-${nodeDomain.trim().toLowerCase()}`);
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
        return ['freelog', 'www', 'account', 'login', 'pay', 'master', 'main', 'shenzhen', 'beijing', 'shanghai', 'docs', 'free', 'democracy', 'service', 'node', 'nodes', 'admin', 'self', 'public', 'system', 'user', 'group', 'copyright', 'platform', 'china', 'xijinping', 'company', 'maozedong', 'dengxiaop', 'zhouenlai', 'likeqiang', 'jiangzeming', 'hujingtao'];
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm9kZS1jb21tb24tY2hlY2tlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9leHRlbmQvbm9kZS1jb21tb24tY2hlY2tlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7O0FBQUEsbUNBQXVDO0FBRXZDLHVEQUErRjtBQUcvRixJQUFhLGlCQUFpQix5QkFBOUIsTUFBYSxpQkFBaUI7SUFHMUIsR0FBRyxDQUFpQjtJQUVwQixXQUFXLENBQWU7SUFFMUI7Ozs7O09BS0c7SUFDSCxLQUFLLENBQUMsOEJBQThCLENBQUMsVUFBa0IsRUFBRSxRQUFnQjtRQUVyRSxJQUFJLG1CQUFpQixDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLEtBQUssVUFBVSxDQUFDLFdBQVcsRUFBRSxDQUFDLEVBQUU7WUFDOUYsTUFBTSxJQUFJLGdDQUFhLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDO1NBQy9EO1FBRUQscUNBQXFDO1FBQ3JDLG1FQUFtRTtRQUNuRSxpQ0FBaUM7UUFDakMsaUVBQWlFO1FBQ2pFLFFBQVE7UUFDUixNQUFNO1FBRU4sTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLHFCQUFxQixDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQ3pELE1BQU0sUUFBUSxHQUFHLE1BQU0sSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsRUFBQyxHQUFHLEVBQUUsQ0FBQyxFQUFDLFFBQVEsRUFBQyxFQUFFLEVBQUMsU0FBUyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUM7UUFDL0UsSUFBSSxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxXQUFXLEVBQUUsS0FBSyxRQUFRLENBQUMsV0FBVyxFQUFFLENBQUMsRUFBRTtZQUN6RSxNQUFNLElBQUksbUNBQWdCLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsK0JBQStCLENBQUMsRUFBRSxFQUFDLFFBQVEsRUFBQyxDQUFDLENBQUE7U0FDNUY7UUFDRCxJQUFJLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsU0FBUyxLQUFLLFNBQVMsQ0FBQyxFQUFFO1lBQy9DLE1BQU0sSUFBSSxtQ0FBZ0IsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxpQ0FBaUMsQ0FBQyxFQUFFLEVBQUMsVUFBVSxFQUFDLENBQUMsQ0FBQTtTQUNoRztJQUNMLENBQUM7SUFFRDs7O09BR0c7SUFDSCxxQkFBcUIsQ0FBQyxVQUFrQjtRQUNwQyxPQUFPLCtCQUFZLENBQUMsR0FBRyxDQUFDLDJCQUEyQixVQUFVLENBQUMsSUFBSSxFQUFFLENBQUMsV0FBVyxFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBQzFGLENBQUM7SUFFRDs7O09BR0c7SUFDSCxLQUFLLENBQUMscUJBQXFCO1FBQ3ZCLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRTtZQUNsQixPQUFPO1NBQ1Y7UUFDRCxNQUFNLGdCQUFnQixHQUFHLE1BQU0sSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsRUFBQyxXQUFXLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUMsQ0FBQyxDQUFDO1FBQ3RGLElBQUksZ0JBQWdCLEdBQUcsRUFBRSxFQUFFO1lBQ3ZCLE1BQU0sSUFBSSxtQ0FBZ0IsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyw2QkFBNkIsQ0FBQyxFQUFFLEVBQUMsZ0JBQWdCLEVBQUMsQ0FBQyxDQUFBO1NBQ2xHO0lBQ0wsQ0FBQztJQUVELG1DQUFtQyxDQUFDLFFBQWtCO1FBQ2xELElBQUksQ0FBQyxHQUFHLENBQUMsd0NBQXdDLENBQUMsUUFBUSxFQUFFO1lBQ3hELFFBQVEsRUFBRSxhQUFhO1lBQ3ZCLEdBQUcsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyx3QkFBd0IsRUFBRSxRQUFRLENBQUM7U0FDNUQsQ0FBQyxDQUFBO0lBQ04sQ0FBQztJQUVEOzs7T0FHRztJQUNILE1BQU0sS0FBSyxZQUFZO1FBQ25CLE9BQU8sQ0FBQyxTQUFTLEVBQUUsS0FBSyxFQUFFLFNBQVMsRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBRSxNQUFNLEVBQUUsVUFBVSxFQUFFLFNBQVMsRUFBRSxVQUFVLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxXQUFXLEVBQUUsU0FBUyxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUUsV0FBVyxFQUFFLFVBQVUsRUFBRSxPQUFPLEVBQUUsV0FBVyxFQUFFLFNBQVMsRUFBRSxXQUFXLEVBQUUsV0FBVyxFQUFFLFdBQVcsRUFBRSxXQUFXLEVBQUUsYUFBYSxFQUFFLFdBQVcsQ0FBQyxDQUFBO0lBQ3RXLENBQUM7Q0FDSixDQUFBO0FBckVHO0lBREMsZUFBTSxFQUFFOzs4Q0FDVztBQUVwQjtJQURDLGVBQU0sRUFBRTs7c0RBQ2lCO0FBTGpCLGlCQUFpQjtJQUQ3QixnQkFBTyxFQUFFO0dBQ0csaUJBQWlCLENBd0U3QjtBQXhFWSw4Q0FBaUIifQ==