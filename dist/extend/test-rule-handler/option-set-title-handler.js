"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OptionSetTitleHandler = void 0;
const midway_1 = require("midway");
const test_node_interface_1 = require("../../test-node-interface");
const lodash_1 = require("lodash");
let OptionSetTitleHandler = class OptionSetTitleHandler {
    setTitleOptionEfficientCountInfo = { type: 'setTitle', count: 1 };
    /**
     * 替换展品标题操作
     * @param testRuleInfo
     */
    handle(testRuleInfo) {
        const { ruleInfo } = testRuleInfo;
        if (!testRuleInfo.isValid || !(0, lodash_1.isString)(ruleInfo.title) || ![test_node_interface_1.TestNodeOperationEnum.Add, test_node_interface_1.TestNodeOperationEnum.Alter].includes(ruleInfo.operation)) {
            return;
        }
        testRuleInfo.titleInfo = { title: testRuleInfo.ruleInfo.title, source: testRuleInfo.id };
        testRuleInfo.efficientInfos.push(this.setTitleOptionEfficientCountInfo);
    }
};
OptionSetTitleHandler = __decorate([
    (0, midway_1.provide)()
], OptionSetTitleHandler);
exports.OptionSetTitleHandler = OptionSetTitleHandler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3B0aW9uLXNldC10aXRsZS1oYW5kbGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2V4dGVuZC90ZXN0LXJ1bGUtaGFuZGxlci9vcHRpb24tc2V0LXRpdGxlLWhhbmRsZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0FBQUEsbUNBQStCO0FBQy9CLG1FQUEwRztBQUMxRyxtQ0FBZ0M7QUFHaEMsSUFBYSxxQkFBcUIsR0FBbEMsTUFBYSxxQkFBcUI7SUFFdEIsZ0NBQWdDLEdBQTBCLEVBQUMsSUFBSSxFQUFFLFVBQVUsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFDLENBQUM7SUFFL0Y7OztPQUdHO0lBQ0gsTUFBTSxDQUFDLFlBQStCO1FBRWxDLE1BQU0sRUFBQyxRQUFRLEVBQUMsR0FBRyxZQUFZLENBQUM7UUFDaEMsSUFBSSxDQUFDLFlBQVksQ0FBQyxPQUFPLElBQUksQ0FBQyxJQUFBLGlCQUFRLEVBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQywyQ0FBcUIsQ0FBQyxHQUFHLEVBQUUsMkNBQXFCLENBQUMsS0FBSyxDQUFDLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsRUFBRTtZQUM5SSxPQUFPO1NBQ1Y7UUFFRCxZQUFZLENBQUMsU0FBUyxHQUFHLEVBQUMsS0FBSyxFQUFFLFlBQVksQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFLE1BQU0sRUFBRSxZQUFZLENBQUMsRUFBRSxFQUFDLENBQUM7UUFDdkYsWUFBWSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLGdDQUFnQyxDQUFDLENBQUM7SUFDNUUsQ0FBQztDQUNKLENBQUE7QUFsQlkscUJBQXFCO0lBRGpDLElBQUEsZ0JBQU8sR0FBRTtHQUNHLHFCQUFxQixDQWtCakM7QUFsQlksc0RBQXFCIn0=