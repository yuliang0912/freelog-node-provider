import {provide, inject} from 'midway';
import {FreelogContext, IMongodbOperation, PageResult} from 'egg-freelog-base';
import {CreateNodeOptions, INodeService, NodeInfo} from '../../interface';

@provide()
export class NodeService implements INodeService {

    @inject()
    ctx: FreelogContext;
    @inject()
    nodeCommonChecker;
    @inject()
    autoIncrementRecordProvider;
    @inject()
    nodeProvider: IMongodbOperation<NodeInfo>;

    async updateNodeInfo(nodeId: number, model: object): Promise<boolean> {
        return this.nodeProvider.updateOne({nodeId}, model).then(t => Boolean(t.ok));
    }

    async createNode(options: CreateNodeOptions): Promise<NodeInfo> {

        const userInfo = this.ctx.identityInfo.userInfo;
        const nodeId = await this.autoIncrementRecordProvider.getNextNodeId();

        const nodeInfo: NodeInfo = {
            nodeId,
            nodeName: options.nodeName,
            nodeDomain: options.nodeDomain,
            ownerUserId: userInfo.userId,
            ownerUserName: userInfo.username,
            uniqueKey: this.nodeCommonChecker.generateNodeUniqueKey(options.nodeDomain)
        };

        return this.nodeProvider.create(nodeInfo);
    }

    async findById(nodeId: number, ...args): Promise<NodeInfo> {
        return this.nodeProvider.findOne({nodeId}, ...args);
    }

    async findByDomain(nodeDomain: string, ...args): Promise<NodeInfo> {
        const uniqueKey = this.nodeCommonChecker.generateNodeUniqueKey(nodeDomain);
        return this.nodeProvider.findOne({uniqueKey}, ...args);
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

    async findUserCreatedNodeCounts(userIds: number[]) {
        return this.nodeProvider.aggregate([
            {
                $match: {ownerUserId: {$in: userIds}}
            },
            {
                $group: {_id: "$ownerUserId", count: {"$sum": 1}}
            },
            {
                $project: {_id: 0, userId: "$_id", count: "$count"}
            }
        ])
    }

    async findIntervalList(condition: object, skip?: number, limit?: number, projection?: string[], sort?: object): Promise<PageResult<NodeInfo>> {
        return this.nodeProvider.findIntervalList(condition, skip, limit, projection?.toString(), sort);
    }

    async count(condition: object): Promise<number> {
        return this.nodeProvider.count(condition);
    }
}
