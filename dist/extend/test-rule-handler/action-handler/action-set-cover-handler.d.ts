import { Action, ContentSetCover, IActionHandler, TestRuleMatchInfo } from '../../../test-node-interface';
import { FreelogContext } from 'egg-freelog-base';
export declare class ActionSetCoverHandler implements IActionHandler<ContentSetCover> {
    /**
     * 替换展品封面操作
     * @param ctx
     * @param testRuleInfo
     * @param action
     */
    handle(ctx: FreelogContext, testRuleInfo: TestRuleMatchInfo, action: Action<ContentSetCover>): Promise<boolean>;
}
