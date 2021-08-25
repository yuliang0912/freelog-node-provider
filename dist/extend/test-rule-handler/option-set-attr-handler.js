"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OptionSetAttrHandler = void 0;
const midway_1 = require("midway");
const test_node_interface_1 = require("../../test-node-interface");
const lodash_1 = require("lodash");
let OptionSetAttrHandler = class OptionSetAttrHandler {
    ctx;
    setAttrOptionEfficientCountInfo = { type: 'setAttr', count: 1 };
    /**
     * 替换自定义属性操作
     * @param testRuleInfo
     */
    handle(testRuleInfo) {
        const { ruleInfo } = testRuleInfo;
        if (!testRuleInfo.isValid || ![test_node_interface_1.TestNodeOperationEnum.Add, test_node_interface_1.TestNodeOperationEnum.Alter].includes(ruleInfo.operation)) {
            return;
        }
        const readonlyPropertyMap = new Map();
        const editablePropertyMap = new Map();
        // 以下4个for循环需要严格遵守顺序.属性的优先级分别为1.系统属性 2:资源定义的不可编辑的属性 3:测试规则规定的属性 4:展品重写的属性 5:资源自定义的可编辑属性.
        for (const [key, value] of Object.entries(testRuleInfo.rootResourceReplacer?.systemProperty ?? testRuleInfo.testResourceOriginInfo.systemProperty ?? {})) {
            readonlyPropertyMap.set(key, { key, value, authority: 1, remark: '' });
        }
        for (const { key, defaultValue, remark, type } of testRuleInfo.rootResourceReplacer?.customPropertyDescriptors ?? testRuleInfo.testResourceOriginInfo.customPropertyDescriptors ?? []) {
            if (readonlyPropertyMap.has(key)) {
                continue;
            }
            if (type === 'readonlyText') {
                readonlyPropertyMap.set(key, { key, value: defaultValue, authority: 1, remark });
            }
            else {
                editablePropertyMap.set(key, { key, value: defaultValue, authority: 2, remark });
            }
        }
        for (const { key, value, remark } of testRuleInfo?.presentableRewriteProperty ?? []) {
            if (readonlyPropertyMap.has(key)) {
                continue;
            }
            editablePropertyMap.set(key, { key, authority: 6, value, remark });
        }
        const editablePropertyKeys = new Set([...editablePropertyMap.keys()]);
        for (const attrRule of ruleInfo.attrs ?? []) {
            const isReadonlyProperty = readonlyPropertyMap.has(attrRule.key);
            if (attrRule.operation === 'delete') {
                if (isReadonlyProperty) {
                    testRuleInfo.matchErrors.push(this.ctx.gettext('reflect_rule_pre_excute_error_attribute_access_limited', attrRule.key));
                }
                else if (!editablePropertyMap.has(attrRule.key)) {
                    testRuleInfo.matchErrors.push(this.ctx.gettext('reflect_rule_pre_excute_error_attribute_not_exist', attrRule.key));
                }
                else {
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
        if (!lodash_1.isArray(ruleInfo.attrs) || !ruleInfo.attrs?.length) {
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
};
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], OptionSetAttrHandler.prototype, "ctx", void 0);
OptionSetAttrHandler = __decorate([
    midway_1.provide()
], OptionSetAttrHandler);
exports.OptionSetAttrHandler = OptionSetAttrHandler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3B0aW9uLXNldC1hdHRyLWhhbmRsZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvZXh0ZW5kL3Rlc3QtcnVsZS1oYW5kbGVyL29wdGlvbi1zZXQtYXR0ci1oYW5kbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztBQUFBLG1DQUF1QztBQUN2QyxtRUFLbUM7QUFDbkMsbUNBQStCO0FBSS9CLElBQWEsb0JBQW9CLEdBQWpDLE1BQWEsb0JBQW9CO0lBRzdCLEdBQUcsQ0FBaUI7SUFFWiwrQkFBK0IsR0FBMEIsRUFBQyxJQUFJLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUMsQ0FBQztJQUU3Rjs7O09BR0c7SUFDSCxNQUFNLENBQUMsWUFBK0I7UUFFbEMsTUFBTSxFQUFDLFFBQVEsRUFBQyxHQUFHLFlBQVksQ0FBQztRQUNoQyxJQUFJLENBQUMsWUFBWSxDQUFDLE9BQU8sSUFBSSxDQUFDLENBQUMsMkNBQXFCLENBQUMsR0FBRyxFQUFFLDJDQUFxQixDQUFDLEtBQUssQ0FBQyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLEVBQUU7WUFDakgsT0FBTztTQUNWO1FBRUQsTUFBTSxtQkFBbUIsR0FBRyxJQUFJLEdBQUcsRUFBb0MsQ0FBQztRQUN4RSxNQUFNLG1CQUFtQixHQUFHLElBQUksR0FBRyxFQUFvQyxDQUFDO1FBQ3hFLHdGQUF3RjtRQUN4RixLQUFLLE1BQU0sQ0FBQyxHQUFHLEVBQUUsS0FBSyxDQUFDLElBQUksTUFBTSxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsb0JBQW9CLEVBQUUsY0FBYyxJQUFJLFlBQVksQ0FBQyxzQkFBc0IsQ0FBQyxjQUFjLElBQUksRUFBRSxDQUFDLEVBQUU7WUFDdEosbUJBQW1CLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxFQUFDLEdBQUcsRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFFLENBQUMsRUFBRSxNQUFNLEVBQUUsRUFB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