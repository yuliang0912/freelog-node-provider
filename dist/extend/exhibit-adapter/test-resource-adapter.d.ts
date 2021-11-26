import { ExhibitAuthNodeInfo, ExhibitDependencyNodeInfo, ExhibitInfo } from '../../interface';
import { FlattenTestResourceAuthTree, FlattenTestResourceDependencyTree, TestResourceInfo, TestResourceTreeInfo } from '../../test-node-interface';
import { TestNodeGenerator } from '../test-node-generator';
export declare class TestResourceAdapter {
    testNodeGenerator: TestNodeGenerator;
    /**
     * 测试资源适配成展品
     * @param testResource
     * @param testResourceTreeInfo
     */
    testResourceWrapToExhibitInfo(testResource: TestResourceInfo, testResourceTreeInfo?: TestResourceTreeInfo): ExhibitInfo;
    /**
     * 测试资源版本信息生成
     * @param testResource
     * @param testResourceTreeInfo
     * @private
     */
    private testResourceTreeInfoWrapToExhibitVersionInfo;
    /**
     * 测试资源依赖树适配为exhibit依赖树
     * @param testResourceDependencyTree
     */
    static testResourceDependencyTreeWrapToExhibitDependencyNodeInfo(testResourceDependencyTree: FlattenTestResourceDependencyTree[]): ExhibitDependencyNodeInfo[];
    /**
     * 测试资源授权树适配为exhibit授权树
     * @param testResourceAuthTree
     */
    static testResourceAuthTreeWrapToExhibitDependencyNodeInfo(testResourceAuthTree: FlattenTestResourceAuthTree[]): ExhibitAuthNodeInfo[];
}
