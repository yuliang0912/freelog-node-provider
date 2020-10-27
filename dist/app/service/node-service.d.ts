import { CreateNodeOptions, INodeService, NodeInfo, PageResult } from '../../interface';
export declare class NodeService implements INodeService {
    ctx: any;
    nodeProvider: any;
    nodeCommonChecker: any;
    autoIncrementRecordProvider: any;
    updateNodeInfo(nodeId: number, model: object): Promise<boolean>;
    createNode(options: CreateNodeOptions): Promise<NodeInfo>;
    findById(nodeId: number, ...args: any[]): Promise<NodeInfo>;
    findByDomain(nodeDomain: string, ...args: any[]): Promise<NodeInfo>;
    findByIds(nodeIds: number[], ...args: any[]): Promise<NodeInfo[]>;
    findOne(condition: object, ...args: any[]): Promise<NodeInfo>;
    find(condition: object, ...args: any[]): Promise<NodeInfo[]>;
    findPageList(condition: object, page: number, pageSize: number, projection: string[], orderBy: object): Promise<PageResult<NodeInfo>>;
    count(condition: object): Promise<number>;
}
