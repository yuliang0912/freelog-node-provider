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
    freezeOrDeArchiveResource(nodeInfo: NodeInfo, remark: string): Promise<boolean>;
    /**
     * 查找节点冻结操作记录
     * @param nodeId
     * @param args
     */
    findNodeFreezeRecords(nodeId: number, ...args: any[]): Promise<any>;
    /**
     * 设置标签
     * @param nodeInfo
     * @param tagNames
     */
    setTag(nodeInfo: NodeInfo, tagNames: string[]): Promise<boolean>;
    /**
     * 取消设置Tag
     * @param nodeInfo
     * @param tagName
     */
    unsetTag(nodeInfo: NodeInfo, tagName: string): Promise<boolean>;
}
