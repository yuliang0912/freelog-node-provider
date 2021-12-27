import { TestRuleMatchInfo, Action, IActionHandler, ContentSetLabel } from '../../../test-node-interface';
import { FreelogContext } from 'egg-freelog-base';
export declare class ActionSetTagsHandler implements IActionHandler<ContentSetLabel[]> {
    /**
     * 替换标签操作
     * @param ctx
     * @param testRuleInfo
     * @param action
     */
    handle(ctx: FreelogContext, testRuleInfo: TestRuleMatchInfo, action: Action<ContentSetLabel[]>): Promise<boolean>;
}
