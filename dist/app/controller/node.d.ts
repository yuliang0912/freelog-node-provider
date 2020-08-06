import { INodeService } from '../../interface';
export declare class NodeController {
    nodeService: INodeService;
    nodeCommonChecker: any;
    index(ctx: any): Promise<void>;
    list(ctx: any): Promise<void>;
    create(ctx: any): Promise<void>;
    detail(ctx: any): Promise<void>;
    show(ctx: any): Promise<void>;
}
