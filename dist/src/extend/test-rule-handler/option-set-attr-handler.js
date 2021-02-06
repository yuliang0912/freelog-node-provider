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
            readonlyPropertyMap.set(key, { key, value, remark: '' });
        }
        for (const { key, defaultValue, remark, type } of testRuleInfo.testResourceOriginInfo.customPropertyDescriptors ?? []) {
            if (readonlyPropertyMap.has(key)) {
                continue;
            }
            if (type === 'readonlyText') {
                readonlyPropertyMap.set(key, { key, value: defaultValue, remark });
            }
            else {
                editablePropertyMap.set(key, { key, value: defaultValue, remark });
            }
        }
        for (const { key, value, remark } of testRuleInfo?.presentableRewriteProperty ?? []) {
            if (readonlyPropertyMap.has(key)) {
                continue;
            }
            editablePropertyMap.set(key, { key, value, remark });
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
        if (!lodash_1.isArray(ruleInfo.attrs) || !ruleInfo.attrs?.length) {
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
};
OptionSetAttrHandler = __decorate([
    midway_1.provide()
], OptionSetAttrHandler);
exports.OptionSetAttrHandler = OptionSetAttrHandler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3B0aW9uLXNldC1hdHRyLWhhbmRsZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9zcmMvZXh0ZW5kL3Rlc3QtcnVsZS1oYW5kbGVyL29wdGlvbi1zZXQtYXR0ci1oYW5kbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7OztBQUFBLG1DQUErQjtBQUMvQixtRUFFbUM7QUFDbkMsbUNBQStCO0FBRy9CLElBQWEsb0JBQW9CLEdBQWpDLE1BQWEsb0JBQW9CO0lBQWpDO1FBRVksb0NBQStCLEdBQTBCLEVBQUMsSUFBSSxFQUFFLFNBQVMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFDLENBQUM7SUF1RWpHLENBQUM7SUFyRUc7OztPQUdHO0lBQ0gsTUFBTSxDQUFDLFlBQStCO1FBRWxDLE1BQU0sRUFBQyxRQUFRLEVBQUMsR0FBRyxZQUFZLENBQUM7UUFDaEMsSUFBSSxDQUFDLFlBQVksQ0FBQyxPQUFPLElBQUksQ0FBQyxDQUFDLDJDQUFxQixDQUFDLEdBQUcsRUFBRSwyQ0FBcUIsQ0FBQyxLQUFLLENBQUMsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxFQUFFO1lBQ2pILE9BQU87U0FDVjtRQUVELE1BQU0sbUJBQW1CLEdBQUcsSUFBSSxHQUFHLEVBQW9DLENBQUM7UUFDeEUsTUFBTSxtQkFBbUIsR0FBRyxJQUFJLEdBQUcsRUFBb0MsQ0FBQztRQUN4RSx3RkFBd0Y7UUFDeEYsS0FBSyxNQUFNLENBQUMsR0FBRyxFQUFFLEtBQUssQ0FBQyxJQUFJLE1BQU0sQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLHNCQUFzQixDQUFDLGNBQWMsSUFBSSxFQUFFLENBQUMsRUFBRTtZQUNqRyxtQkFBbUIsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLEVBQUMsR0FBRyxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUUsRUFBRSxFQUFDLENBQUMsQ0FBQztTQUMxRDtRQUNELEtBQUssTUFBTSxFQUFDLEdBQUcsRUFB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