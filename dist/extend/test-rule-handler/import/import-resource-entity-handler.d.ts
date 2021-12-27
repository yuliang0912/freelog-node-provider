import { IOutsideApiService, ResourceInfo } from '../../../interface';
import { TestRuleMatchInfo, TestResourceDependencyTree } from '../../../test-node-interface';
import { PresentableCommonChecker } from '../../presentable-common-checker';
import { FreelogContext } from 'egg-freelog-base';
import { TestRuleChecker } from '../test-rule-checker';
export declare class ImportResourceEntityHandler {
    ctx: FreelogContext;
    outsideApiService: IOutsideApiService;
    testRuleChecker: TestRuleChecker;
    presentableCommonChecker: PresentableCommonChecker;
    /**
     * 从规则中分析需要导入的资源数据
     * @param addResourceRules
     */
    importResourceEntityDataFromRules(addResourceRules: TestRuleMatchInfo[]): Promise<void>;
    /**
     * 获取展品依赖树
     * @param resourceIdOrName
     * @param version
     */
    getResourceDependencyTree(resourceIdOrName: string, version: string): Promise<TestResourceDependencyTree[]>;
    /**
     * 匹配发行版本
     * @param resourceInfo
     * @param versionRange
     */
    matchResourceVersion(resourceInfo: ResourceInfo, versionRange: string): any;
    /**
     * 填充实体数据
     * @param matchRule
     * @param resourceInfo
     * @private
     */
    _fillRuleEntityInfo(matchRule: TestRuleMatchInfo, resourceInfo: ResourceInfo): void;
}
