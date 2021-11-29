import { INodeService, IPresentableService, IPresentableVersionService } from '../../interface';
import { FreelogContext } from 'egg-freelog-base';
import { PresentableCommonChecker } from '../../extend/presentable-common-checker';
import { PresentableAdapter } from '../../extend/exhibit-adapter/presentable-adapter';
import { ITestNodeService } from '../../test-node-interface';
import { TestResourceAdapter } from '../../extend/exhibit-adapter/test-resource-adapter';
export declare class ExhibitController {
    ctx: FreelogContext;
    presentableCommonChecker: PresentableCommonChecker;
    presentableService: IPresentableService;
    presentableVersionService: IPresentableVersionService;
    presentableAdapter: PresentableAdapter;
    testResourceAdapter: TestResourceAdapter;
    testNodeService: ITestNodeService;
    nodeService: INodeService;
    /**
     * 正式节点的展品
     */
    exhibits(): Promise<FreelogContext>;
    /**
     * 测试节点的展品
     */
    testExhibits(): Promise<FreelogContext>;
}
