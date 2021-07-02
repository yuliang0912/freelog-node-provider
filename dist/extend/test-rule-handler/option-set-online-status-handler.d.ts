import { TestRuleMatchInfo } from '../../test-node-interface';
import { FreelogContext } from 'egg-freelog-base';
export declare class OptionSetOnlineStatusHandler {
    ctx: FreelogContext;
    private setOnlineStatusOptionEfficientCountInfo;
    /**
     * 执行替换操作
     * @param testRuleInfo
     */
    handle(testRuleInfo: TestRuleMatchInfo): void;
}
