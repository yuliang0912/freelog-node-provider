import { CreateNodeOptions, INodeService, NodeInfo } from '../../interface';
export declare class NodeService implements INodeService {
    ctx: any;
    nodeProvider: any;
    autoIncrementRecordProvider: any;
    updateNodeInfo(nodeInfo: NodeInfo, model: object): Promise<boolean>;
    createNode(options: CreateNodeOptions): Promise<NodeInfo>;
    findById(nodeId: number, ...args: any[]): Promise<NodeInfo>;
    findByIds(nodeIds: number[], ...args: any[]): Promise<NodeInfo[]>;
    findOne(condition: object, ...args: any[]): Promise<NodeInfo>;
    find(condition: object, ...args: any[]): Promise<NodeInfo[]>;
    findPageList(condition: object, page: number, pageSize: number, projection: string[], orderBy: object): Promise<NodeInfo[]>;
    count(condition: object): Promise<number>;
}
