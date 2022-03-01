"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActionSetTitleHandler = void 0;
const midway_1 = require("midway");
const test_node_interface_1 = require("../../../test-node-interface");
const lodash_1 = require("lodash");
const injection_1 = require("injection");
let ActionSetTitleHandler = class ActionSetTitleHandler {
    /**
     * 设置测试展品标题指令操作
     * @param ctx
     * @param testRuleInfo
     * @param action
     */
    async handle(ctx, testRuleInfo, action) {
        if (!(0, lodash_1.isString)(action?.content)) {
            return false;
        }
        testRuleInfo.titleInfo = { title: action.content, source: testRuleInfo.id };
        testRuleInfo.operationAndActionRecords.push({
            type: test_node_interface_1.ActionOperationEnum.SetTitle, data: {
                exhibitName: testRuleInfo.ruleInfo.exhibitName,
                title: action.content
            }
        });
        return true;
    }
};
ActionSetTitleHandler = __decorate([
    (0, midway_1.provide)(),
    (0, midway_1.scope)(injection_1.ScopeEnum.Singleton)
], ActionSetTitleHandler);
exports.ActionSetTitleHandler = ActionSetTitleHandler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWN0aW9uLXNldC10aXRsZS1oYW5kbGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vc3JjL2V4dGVuZC90ZXN0LXJ1bGUtaGFuZGxlci9hY3Rpb24taGFuZGxlci9hY3Rpb24tc2V0LXRpdGxlLWhhbmRsZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0FBQUEsbUNBQXNDO0FBQ3RDLHNFQU1zQztBQUN0QyxtQ0FBZ0M7QUFFaEMseUNBQW9DO0FBSXBDLElBQWEscUJBQXFCLEdBQWxDLE1BQWEscUJBQXFCO0lBRTlCOzs7OztPQUtHO0lBQ0gsS0FBSyxDQUFDLE1BQU0sQ0FBQyxHQUFtQixFQUFFLFlBQStCLEVBQUUsTUFBK0I7UUFFOUYsSUFBSSxDQUFDLElBQUEsaUJBQVEsRUFBQyxNQUFNLEVBQUUsT0FBTyxDQUFDLEVBQUU7WUFDNUIsT0FBTyxLQUFLLENBQUM7U0FDaEI7UUFFRCxZQUFZLENBQUMsU0FBUyxHQUFHLEVBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLFlBQVksQ0FBQyxFQUFFLEVBQUMsQ0FBQztRQUMxRSxZQUFZLENBQUMseUJBQXlCLENBQUMsSUFBSSxDQUFDO1lBQ3hDLElBQUksRUFBRSx5Q0FBbUIsQ0FBQyxRQUFRLEVBQUUsSUFBSSxFQUFFO2dCQUN0QyxXQUFXLEVBQUUsWUFBWSxDQUFDLFFBQVEsQ0FBQyxXQUFXO2dCQUM5QyxLQUFLLEVBQUUsTUFBTSxDQUFDLE9BQU87YUFDeEI7U0FDSixDQUFDLENBQUM7UUFDSCxPQUFPLElBQUksQ0FBQztJQUNoQixDQUFDO0NBQ0osQ0FBQTtBQXZCWSxxQkFBcUI7SUFGakMsSUFBQSxnQkFBTyxHQUFFO0lBQ1QsSUFBQSxjQUFLLEVBQUMscUJBQVMsQ0FBQyxTQUFTLENBQUM7R0FDZCxxQkFBcUIsQ0F1QmpDO0FBdkJZLHNEQUFxQiJ9