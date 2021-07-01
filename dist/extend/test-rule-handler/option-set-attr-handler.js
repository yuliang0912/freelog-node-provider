"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OptionSetAttrHandler = void 0;
const midway_1 = require("midway");
const test_node_interface_1 = require("../../test-node-interface");
const lodash_1 = require("lodash");
let OptionSetAttrHandler = class OptionSetAttrHandler {
    constructor() {
        this.setAttrOptionEfficientCountInfo = { type: 'setAttr', count: 1 };
    }
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
        for (const [key, value] of Object.entries(testRuleInfo.testResourceOriginInfo.systemProperty ?? {})) {
            readonlyPropertyMap.set(key, { key, value, authority: 1, remark: '' });
        }
        for (const { key, defaultValue, remark, type } of testRuleInfo.testResourceOriginInfo.customPropertyDescriptors ?? []) {
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
        // 只读属性包括系统属性以及自定义属性中的只读属性.只读属性不允许修改或者删除
        const invalidKeys = ruleInfo.attrs.filter(x => readonlyPropertyMap.has(x.key));
        if (invalidKeys.length) {
            testRuleInfo.isValid = false;
            testRuleInfo.matchErrors.push(`自定义属性中存在无效操作.key值为:${invalidKeys.map(x => x.key).toString()}`);
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
OptionSetAttrHandler = __decorate([
    midway_1.provide()
], OptionSetAttrHandler);
exports.OptionSetAttrHandler = OptionSetAttrHandler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3B0aW9uLXNldC1hdHRyLWhhbmRsZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvZXh0ZW5kL3Rlc3QtcnVsZS1oYW5kbGVyL29wdGlvbi1zZXQtYXR0ci1oYW5kbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7OztBQUFBLG1DQUErQjtBQUMvQixtRUFFbUM7QUFDbkMsbUNBQStCO0FBRy9CLElBQWEsb0JBQW9CLEdBQWpDLE1BQWEsb0JBQW9CO0lBQWpDO1FBRVksb0NBQStCLEdBQTBCLEVBQUMsSUFBSSxFQUFFLFNBQVMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFDLENBQUM7SUEyRWpHLENBQUM7SUF6RUc7OztPQUdHO0lBQ0gsTUFBTSxDQUFDLFlBQStCO1FBRWxDLE1BQU0sRUFBQyxRQUFRLEVBQUMsR0FBRyxZQUFZLENBQUM7UUFDaEMsSUFBSSxDQUFDLFlBQVksQ0FBQyxPQUFPLElBQUksQ0FBQyxDQUFDLDJDQUFxQixDQUFDLEdBQUcsRUFBRSwyQ0FBcUIsQ0FBQyxLQUFLLENBQUMsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxFQUFFO1lBQ2pILE9BQU87U0FDVjtRQUVELE1BQU0sbUJBQW1CLEdBQUcsSUFBSSxHQUFHLEVBQW9DLENBQUM7UUFDeEUsTUFBTSxtQkFBbUIsR0FBRyxJQUFJLEdBQUcsRUFBb0MsQ0FBQztRQUN4RSx3RkFBd0Y7UUFDeEYsS0FBSyxNQUFNLENBQUMsR0FBRyxFQUFFLEtBQUssQ0FBQyxJQUFJLE1BQU0sQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLHNCQUFzQixDQUFDLGNBQWMsSUFBSSxFQUFFLENBQUMsRUFBRTtZQUNqRyxtQkFBbUIsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLEVBQUMsR0FBRyxFQUFFLEtBQUssRUFBRSxTQUFTLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxFQUFFLEVBQUMsQ0FBQyxDQUFDO1NBQ3hFO1FBQ0QsS0FBSyxN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