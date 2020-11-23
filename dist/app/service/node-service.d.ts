import { FreelogContext, IMongodbOperation, PageResult } from 'egg-freelog-base';
import { CreateNodeOptions, INodeService, NodeInfo } from '../../interface';
export declare class NodeService implements INodeService {
    ctx: FreelogContext;
    nodeCommonChecker: any;
    autoIncrementRecordProvider: any;
    nodeProvider: IMongodbOperation<NodeInfo>;
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
