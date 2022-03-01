"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActionSetTagsHandler = void 0;
const midway_1 = require("midway");
const test_node_interface_1 = require("../../../test-node-interface");
const lodash_1 = require("lodash");
const injection_1 = require("injection");
let ActionSetTagsHandler = class ActionSetTagsHandler {
    /**
     * 替换标签操作
     * @param ctx
     * @param testRuleInfo
     * @param action
     */
    async handle(ctx, testRuleInfo, action) {
        if (!(0, lodash_1.isArray)(action?.content)) {
            return false;
        }
        testRuleInfo.tagInfo = { tags: action.content, source: testRuleInfo.id };
        testRuleInfo.operationAndActionRecords.push({
            type: test_node_interface_1.ActionOperationEnum.SetLabels, data: {
                exhibitName: testRuleInfo.ruleInfo.exhibitName,
                tags: action.content
            }
        });
        return true;
    }
};
ActionSetTagsHandler = __decorate([
    (0, midway_1.provide)(),
    (0, midway_1.scope)(injection_1.ScopeEnum.Singleton)
], ActionSetTagsHandler);
exports.ActionSetTagsHandler = ActionSetTagsHandler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWN0aW9uLXNldC10YWdzLWhhbmRsZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9zcmMvZXh0ZW5kL3Rlc3QtcnVsZS1oYW5kbGVyL2FjdGlvbi1oYW5kbGVyL2FjdGlvbi1zZXQtdGFncy1oYW5kbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7OztBQUFBLG1DQUFzQztBQUN0QyxzRUFNc0M7QUFDdEMsbUNBQStCO0FBQy9CLHlDQUFvQztBQUtwQyxJQUFhLG9CQUFvQixHQUFqQyxNQUFhLG9CQUFvQjtJQUU3Qjs7Ozs7T0FLRztJQUNILEtBQUssQ0FBQyxNQUFNLENBQUMsR0FBbUIsRUFBRSxZQUErQixFQUFFLE1BQWlDO1FBRWhHLElBQUksQ0FBQyxJQUFBLGdCQUFPLEVBQUMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxFQUFFO1lBQzNCLE9BQU8sS0FBSyxDQUFDO1NBQ2hCO1FBRUQsWUFBWSxDQUFDLE9BQU8sR0FBRyxFQUFDLElBQUksRUFBRSxNQUFNLENBQUMsT0FBbUIsRUFBRSxNQUFNLEVBQUUsWUFBWSxDQUFDLEVBQUUsRUFBQyxDQUFDO1FBQ25GLFlBQVksQ0FBQyx5QkFBeUIsQ0FBQyxJQUFJLENBQUM7WUFDeEMsSUFBSSxFQUFFLHlDQUFtQixDQUFDLFNBQVMsRUFBRSxJQUFJLEVBQUU7Z0JBQ3ZDLFdBQVcsRUFBRSxZQUFZLENBQUMsUUFBUSxDQUFDLFdBQVc7Z0JBQzlDLElBQUksRUFBRSxNQUFNLENBQUMsT0FBTzthQUN2QjtTQUNKLENBQUMsQ0FBQztRQUNILE9BQU8sSUFBSSxDQUFDO0lBQ2hCLENBQUM7Q0FDSixDQUFBO0FBdkJZLG9CQUFvQjtJQUZoQyxJQUFBLGdCQUFPLEdBQUU7SUFDVCxJQUFBLGNBQUssRUFBQyxxQkFBUyxDQUFDLFNBQVMsQ0FBQztHQUNkLG9CQUFvQixDQXVCaEM7QUF2Qlksb0RBQW9CIn0=