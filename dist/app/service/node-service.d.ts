import { FreelogContext, IMongodbOperation, PageResult } from 'egg-freelog-base';
import { CreateNodeOptions, findOptions, INodeService, ITageService, NodeDetailInfo, NodeInfo, TagInfo } from '../../interface';
export declare class NodeService implements INodeService {
    ctx: FreelogContext;
    nodeCommonChecker: any;
    autoIncrementRecordProvider: any;
    tagService: ITageService;
    nodeProvider: IMongodbOperation<NodeInfo>;
    nodeDetailProvider: IMongodbOperation<NodeDetailInfo>;
    updateNodeInfo(nodeId: number, model: object): Promise<boolean>;
    createNode(options: CreateNodeOptions): Promise<NodeInfo>;
    findById(nodeId: number, ...args: any[]): Promise<NodeInfo>;
    findByDomain(nodeDomain: string, ...args: any[]): Promise<NodeInfo>;
    findByIds(nodeIds: number[], ...args: any[]): Promise<NodeInfo[]>;
    findOne(condition: object, ...args: any[]): Promise<NodeInfo>;
    find(condition: object, ...args: any[]): Promise<NodeInfo[]>;
    findUserCreatedNodeCounts(userIds: number[]): Promise<any>;
    findIntervalList(condition: object, skip?: number, limit?: number, projection?: string[], sort?: object): Promise<PageResult<NodeInfo>>;
    searchIntervalListByTags(condition: object, tagIds?: number[], options?: findOptions<NodeInfo>): Promise<PageResult<NodeInfo>>;
    count(condition: object): Promise<number>;
    /**
     * 设置标签
     * @param nodeId
     * @param tagInfo
     */
    setTag(nodeId: number, tagInfos: TagInfo[]): Promise<boolean>;
    /**
     * 取消设置Tag
     * @param nodeId
     * @param tagInfo
     */
    unsetTag(nodeId: number, tagInfo: TagInfo): Promise<boolean>;
    /**
     * 更新节点详情
     * @param nodeId
     * @param model
     */
    updateNodeDetailInfo(nodeId: number, model: Partial<NodeDetailInfo>): Promise<boolean>;
}
