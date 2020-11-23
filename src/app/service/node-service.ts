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

    async findPageList(condition: object, page: number, pageSize: number, projection: string[], orderBy: object): Promise<PageResult<NodeInfo>> {
        let dataList = [];
        const totalItem = await this.count(condition);
        if (totalItem > (page - 1) * pageSize) {
            dataList = await this.nodeProvider.findPageList(condition, page, pageSize, projection.join(' '), {createDate: -1});
        }
        return {page, pageSize, totalItem, dataList};
    }

    async count(condition: object): Promise<number> {
        return this.nodeProvider.count(condition);
    }
}
