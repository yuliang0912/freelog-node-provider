import {provide} from "midway";
import {
    TestRuleMatchInfo, TestRuleEfficientInfo, TestResourcePropertyInfo, TestNodeOperationEnum
} from "../../test-node-interface";
import {isArray} from 'lodash';

@provide()
export class OptionSetAttrHandler {

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
        for (const [key, value] of Object.entries(testRuleInfo.testResourceOriginInfo.systemProperty ?? {})) {
            readonlyPropertyMap.set(key, {key, value, remark: ''});
        }
        for (const {key, defaultValue, remark, type} of testRuleInfo.testResourceOriginInfo.customPropertyDescriptors ?? []) {
            if (readonlyPropertyMap.has(key)) {
                continue;
            }
            if (type === 'readonlyText') {
                readonlyPropertyMap.set(key, {key, value: defaultValue, remark});
            } else {
                editablePropertyMap.set(key, {key, value: defaultValue, remark});
            }
        }
        for (const {key, value, remark} of testRuleInfo?.presentableRewriteProperty ?? []) {
            if (readonlyPropertyMap.has(key)) {
                continue;
            }
            editablePropertyMap.set(key, {key, value, remark});
        }
        for (const attrRule of ruleInfo.attrs ?? []) {
            if (attrRule.operation === 'delete') {
                editablePropertyMap.delete(attrRule.key);
                continue;
            }
            if (readonlyPropertyMap.has(attrRule.key)) {
                continue;
            }
            editablePropertyMap.set(attrRule.key, {
                key: attrRule.key,
                value: attrRule.value,
                remark: attrRule.description
            });
        }

        if (!isArray(ruleInfo.attrs) || !ruleInfo.attrs?.length) {
            testRuleInfo.attrInfo = {
                attrs: [...readonlyPropertyMap.values(), ...editablePropertyMap.values()], source: null
            };
            return;
        }

        // 只读属性包括系统属性以及自定义属性中的只读属性.只读属性不允许修改或者删除
        const invalidKeys = ruleInfo.attrs.filter(x => readonlyPropertyMap.has(x.key));
        if (invalidKeys.length) {
            testRuleInfo.matchErrors.push(`自定义属性中存在无效操作.key值为:${invalidKeys.toString()}`);
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
