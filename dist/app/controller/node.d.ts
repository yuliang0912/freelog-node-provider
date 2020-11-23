import { INodeService } from '../../interface';
import { FreelogContext } from 'egg-freelog-base';
export declare class NodeController {
    ctx: FreelogContext;
    nodeCommonChecker: any;
    nodeService: INodeService;
    index(): Promise<void>;
    list(): Promise<void>;
    create(): Promise<void>;
    detail(): Promise<void>;
    show(): Promise<void>;
}
