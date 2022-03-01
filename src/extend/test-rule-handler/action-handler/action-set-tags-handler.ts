import {provide, scope} from 'midway';
import {
    TestRuleMatchInfo,
    Action,
    IActionHandler,
    ContentSetLabel,
    ActionOperationEnum
} from '../../../test-node-interface';
import {isArray} from 'lodash';
import {ScopeEnum} from 'injection';
import {FreelogContext} from 'egg-freelog-base';

@provide()
@scope(ScopeEnum.Singleton)
export class ActionSetTagsHandler implements IActionHandler<ContentSetLabel[]> {

    /**
     * 替换标签操作
     * @param ctx
     * @param testRuleInfo
     * @param action
     */
    async handle(ctx: FreelogContext, testRuleInfo: TestRuleMatchInfo, action: Action<ContentSetLabel[]>): Promise<boolean> {

        if (!isArray(action?.content)) {
            return false;
        }

        testRuleInfo.tagInfo = {tags: action.content as string[], source: testRuleInfo.id};
        testRuleInfo.operationAndActionRecords.push({
            type: ActionOperationEnum.SetLabels, data: {
                exhibitName: testRuleInfo.ruleInfo.exhibitName,
                tags: action.content
            }
        });
        return true;
    }
}
