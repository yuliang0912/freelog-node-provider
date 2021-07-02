import { INodeService, ITageService } from '../../interface';
import { FreelogContext } from 'egg-freelog-base';
export declare class NodeController {
    ctx: FreelogContext;
    nodeCommonChecker: any;
    nodeService: INodeService;
    tagService: ITageService;
    index(): Promise<void>;
    indexForAdminWithTags(): Promise<FreelogContext>;
    createdCount(): Promise<void>;
    list(): Promise<void>;
    create(): Promise<void>;
    detail(): Promise<void>;
    show(): Promise<void>;
    setNodeTag(): Promise<void>;
    unsetNodeTag(): Promise<void>;
    freeOrRecoverNodeStatus(): Promise<FreelogContext>;
}
