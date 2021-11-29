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
     * 批量查询展品
     */
    exhibitList(): Promise<void>;
    /**
     * 正式节点的展品
     */
    exhibits(): Promise<FreelogContext>;
    /**
     * 查询单个展品
     */
    exhibitDetail(): Promise<FreelogContext>;
    /**
     * 测试节点的展品
     */
    testExhibitList(): Promise<void>;
    /**
     * 测试节点的展品
     */
    testExhibits(): Promise<FreelogContext>;
    /**
     * 查询单个测试展品
     */
    testExhibitDetail(): Promise<any>;
}
