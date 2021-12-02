"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OptionSetTagsHandler = void 0;
const midway_1 = require("midway");
const test_node_interface_1 = require("../../test-node-interface");
const lodash_1 = require("lodash");
let OptionSetTagsHandler = class OptionSetTagsHandler {
    setTagsOptionEfficientCountInfo = { type: 'setTags', count: 1 };
    /**
     * 替换标签操作
     * @param testRuleInfo
     */
    handle(testRuleInfo) {
        const { ruleInfo } = testRuleInfo;
        if (!testRuleInfo.isValid || !(0, lodash_1.isArray)(ruleInfo.labels) || ![test_node_interface_1.TestNodeOperationEnum.Add, test_node_interface_1.TestNodeOperationEnum.Alter].includes(ruleInfo.operation)) {
            return;
        }
        testRuleInfo.tagInfo = { tags: testRuleInfo.ruleInfo.labels, source: testRuleInfo.id };
        testRuleInfo.efficientInfos.push(this.setTagsOptionEfficientCountInfo);
    }
};
OptionSetTagsHandler = __decorate([
    (0, midway_1.provide)()
], OptionSetTagsHandler);
exports.OptionSetTagsHandler = OptionSetTagsHandler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3B0aW9uLXNldC10YWdzLWhhbmRsZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvZXh0ZW5kL3Rlc3QtcnVsZS1oYW5kbGVyL29wdGlvbi1zZXQtdGFncy1oYW5kbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7OztBQUFBLG1DQUErQjtBQUMvQixtRUFBMEc7QUFDMUcsbUNBQThCO0FBRzlCLElBQWEsb0JBQW9CLEdBQWpDLE1BQWEsb0JBQW9CO0lBRXJCLCtCQUErQixHQUEwQixFQUFDLElBQUksRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBQyxDQUFDO0lBRTdGOzs7T0FHRztJQUNILE1BQU0sQ0FBQyxZQUErQjtRQUVsQyxNQUFNLEVBQUMsUUFBUSxFQUFDLEdBQUcsWUFBWSxDQUFDO1FBQ2hDLElBQUksQ0FBQyxZQUFZLENBQUMsT0FBTyxJQUFJLENBQUMsSUFBQSxnQkFBTyxFQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsMkNBQXFCLENBQUMsR0FBRyxFQUFFLDJDQUFxQixDQUFDLEtBQUssQ0FBQyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLEVBQUU7WUFDOUksT0FBTztTQUNWO1FBRUQsWUFBWSxDQUFDLE9BQU8sR0FBRyxFQUFDLElBQUksRUFBRSxZQUFZLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxNQUFNLEVBQUUsWUFBWSxDQUFDLEVBQUUsRUFBQyxDQUFDO1FBQ3JGLFlBQVksQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQywrQkFBK0IsQ0FBQyxDQUFDO0lBQzNFLENBQUM7Q0FDSixDQUFBO0FBbEJZLG9CQUFvQjtJQURoQyxJQUFBLGdCQUFPLEdBQUU7R0FDRyxvQkFBb0IsQ0FrQmhDO0FBbEJZLG9EQUFvQiJ9