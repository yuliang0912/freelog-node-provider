import {first, isBoolean} from 'lodash';
import {provide, scope} from 'midway';
import {
    Action,
    ActionOperationEnum,
    ContentSetOnline,
    IActionHandler,
    TestRuleMatchInfo
} from '../../../test-node-interface';
import {FreelogContext} from 'egg-freelog-base';
import {ScopeEnum} from 'injection';

@provide()
@scope(ScopeEnum.Singleton)
export class ActionSetOnlineStatusHandler implements IActionHandler<ContentSetOnline> {

    /**
     * 执行替换操作
     * @param ctx
     * @param testRuleInfo
     * @param action
     */
    async handle(ctx: FreelogContext, testRuleInfo: TestRuleMatchInfo, action: Action<ContentSetOnline>): Promise<boolean> {

        if (!isBoolean(action?.content)) {
            return false;
        }

        const operationAndActionRecord = {
            type: ActionOperationEnum.Online, data: {
                exhibitName: testRuleInfo.ruleInfo.exhibitName,
                onlineStatus: action.content
            }
        } as any;
        testRuleInfo.operationAndActionRecords.push(operationAndActionRecord);
        // 主题不允许上下线操作.只能通过激活操作
        if (first<string>(testRuleInfo.testResourceOriginInfo.resourceType) === '主题') {
            operationAndActionRecord.warningMsg = action.warningMsg = ctx.gettext(`reflect_rule_pre_excute_error_show_hide_unavailable_for_theme`, testRuleInfo.ruleInfo.exhibitName);
            testRuleInfo.matchWarnings.push(action.warningMsg);
            return false;
        }

        testRuleInfo.onlineStatusInfo = {status: action.content ? 1 : 0, source: testRuleInfo.id};
        return true;
    }
}
