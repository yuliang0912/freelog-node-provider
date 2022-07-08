import { FreelogContext, IMongodbOperation, PageResult } from 'egg-freelog-base';
import { CreateNodeOptions, INodeService, ITageService, NodeInfo } from '../../interface';
import AutoIncrementRecordProvider from '../data-provider/auto-increment-record-provider';
export declare class NodeService implements INodeService {
    ctx: FreelogContext;
    nodeCommonChecker: any;
    tagService: ITageService;
    nodeProvider: IMongodbOperation<NodeInfo>;
    nodeFreezeRecordProvider: IMongodbOperation<any>;
    autoIncrementRecordProvider: AutoIncrementRecordProvider;
    updateNodeInfo(nodeId: number, model: object): Promise<boolean>;
    createNode(options: CreateNodeOptions): Promise<NodeInfo>;
    findById(nodeId: number, ...args: any[]): Promise<NodeInfo>;
    findByDomain(nodeDomain: string, ...args: any[]): Promise<NodeInfo>;
    findByIds(nodeIds: number[], ...args: any[]): Promise<NodeInfo[]>;
    findOne(condition: object, ...args: any[]): Promise<NodeInfo>;
    find(condition: object, ...args: any[]): Promise<NodeInfo[]>;
    findUserCreatedNodeCounts(userIds: number[]): Promise<any>;
    findIntervalList(condition: object, skip?: number, limit?: number, projection?: string[], sort?: object): Promise<PageResult<NodeInfo>>;
    count(condition: object): Promise<number>;
    /**
     * 冻结或解冻节点
     * @param nodeInfo
     * @param remark
     */
    freezeOrDeArchiveResource(nodeInfo: NodeInfo, reason: string, remark: string): Promise<boolean>;
    /**
     * 批量查找节点冻结与解封记录
     * @param nodeIds
     * @param operationType
     * @param recordLimit
     */
    batchFindFreeOrRecoverRecords(nodeIds: number[], operationType?: 1 | 2, recordLimit?: number): Promise<any[]>;
    /**
     * 批量设置或移除节点标签
     * @param nodeIds
     * @param tags
     * @param setType
     */
    batchSetOrRemoveNodeTags(nodeIds: number[], tags: string[], setType: 1 | 2): Promise<boolean>;
    /**
     * 填充节点封禁原因
     * @param nodes
     */
    fillNodeFreezeReason(nodes: NodeInfo[]): Promise<NodeInfo[]>;
}
