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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3B0aW9uLXNldC1hdHRyLWhhbmRsZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvZXh0ZW5kL3Rlc3QtcnVsZS1oYW5kbGVyL29wdGlvbi1zZXQtYXR0ci1oYW5kbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7OztBQUFBLG1DQUErQjtBQUMvQixtRUFLbUM7QUFDbkMsbUNBQThCO0FBRzlCLElBQWEsb0JBQW9CLEdBQWpDLE1BQWEsb0JBQW9CO0lBQWpDO1FBRVksb0NBQStCLEdBQTBCLEVBQUMsSUFBSSxFQUFFLFNBQVMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFDLENBQUM7SUF1RWpHLENBQUM7SUFyRUc7OztPQUdHO0lBQ0gsTUFBTSxDQUFDLFlBQStCO1FBRWxDLE1BQU0sRUFBQyxRQUFRLEVBQUMsR0FBRyxZQUFZLENBQUM7UUFDaEMsSUFBSSxDQUFDLFlBQVksQ0FBQyxPQUFPLElBQUksQ0FBQyxDQUFDLDJDQUFxQixDQUFDLEdBQUcsRUFBRSwyQ0FBcUIsQ0FBQyxLQUFLLENBQUMsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxFQUFFO1lBQ2pILE9BQU87U0FDVjtRQUVELE1BQU0sbUJBQW1CLEdBQTBDLElBQUksR0FBRyxFQUFvQyxDQUFDO1FBQy9HLE1BQU0sbUJBQW1CLEdBQTBDLElBQUksR0FBRyxFQUFvQyxDQUFDO1FBQy9HLHdGQUF3RjtRQUN4RixLQUFLLE1BQU0sQ0FBQyxHQUFHLEVBQUUsS0FBSyxDQUFDLElBQUksTUFBTSxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsc0JBQXNCLENBQUMsY0FBYyxJQUFJLEVBQUUsQ0FBQyxFQUFFO1lBQ2pHLG1CQUFtQixDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsRUFBQyxHQUFHLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxFQUFFLEVBQUMsQ0FBQyxDQUFDO1NBQzFEO1FBQ0QsS0FBSyxNQUFNLEVBQUMsR0FBRyxFQUFF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