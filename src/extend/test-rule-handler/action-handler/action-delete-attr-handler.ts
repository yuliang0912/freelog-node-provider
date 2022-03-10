import {provide, scope} from 'midway';
import {
    Action, ActionOperationEnum, ContentDeleteAttr, IActionHandler, TestRuleMatchInfo
} from '../../../test-node-interface';
import {FreelogContext} from 'egg-freelog-base';
import {isString} from 'lodash';
import {ScopeEnum} from 'injection';

@provide()
@scope(ScopeEnum.Singleton)
export class ActionDeleteAttrHandler implements IActionHandler<ContentDeleteAttr> {

    /**
     * 替换自定义属性操作
     * @param ctx
     * @param testRuleInfo
     * @param action
     */
    async handle(ctx: FreelogContext, testRuleInfo: TestRuleMatchInfo, action: Action<ContentDeleteAttr>) {

        if (!isString(action?.content?.key)) {
            return false;
        }

        const propertyInfo = testRuleInfo.propertyMap.get(action.content.key);
        if (!propertyInfo) {
            return true;
        }
        // 没有操作权限
        if ((propertyInfo.authority & 4) !== 4) {
            testRuleInfo.matchWarnings.push(ctx.gettext('reflect_rule_pre_excute_error_attribute_access_limited', action.content.key));
            return false;
        }
        // 删除的属性不存在
        if (!propertyInfo) {
            testRuleInfo.matchWarnings.push(ctx.gettext('reflect_rule_pre_excute_error_attribute_not_exist', action.content.key));
            return false;
        }

        testRuleInfo.propertyMap.delete(action.content.key);
        testRuleInfo.attrInfo = {source: testRuleInfo.id};
        testRuleInfo.operationAndActionRecords.push({
            type: ActionOperationEnum.DeleteAttr, data: {
                exhibitName: testRuleInfo.ruleInfo.exhibitName,
                attrKey: action.content.key
            }
        });
        return true;
    }
}
