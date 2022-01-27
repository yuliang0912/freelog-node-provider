import {provide, scope} from 'midway';
import {
    Action, ContentSetAttr, IActionHandler, TestRuleMatchInfo
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
        if (propertyInfo && (propertyInfo.authority & 2) !== 2) {
            testRuleInfo.matchErrors.push(ctx.gettext('reflect_rule_pre_excute_error_value_access_limited', action.content.key));
            return false;
        }

        testRuleInfo.propertyMap.set(action.content.key, {
            key: action.content.key,
            value: action.content.value,
            isRuleSet: true,
            authority: 6,
            remark: action.content.description
        });

        testRuleInfo.attrInfo = {source: testRuleInfo.id};

        return true;
    }
}
