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
exports.ActionHandler = void 0;
const midway_1 = require("midway");
const test_node_interface_1 = require("../../../test-node-interface");
let ActionHandler = class ActionHandler {
    actionReplaceHandler;
    actionSetAttrHandler;
    actionSetTagsHandler;
    actionSetTitleHandler;
    actionSetCoverHandler;
    actionDeleteAttrHandler;
    actionSetOnlineStatusHandler;
    actionHandlerMap = new Map();
    __initActionHandler__() {
        this.actionHandlerMap.set(test_node_interface_1.ActionOperationEnum.AddAttr, this.actionSetAttrHandler);
        this.actionHandlerMap.set(test_node_interface_1.ActionOperationEnum.DeleteAttr, this.actionDeleteAttrHandler);
        this.actionHandlerMap.set(test_node_interface_1.ActionOperationEnum.Online, this.actionSetOnlineStatusHandler);
        this.actionHandlerMap.set(test_node_interface_1.ActionOperationEnum.SetCover, this.actionSetCoverHandler);
        this.actionHandlerMap.set(test_node_interface_1.ActionOperationEnum.SetLabels, this.actionSetTagsHandler);
        this.actionHandlerMap.set(test_node_interface_1.ActionOperationEnum.SetTitle, this.actionSetTitleHandler);
        this.actionHandlerMap.set(test_node_interface_1.ActionOperationEnum.Replace, this.actionReplaceHandler);
    }
    /**
     * 映射规则指令处理
     * @param ctx
     * @param testRuleInfo
     * @param action
     */
    async handle(ctx, testRuleInfo, action) {
        if (!testRuleInfo.isValid || !this.actionHandlerMap.has(action.operation)) {
            return false;
        }
        const result = await this.actionHandlerMap.get(action.operation).handle(ctx, testRuleInfo, action);
        if (result) {
            let currentOperationEfficientInfo = testRuleInfo.efficientInfos.find(x => x.type === action.operation);
            if (!currentOperationEfficientInfo) {
                currentOperationEfficientInfo = { type: action.operation, count: 1 };
                testRuleInfo.efficientInfos.push(currentOperationEfficientInfo);
            }
            else {
                currentOperationEfficientInfo.count += 1;
            }
        }
        return result;
        // switch (action.operation) {
        //     case ActionOperationEnum.AddAttr:
        //         return this.actionSetAttrHandler.handle(ctx, testRuleInfo, action);
        //     case ActionOperationEnum.DeleteAttr:
        //         return this.actionDeleteAttrHandler.handle(ctx, testRuleInfo, action);
        //     case ActionOperationEnum.Online:
        //         return this.actionSetOnlineStatusHandler.handle(ctx, testRuleInfo, action);
        //     case ActionOperationEnum.SetCover:
        //         return this.actionSetCoverHandler.handle(ctx, testRuleInfo, action);
        //     case ActionOperationEnum.SetLabels:
        //         return this.actionSetTagsHandler.handle(ctx, testRuleInfo, action);
        //     case ActionOperationEnum.SetTitle:
        //         return this.actionSetTitleHandler.handle(ctx, testRuleInfo, action);
        //     case ActionOperationEnum.Replace:
        //         return this.actionReplaceHandler.handle(ctx, testRuleInfo, action);
        //     default:
        //         return true;
        // }
    }
};
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", Object)
], ActionHandler.prototype, "actionReplaceHandler", void 0);
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", Object)
], ActionHandler.prototype, "actionSetAttrHandler", void 0);
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", Object)
], ActionHandler.prototype, "actionSetTagsHandler", void 0);
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", Object)
], ActionHandler.prototype, "actionSetTitleHandler", void 0);
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", Object)
], ActionHandler.prototype, "actionSetCoverHandler", void 0);
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", Object)
], ActionHandler.prototype, "actionDeleteAttrHandler", void 0);
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", Object)
], ActionHandler.prototype, "actionSetOnlineStatusHandler", void 0);
__decorate([
    (0, midway_1.init)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ActionHandler.prototype, "__initActionHandler__", null);
ActionHandler = __decorate([
    (0, midway_1.provide)()
], ActionHandler);
exports.ActionHandler = ActionHandler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9zcmMvZXh0ZW5kL3Rlc3QtcnVsZS1oYW5kbGVyL2FjdGlvbi1oYW5kbGVyL2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztBQUFBLG1DQUE2QztBQUM3QyxzRUFJc0M7QUFJdEMsSUFBYSxhQUFhLEdBQTFCLE1BQWEsYUFBYTtJQUd0QixvQkFBb0IsQ0FBaUM7SUFFckQsb0JBQW9CLENBQWlDO0lBRXJELG9CQUFvQixDQUFrQztJQUV0RCxxQkFBcUIsQ0FBa0M7SUFFdkQscUJBQXFCLENBQWtDO0lBRXZELHVCQUF1QixDQUFvQztJQUUzRCw0QkFBNEIsQ0FBbUM7SUFFL0QsZ0JBQWdCLEdBQUcsSUFBSSxHQUFHLEVBQTRDLENBQUM7SUFHdkUscUJBQXFCO1FBQ2pCLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMseUNBQW1CLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO1FBQ2xGLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMseUNBQW1CLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDO1FBQ3hGLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMseUNBQW1CLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyw0QkFBNEIsQ0FBQyxDQUFDO1FBQ3pGLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMseUNBQW1CLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO1FBQ3BGLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMseUNBQW1CLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO1FBQ3BGLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMseUNBQW1CLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO1FBQ3BGLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMseUNBQW1CLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO0lBQ3RGLENBQUM7SUFFRDs7Ozs7T0FLRztJQUNILEtBQUssQ0FBQyxNQUFNLENBQUMsR0FBbUIsRUFBRSxZQUErQixFQUFFLE1BQW1CO1FBRWxGLElBQUksQ0FBQyxZQUFZLENBQUMsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLEVBQUU7WUFDdkUsT0FBTyxLQUFLLENBQUM7U0FDaEI7UUFFRCxNQUFNLE1BQU0sR0FBRyxNQUFNLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsWUFBWSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQ25HLElBQUksTUFBTSxFQUFFO1lBQ1IsSUFBSSw2QkFBNkIsR0FBRyxZQUFZLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLEtBQUssTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBQ3ZHLElBQUksQ0FBQyw2QkFBNkIsRUFBRTtnQkFDaEMsNkJBQTZCLEdBQUcsRUFBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLFNBQVMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFDLENBQUM7Z0JBQ25FLFlBQVksQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLDZCQUE2QixDQUFDLENBQUM7YUFDbkU7aUJBQU07Z0JBQ0gsNkJBQTZCLENBQUMsS0FBSyxJQUFJLENBQUMsQ0FBQzthQUM1QztTQUNKO1FBQ0QsT0FBTyxNQUFNLENBQUM7UUFFZCw4QkFBOEI7UUFDOUIsd0NBQXdDO1FBQ3hDLDhFQUE4RTtRQUM5RSwyQ0FBMkM7UUFDM0MsaUZBQWlGO1FBQ2pGLHVDQUF1QztRQUN2QyxzRkFBc0Y7UUFDdEYseUNBQXlDO1FBQ3pDLCtFQUErRTtRQUMvRSwwQ0FBMEM7UUFDMUMsOEVBQThFO1FBQzlFLHlDQUF5QztRQUN6QywrRUFBK0U7UUFDL0Usd0NBQXdDO1FBQ3hDLDhFQUE4RTtRQUM5RSxlQUFlO1FBQ2YsdUJBQXVCO1FBQ3ZCLElBQUk7SUFDUixDQUFDO0NBQ0osQ0FBQTtBQXRFRztJQURDLElBQUEsZUFBTSxHQUFFOzsyREFDNEM7QUFFckQ7SUFEQyxJQUFBLGVBQU0sR0FBRTs7MkRBQzRDO0FBRXJEO0lBREMsSUFBQSxlQUFNLEdBQUU7OzJEQUM2QztBQUV0RDtJQURDLElBQUEsZUFBTSxHQUFFOzs0REFDOEM7QUFFdkQ7SUFEQyxJQUFBLGVBQU0sR0FBRTs7NERBQzhDO0FBRXZEO0lBREMsSUFBQSxlQUFNLEdBQUU7OzhEQUNrRDtBQUUzRDtJQURDLElBQUEsZUFBTSxHQUFFOzttRUFDc0Q7QUFLL0Q7SUFEQyxJQUFBLGFBQUksR0FBRTs7OzswREFTTjtBQTVCUSxhQUFhO0lBRHpCLElBQUEsZ0JBQU8sR0FBRTtHQUNHLGFBQWEsQ0F5RXpCO0FBekVZLHNDQUFhIn0=