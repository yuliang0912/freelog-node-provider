import { INodeService, ITageService } from '../../interface';
import { FreelogContext } from 'egg-freelog-base';
export declare class NodeController {
    ctx: FreelogContext;
    nodeCommonChecker: any;
    nodeService: INodeService;
    tagService: ITageService;
    index(): Promise<void>;
    indexForAdmin(): Promise<void>;
    createdCount(): Promise<void>;
    list(): Promise<void>;
    create(): Promise<void>;
    detail(): Promise<void>;
    show(): Promise<void>;
    batchSetOrRemoveNodeTag(): Promise<FreelogContext>;
    /**
     * 冻结节点
     */
    freezeNode(): Promise<void>;
    /**
     * 节点解封
     */
    deArchiveNode(): Promise<void>;
    /**
     * 节点冻结记录
     */
    nodeFreezeRecords(): Promise<FreelogContext>;
}
