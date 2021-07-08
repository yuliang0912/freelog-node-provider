import {inject, provide} from 'midway';
import {
    TestNodeOperationEnum,
    TestResourcePropertyInfo,
    TestRuleEfficientInfo,
    TestRuleMatchInfo
} from '../../test-node-interface';
import {isArray} from 'lodash';
import {FreelogContext} from 'egg-freelog-base';

@provide()
export class OptionSetAttrHandler {

    @inject()
    ctx: FreelogContext;

    private setAttrOptionEfficientCountInfo: TestRuleEfficientInfo = {type: 'setAttr', count: 1};

    /**
     * 替换自定义属性操作
     * @param testRuleInfo
     */
    handle(testRuleInfo: TestRuleMatchInfo) {

        const {ruleInfo} = testRuleInfo;
        if (!testRuleInfo.isValid || ![TestNodeOperationEnum.Add, TestNodeOperationEnum.Alter].includes(ruleInfo.operation)) {
            return;
        }

        const readonlyPropertyMap = new Map<string, TestResourcePropertyInfo>();
        const editablePropertyMap = new Map<string, TestResourcePropertyInfo>();
        // 以下4个for循环需要严格遵守顺序.属性的优先级分别为1.系统属性 2:资源定义的不可编辑的属性 3:测试规则规定的属性 4:展品重写的属性 5:资源自定义的可编辑属性.
        for (const [key, value] of Object.entries(testRuleInfo.rootResourceReplacer?.systemProperty ?? testRuleInfo.testResourceOriginInfo.systemProperty ?? {})) {
            readonlyPropertyMap.set(key, {key, value, authority: 1, remark: ''});
        }
        for (const {key, defaultValue, remark, type} of testRuleInfo.rootResourceReplacer?.customPropertyDescriptors ?? testRuleInfo.testResourceOriginInfo.customPropertyDescriptors ?? []) {
            if (readonlyPropertyMap.has(key)) {
                continue;
            }
            if (type === 'readonlyText') {
                readonlyPropertyMap.set(key, {key, value: defaultValue, authority: 1, remark});
            } else {
                editablePropertyMap.set(key, {key, value: defaultValue, authority: 2, remark});
            }
        }
        for (const {key, value, remark} of testRuleInfo?.presentableRewriteProperty ?? []) {
            if (readonlyPropertyMap.has(key)) {
                continue;
            }
            editablePropertyMap.set(key, {key, authority: 6, value, remark});
        }
        const editablePropertyKeys = new Set([...editablePropertyMap.keys()]);
        for (const attrRule of ruleInfo.attrs ?? []) {
            const isReadonlyProperty = readonlyPropertyMap.has(attrRule.key);
            if (attrRule.operation === 'delete') {
                if (isReadonlyProperty) {
                    testRuleInfo.matchErrors.push(this.ctx.gettext('reflect_rule_pre_excute_error_attribute_access_limited', attrRule.key));
                } else if (!editablePropertyMap.has(attrRule.key)) {
                    testRuleInfo.matchErrors.push(this.ctx.gettext('reflect_rule_pre_excute_error_attribute_not_exist', attrRule.key));
                } else {
                    editablePropertyMap.delete(attrRule.key);
                }
                continue;
            }
            if (readonlyPropertyMap.has(attrRule.key)) {
                testRuleInfo.matchErrors.push(this.ctx.gettext('reflect_rule_pre_excute_error_value_access_limited', attrRule.key));
                continue;
            }
            editablePropertyMap.set(attrRule.key, {
                key: attrRule.key,
                value: attrRule.value,
                isRuleAdd: !editablePropertyKeys.has(attrRule.key),
                authority: 6,
                remark: attrRule.description
            });
        }

        if (!isArray(ruleInfo.attrs) || !ruleInfo.attrs?.length) {
            testRuleInfo.attrInfo = {
                attrs: [...readonlyPropertyMap.values(), ...editablePropertyMap.values()], source: null
            };
            return;
        }

        testRuleInfo.attrInfo = {
            attrs: [...readonlyPropertyMap.values(), ...editablePropertyMap.values()],
            source: testRuleInfo.id
        };
        if (testRuleInfo.attrInfo.attrs.length) {
            testRuleInfo.efficientInfos.push(this.setAttrOptionEfficientCountInfo);
        }
    }
}
