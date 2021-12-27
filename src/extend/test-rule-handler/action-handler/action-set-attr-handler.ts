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
            isRuleAdd: propertyInfo ? propertyInfo.isRuleAdd : true,
            authority: 6,
            remark: action.content.description
        });

        testRuleInfo.attrInfo = {source: testRuleInfo.id};
        return true;

        // if (readonlyPropertyMap.has(content.key)) {
        //     //         testRuleInfo.matchErrors.push(this.ctx.gettext('reflect_rule_pre_excute_error_value_access_limited', content.key));
        //     //         continue;
        //     //     }
        //     //     editablePropertyMap.set(content.key, {
        //     //         key: content.key,
        //     //         value: content.value,
        //     //         isRuleAdd: !editablePropertyKeys.has(content.key),
        //     //         authority: 6,
        //     //         remark: content.description
        //     //     });
        //
        //     if (isObject(testRuleInfo.readonlyPropertyMap) && Reflect.has(testRuleInfo.readonlyPropertyMap, deleteAttrKey)) {
        //         testRuleInfo.matchErrors.push(this.ctx.gettext('reflect_rule_pre_excute_error_value_access_limited', deleteAttrKey));
        //         return false;
        //     }
        //     if (isObject(testRuleInfo.editablePropertyMap)) {
        //         Reflect.deleteProperty(testRuleInfo.editablePropertyMap, deleteAttrKey);
        //     }
        //
        //     return true;

        // const readonlyPropertyMap = new Map<string, TestResourcePropertyInfo>();
        // const editablePropertyMap = new Map<string, TestResourcePropertyInfo>();
        // // 以下4个for循环需要严格遵守顺序.属性的优先级分别为1.系统属性 2:资源定义的不可编辑的属性 3:测试规则规定的属性 4:展品重写的属性 5:资源自定义的可编辑属性.
        // for (const [key, value] of Object.entries(testRuleInfo.rootResourceReplacer?.systemProperty ?? testRuleInfo.testResourceOriginInfo.systemProperty ?? {})) {
        //     readonlyPropertyMap.set(key, {key, value, authority: 1, remark: ''});
        // }
        // for (const {key, defaultValue, remark, type} of testRuleInfo.rootResourceReplacer?.customPropertyDescriptors ?? testRuleInfo.testResourceOriginInfo.customPropertyDescriptors ?? []) {
        //     if (readonlyPropertyMap.has(key)) {
        //         continue;
        //     }
        //     if (type === 'readonlyText') {
        //         readonlyPropertyMap.set(key, {key, value: defaultValue, authority: 1, remark});
        //     } else {
        //         editablePropertyMap.set(key, {key, value: defaultValue, authority: 2, remark});
        //     }
        // }
        // for (const {key, value, remark} of testRuleInfo?.presentableRewriteProperty ?? []) {
        //     if (readonlyPropertyMap.has(key)) {
        //         continue;
        //     }
        //     editablePropertyMap.set(key, {key, authority: 6, value, remark});
        // }
        // const editablePropertyKeys = new Set([...editablePropertyMap.keys()]);
        //
        // let hasExec = false;
        // for (const addAttrAction of ruleInfo.actions.filter(x => x.operation === ActionOperationEnum.AddAttr)) {
        //     hasExec = true;
        //     const content = addAttrAction.content as ContentAddAttr;
        //     if (readonlyPropertyMap.has(content.key)) {
        //         testRuleInfo.matchErrors.push(this.ctx.gettext('reflect_rule_pre_excute_error_value_access_limited', content.key));
        //         continue;
        //     }
        //     editablePropertyMap.set(content.key, {
        //         key: content.key,
        //         value: content.value,
        //         isRuleAdd: !editablePropertyKeys.has(content.key),
        //         authority: 6,
        //         remark: content.description
        //     });
        // }
        // for (const deleteAttrAction of ruleInfo.actions.filter(x => x.operation === ActionOperationEnum.DeleteAttr)) {
        //     hasExec = true;
        //     const content = deleteAttrAction.content as ContentDeleteAttr;
        //     const isReadonlyProperty = readonlyPropertyMap.has(content.key);
        //     if (isReadonlyProperty) {
        //         testRuleInfo.matchErrors.push(this.ctx.gettext('reflect_rule_pre_excute_error_attribute_access_limited', content.key));
        //     } else if (!editablePropertyMap.has(content.key)) {
        //         testRuleInfo.matchErrors.push(this.ctx.gettext('reflect_rule_pre_excute_error_attribute_not_exist', content.key));
        //     } else {
        //         editablePropertyMap.delete(content.key);
        //     }
        // }

        return true;

        // testRuleInfo.attrInfo = {
        //     attrs: [...readonlyPropertyMap.values(), ...editablePropertyMap.values()],
        //     source: hasExec ? testRuleInfo.id : null
        // };
        //
        // if (hasExec) {
        //     testRuleInfo.efficientInfos.push(this.setAttrOptionEfficientCountInfo);
        // }
    }
}
