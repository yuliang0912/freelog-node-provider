import { FreelogContext, IMongodbOperation } from 'egg-freelog-base';
import { TestRuleMatchInfo, TestResourceInfo } from '../../test-node-interface';
export declare class ActivateThemeHandler {
    ctx: FreelogContext;
    nodeTestResourceProvider: IMongodbOperation<TestResourceInfo>;
    private activeThemeEfficientCountInfo;
    /**
     * 激活主题操作(此规则需要后置单独处理)
     * @param nodeId
     * @param activeThemeRuleInfo
     */
    handle(nodeId: number, activeThemeRuleInfo: TestRuleMatchInfo): Promise<TestResourceInfo>;
}
