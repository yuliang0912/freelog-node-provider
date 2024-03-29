import { INodeService, IOutsideApiService, IPresentableService, IPresentableVersionService } from '../../interface';
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
    outsideApiService: IOutsideApiService;
    /**
     * 批量查询展品
     */
    exhibitList(): Promise<void>;
    /**
     * 正式节点的展品
     */
    exhibits(): Promise<FreelogContext>;
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
    /**
     * 查询单个展品
     */
    exhibitDetail(): Promise<FreelogContext>;
    /**
     * 查询展品作品的信息
     */
    exhibitArticleList(): Promise<FreelogContext>;
    /**
     * 测试展品依赖的作品信息(含有存储对象)
     */
    testExhibitArticleList(): Promise<FreelogContext>;
}
