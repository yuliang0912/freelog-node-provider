import {isString} from 'lodash';
import {provide, scope} from 'midway';
import {Action, ContentSetCover, IActionHandler, TestRuleMatchInfo} from '../../../test-node-interface';
import {ScopeEnum} from 'injection';
import {FreelogContext} from 'egg-freelog-base';

@provide()
@scope(ScopeEnum.Singleton)
export class ActionSetCoverHandler implements IActionHandler<ContentSetCover> {

    /**
     * 替换展品封面操作
     * @param ctx
     * @param testRuleInfo
     * @param action
     */
    async handle(ctx: FreelogContext, testRuleInfo: TestRuleMatchInfo, action: Action<ContentSetCover>): Promise<boolean> {
        if (!isString(action?.content)) {
            return false;
        }

        testRuleInfo.coverInfo = {coverImages: [action.content], source: testRuleInfo.id};
        return true;
    }
}
