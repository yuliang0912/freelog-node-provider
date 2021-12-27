import { Action, ContentSetAttr, IActionHandler, TestRuleMatchInfo } from '../../../test-node-interface';
import { FreelogContext } from 'egg-freelog-base';
export declare class ActionSetAttrHandler implements IActionHandler<ContentSetAttr> {
    /**
     * 替换自定义属性操作
     * @param ctx
     * @param testRuleInfo
     * @param action
     */
    handle(ctx: FreelogContext, testRuleInfo: TestRuleMatchInfo, action: Action<ContentSetAttr>): Promise<boolean>;
}
