import {provide, inject} from 'midway';
import {CreateNodeOptions, INodeService, NodeInfo, UserInfo} from '../../interface';

@provide()
export class NodeService implements INodeService {

    @inject()
    ctx;
    @inject()
    nodeProvider;
    @inject()
    autoIncrementRecordProvider;

    async updateNodeInfo(nodeInfo: NodeInfo, model: object): Promise<boolean> {
        return true;
    }

    async createNode(options: CreateNodeOptions): Promise<NodeInfo> {

        const userInfo = this.ctx.userInfo as UserInfo;
        const nodeId = await this.autoIncrementRecordProvider.getNextNodeId();

        const nodeInfo: NodeInfo = {
            nodeId,
            nodeName: options.nodeName,
            nodeDomain: options.nodeDomain,
            ownerUserId: userInfo.userId,
            ownerUserName: userInfo.username
        };

        return this.nodeProvider.create(nodeInfo);
    }

    async findById(nodeId: number, ...args): Promise<NodeInfo> {
        return this.nodeProvider.findOne({nodeId}, ...args);
    }

    async findByIds(nodeIds: number[], ...args): Promise<NodeInfo[]> {
        return this.nodeProvider.find({nodeId: {$in: nodeIds}}, ...args);
    }

    async findOne(condition: object, ...args): Promise<NodeInfo> {
        return this.nodeProvider.findOne(condition, ...args);
    }

    async find(condition: object, ...args): Promise<NodeInfo[]> {
        return this.nodeProvider.find(condition, ...args);
    }

    async findPageList(condition: object, page: number, pageSize: number, projection: string[], orderBy: object): Promise<NodeInfo[]> {
        return this.nodeProvider.findPageList(condition, page, pageSize, projection.join(' '), orderBy);
    }

    async count(condition: object): Promise<number> {
        return this.nodeProvider.count(condition);
    }
}
