import { Action, ContentSetOnline, IActionHandler, TestRuleMatchInfo } from '../../../test-node-interface';
import { FreelogContext } from 'egg-freelog-base';
export declare class ActionSetOnlineStatusHandler implements IActionHandler<ContentSetOnline> {
    /**
     * 执行替换操作
     * @param ctx
     * @param testRuleInfo
     * @param action
     */
    handle(ctx: FreelogContext, testRuleInfo: TestRuleMatchInfo, action: Action<ContentSetOnline>): Promise<boolean>;
}
