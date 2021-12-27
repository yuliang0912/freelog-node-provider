import { TestRuleMatchInfo, Action, IActionHandler, ContentSetTitle } from '../../../test-node-interface';
import { FreelogContext } from 'egg-freelog-base';
export declare class ActionSetTitleHandler implements IActionHandler<ContentSetTitle> {
    /**
     * 设置测试展品标题指令操作
     * @param ctx
     * @param testRuleInfo
     * @param action
     */
    handle(ctx: FreelogContext, testRuleInfo: TestRuleMatchInfo, action: Action<ContentSetTitle>): Promise<boolean>;
}
