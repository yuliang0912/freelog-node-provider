import {provide, scope} from 'midway';
import {
    Action, ActionOperationEnum, ContentSetAttr, IActionHandler, TestRuleMatchInfo
} from '../../../test-node-interface';
import {FreelogContext} from 'egg-freelog-base';
import {isObject} from 'lodash';
import {ScopeEnum} from 'injection';

@provide()
@scope(ScopeEnum.Singleton)
export class ActionSetAttrHandler implements IActionHandler<ContentSetAttr> {

    /**
     * 替换自定义属性操作
     * @param ctx
     * @param testRuleInfo
     * @param action
     */
    async handle(ctx: FreelogContext, testRuleInfo: TestRuleMatchInfo, action: Action<ContentSetAttr>) {

        if (!isObject(action?.content)) {
            return false;
        }

        const propertyInfo = testRuleInfo.propertyMap.get(action.content.key);
        if (!propertyInfo) {
            testRuleInfo.propertyMap.set(action.content.key, {
                key: action.content.key,
                value: action.content.value,
                type: 'editableText',
                isRuleSet: true,
                isRuleAdd: true,
                authority: 6,
                remark: action.content.description
            });
            testRuleInfo.attrInfo = {source: testRuleInfo.id};
            return true;
        }

        // 不具备编辑权限(主要是系统属性以及自定义的只读属性).
        if ((propertyInfo.authority & 2) !== 2) {
            testRuleInfo.matchErrors.push(ctx.gettext('reflect_rule_pre_excute_error_value_access_limited', action.content.key));
            return false;
        }
        // 是下拉框,但是设定的值不在规定范围内.
        if (propertyInfo.type === 'select' && !propertyInfo.candidateItems?.includes(action.content.value)) {
            testRuleInfo.matchErrors.push(ctx.gettext('reflect_rule_pre_excute_error_value_not_match', action.content.key));
            return false;
        }
        propertyInfo.value = action.content.value;
        propertyInfo.remark = action.content.description;
        testRuleInfo.attrInfo = {source: testRuleInfo.id};
        testRuleInfo.operationAndActionRecords.push({
            type: ActionOperationEnum.AddAttr, data: {
                exhibitName: testRuleInfo.ruleInfo.exhibitName,
                attrKey: action.content.key
            }
        });
        return true;
    }
}
