import {provide, scope} from 'midway';
import {TestRuleMatchInfo, Action, IActionHandler, ContentSetTitle} from '../../../test-node-interface';
import {isString} from 'lodash';
import {FreelogContext} from 'egg-freelog-base';
import {ScopeEnum} from 'injection';

@provide()
@scope(ScopeEnum.Singleton)
export class ActionSetTitleHandler implements IActionHandler<ContentSetTitle> {

    /**
     * 设置测试展品标题指令操作
     * @param ctx
     * @param testRuleInfo
     * @param action
     */
    async handle(ctx: FreelogContext, testRuleInfo: TestRuleMatchInfo, action: Action<ContentSetTitle>): Promise<boolean> {

        if (!isString(action?.content)) {
            return false;
        }

        testRuleInfo.titleInfo = {title: action.content, source: testRuleInfo.id};
        return true;
    }
}
