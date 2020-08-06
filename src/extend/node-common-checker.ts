import {provide, inject} from 'midway';
import {INodeService, NodeInfo} from "../interface";
import {ApplicationError, ArgumentError} from 'egg-freelog-base';

@provide()
export class NodeCommonChecker {

    @inject()
    ctx;
    @inject()
    nodeService: INodeService;

    /**
     * 检查节点域名
     * 先参考天猫:https://wenku.baidu.com/view/d5ab601db52acfc789ebc98f.html
     * @param nodeDomain
     */
    async checkRegisterNodeDomainAndName(nodeDomain, nodeName): Promise<void> {

        if (NodeCommonChecker.systemRetain.some(item => item.toLowerCase() === nodeDomain.toLocaleString())) {
            throw new ArgumentError(this.ctx.gettext('节点域名不能注册系统保留字段'));
        }

        const nodeList = await this.nodeService.find({$or: [{nodeName}, {nodeDomain}]});
        if (nodeList.some(x => x.nodeName.toLowerCase() === nodeName.toLocaleString())) {
            throw new ApplicationError(this.ctx.gettext('node-name-has-already-existed'), {nodeName})
        }
        if (nodeList.some(x => x.nodeDomain.toLowerCase() === nodeDomain.toLowerCase())) {
            throw new ApplicationError(this.ctx.gettext('node-domain-has-already-existed'), {nodeDomain})
        }
    }

    /**
     * 检查节点创建数量限制
     * @returns {Promise<void>}
     */
    async checkNodeCreatedLimit(): Promise<void> {
        if (!this.ctx.userId) {
            return;
        }
        const createdNodeCount = await this.nodeService.count({ownerUserId: this.ctx.userId});
        if (createdNodeCount > 15) {
            throw new ApplicationError(this.ctx.gettext('user-node-count-limit-error'), {createdNodeCount})
        }
    }

    nullObjectAndUserAuthorizationCheck(nodeInfo: NodeInfo): void {
        this.ctx.entityNullValueAndUserAuthorizationCheck(nodeInfo, {
            property: 'ownerUserId',
            msg: this.ctx.gettext('params-validate-failed', 'nodeId'),
        })
    }

    /**
     * 获取系统保留字段
     * @returns {[string,string]}
     */
    static get systemRetain() {
        return ['freelog', 'www', 'account', 'docs', 'free', 'democracy', 'service', 'node', 'nodes', 'admin', 'self', 'public', 'system', 'user', 'group', 'copyright', 'platform', 'china', 'xijinping', 'company', 'maozedong', 'dengxiaop', 'zhouenlai', 'likeqiang', 'jiangzeming', 'hujingtao']
    }
}