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
exports.OperationAddHandler = void 0;
const lodash_1 = require("lodash");
const test_node_interface_1 = require("../../../test-node-interface");
const midway_1 = require("midway");
const import_object_entity_handler_1 = require("../import/import-object-entity-handler");
const import_resource_entity_handler_1 = require("../import/import-resource-entity-handler");
let OperationAddHandler = class OperationAddHandler {
    ctx;
    actionHandler;
    importObjectEntityHandler;
    importResourceEntityHandler;
    /**
     * 导入规则处理. 主要导入资源或者存储对象
     * @param testRuleList
     */
    async handle(testRuleList) {
        const addObjectRules = [];
        const addResourceRules = [];
        for (const testRuleMatchInfo of testRuleList) {
            if (!testRuleMatchInfo.isValid || testRuleMatchInfo.ruleInfo.operation !== test_node_interface_1.TestNodeOperationEnum.Add) {
                continue;
            }
            if (testRuleMatchInfo.ruleInfo.candidate.type === test_node_interface_1.TestResourceOriginType.Object) {
                addObjectRules.push(testRuleMatchInfo);
            }
            else if (testRuleMatchInfo.ruleInfo.candidate.type === test_node_interface_1.TestResourceOriginType.Resource) {
                addResourceRules.push(testRuleMatchInfo);
            }
        }
        const tasks = [];
        if (!(0, lodash_1.isEmpty)(addResourceRules)) {
            tasks.push(this.importResourceEntityHandler.importResourceEntityDataFromRules(addResourceRules));
        }
        if (!(0, lodash_1.isEmpty)(addObjectRules)) {
            tasks.push(this.importObjectEntityHandler.importObjectEntityDataFromRules(this.ctx.userId, addObjectRules));
        }
        await Promise.all(tasks);
        for (const testRuleMatchInfo of testRuleList) {
            if (!testRuleMatchInfo.isValid || testRuleMatchInfo.ruleInfo.operation !== test_node_interface_1.TestNodeOperationEnum.Add) {
                continue;
            }
            testRuleMatchInfo.efficientInfos.push({ type: test_node_interface_1.TestNodeOperationEnum.Add, count: 1 });
            for (const action of testRuleMatchInfo.ruleInfo.actions ?? []) {
                await this.actionHandler.handle(this.ctx, testRuleMatchInfo, action);
            }
        }
        return true;
    }
};
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", Object)
], OperationAddHandler.prototype, "ctx", void 0);
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", Object)
], OperationAddHandler.prototype, "actionHandler", void 0);
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", import_object_entity_handler_1.ImportObjectEntityHandler)
], OperationAddHandler.prototype, "importObjectEntityHandler", void 0);
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", import_resource_entity_handler_1.ImportResourceEntityHandler)
], OperationAddHandler.prototype, "importResourceEntityHandler", void 0);
OperationAddHandler = __decorate([
    (0, midway_1.provide)()
], OperationAddHandler);
exports.OperationAddHandler = OperationAddHandler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3BlcmF0aW9uLWFkZC1oYW5kbGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vc3JjL2V4dGVuZC90ZXN0LXJ1bGUtaGFuZGxlci9vcGVyYXRpb24taGFuZGxlci9vcGVyYXRpb24tYWRkLWhhbmRsZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0FBQUEsbUNBQStCO0FBQy9CLHNFQU1zQztBQUN0QyxtQ0FBdUM7QUFFdkMseUZBQWlGO0FBQ2pGLDZGQUFxRjtBQUdyRixJQUFhLG1CQUFtQixHQUFoQyxNQUFhLG1CQUFtQjtJQUc1QixHQUFHLENBQWlCO0lBRXBCLGFBQWEsQ0FBc0I7SUFFbkMseUJBQXlCLENBQTRCO0lBRXJELDJCQUEyQixDQUE4QjtJQUV6RDs7O09BR0c7SUFDSCxLQUFLLENBQUMsTUFBTSxDQUFDLFlBQWlDO1FBRTFDLE1BQU0sY0FBYyxHQUF3QixFQUFFLENBQUM7UUFDL0MsTUFBTSxnQkFBZ0IsR0FBd0IsRUFBRSxDQUFDO1FBRWpELEtBQUssTUFBTSxpQkFBaUIsSUFBSSxZQUFZLEVBQUU7WUFDMUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLE9BQU8sSUFBSSxpQkFBaUIsQ0FBQyxRQUFRLENBQUMsU0FBUyxLQUFLLDJDQUFxQixDQUFDLEdBQUcsRUFBRTtnQkFDbEcsU0FBUzthQUNaO1lBQ0QsSUFBSSxpQkFBaUIsQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLElBQUksS0FBSyw0Q0FBc0IsQ0FBQyxNQUFNLEVBQUU7Z0JBQzdFLGNBQWMsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQzthQUMxQztpQkFBTSxJQUFJLGlCQUFpQixDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsSUFBSSxLQUFLLDRDQUFzQixDQUFDLFFBQVEsRUFBRTtnQkFDdEYsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLENBQUM7YUFDNUM7U0FDSjtRQUVELE1BQU0sS0FBSyxHQUFHLEVBQUUsQ0FBQztRQUNqQixJQUFJLENBQUMsSUFBQSxnQkFBTyxFQUFDLGdCQUFnQixDQUFDLEVBQUU7WUFDNUIsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsMkJBQTJCLENBQUMsaUNBQWlDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDO1NBQ3BHO1FBQ0QsSUFBSSxDQUFDLElBQUEsZ0JBQU8sRUFBQyxjQUFjLENBQUMsRUFBRTtZQUMxQixLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyx5QkFBeUIsQ0FBQywrQkFBK0IsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxjQUFjLENBQUMsQ0FBQyxDQUFDO1NBQy9HO1FBQ0QsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBRXpCLEtBQUssTUFBTSxpQkFBaUIsSUFBSSxZQUFZLEVBQUU7WUFDMUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLE9BQU8sSUFBSSxpQkFBaUIsQ0FBQyxRQUFRLENBQUMsU0FBUyxLQUFLLDJDQUFxQixDQUFDLEdBQUcsRUFBRTtnQkFDbEcsU0FBUzthQUNaO1lBQ0QsaUJBQWlCLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxFQUFDLElBQUksRUFBRSwyQ0FBcUIsQ0FBQyxHQUFHLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBQyxDQUFDLENBQUM7WUFDbkYsS0FBSyxNQUFNLE1BQU0sSUFBSSxpQkFBaUIsQ0FBQyxRQUFRLENBQUMsT0FBTyxJQUFJLEVBQUUsRUFBRTtnQkFDM0QsTUFBTSxJQUFJLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sQ0FBQyxDQUFDO2FBQ3hFO1NBQ0o7UUFFRCxPQUFPLElBQUksQ0FBQztJQUNoQixDQUFDO0NBQ0osQ0FBQTtBQWpERztJQURDLElBQUEsZUFBTSxHQUFFOztnREFDVztBQUVwQjtJQURDLElBQUEsZUFBTSxHQUFFOzswREFDMEI7QUFFbkM7SUFEQyxJQUFBLGVBQU0sR0FBRTs4QkFDa0Isd0RBQXlCO3NFQUFDO0FBRXJEO0lBREMsSUFBQSxlQUFNLEdBQUU7OEJBQ29CLDREQUEyQjt3RUFBQztBQVRoRCxtQkFBbUI7SUFEL0IsSUFBQSxnQkFBTyxHQUFFO0dBQ0csbUJBQW1CLENBb0QvQjtBQXBEWSxrREFBbUIifQ==