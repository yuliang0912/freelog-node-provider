import { INodeService } from '../../interface';
export declare class TestNodeController {
    nodeService: INodeService;
    nodeCommonChecker: any;
    testRuleHandler: any;
    testNodeService: any;
    show(ctx: any): Promise<void>;
    create(ctx: any): Promise<void>;
}
