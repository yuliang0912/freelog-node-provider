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
exports.OperationAlterHandler = void 0;
const lodash_1 = require("lodash");
const test_node_interface_1 = require("../../../test-node-interface");
const midway_1 = require("midway");
const import_presentable_entity_handler_1 = require("../import/import-presentable-entity-handler");
let OperationAlterHandler = class OperationAlterHandler {
    ctx;
    actionHandler;
    importPresentableEntityHandler;
    /**
     * 修改(alter)规则处理. 主要导入资源或者存储对象
     * @param testRuleList
     * @param nodeId
     */
    async handle(testRuleList, nodeId) {
        const alterPresentableRules = testRuleList.filter(x => x.isValid && x.ruleInfo.operation === test_node_interface_1.TestNodeOperationEnum.Alter);
        if ((0, lodash_1.isEmpty)(alterPresentableRules)) {
            return true;
        }
        await this.importPresentableEntityHandler.importPresentableEntityDataFromRules(nodeId, alterPresentableRules);
        for (const testRuleMatchInfo of testRuleList) {
            if (!testRuleMatchInfo.isValid || testRuleMatchInfo.ruleInfo.operation !== test_node_interface_1.TestNodeOperationEnum.Alter) {
                continue;
            }
            testRuleMatchInfo.efficientInfos.push({ type: test_node_interface_1.TestNodeOperationEnum.Alter, count: 1 });
            for (const action of testRuleMatchInfo.ruleInfo.actions) {
                await this.actionHandler.handle(this.ctx, testRuleMatchInfo, action);
            }
        }
        return true;
    }
};
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", Object)
], OperationAlterHandler.prototype, "ctx", void 0);
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", Object)
], OperationAlterHandler.prototype, "actionHandler", void 0);
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", import_presentable_entity_handler_1.ImportPresentableEntityHandler)
], OperationAlterHandler.prototype, "importPresentableEntityHandler", void 0);
OperationAlterHandler = __decorate([
    (0, midway_1.provide)()
], OperationAlterHandler);
exports.OperationAlterHandler = OperationAlterHandler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3BlcmF0aW9uLWFsdGVyLWhhbmRsZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9zcmMvZXh0ZW5kL3Rlc3QtcnVsZS1oYW5kbGVyL29wZXJhdGlvbi1oYW5kbGVyL29wZXJhdGlvbi1hbHRlci1oYW5kbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztBQUFBLG1DQUErQjtBQUMvQixzRUFFc0M7QUFDdEMsbUNBQXVDO0FBRXZDLG1HQUEyRjtBQUczRixJQUFhLHFCQUFxQixHQUFsQyxNQUFhLHFCQUFxQjtJQUc5QixHQUFHLENBQWlCO0lBRXBCLGFBQWEsQ0FBc0I7SUFFbkMsOEJBQThCLENBQWlDO0lBRS9EOzs7O09BSUc7SUFDSCxLQUFLLENBQUMsTUFBTSxDQUFDLFlBQWlDLEVBQUUsTUFBYztRQUUxRCxNQUFNLHFCQUFxQixHQUFHLFlBQVksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsQ0FBQyxRQUFRLENBQUMsU0FBUyxLQUFLLDJDQUFxQixDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQzFILElBQUksSUFBQSxnQkFBTyxFQUFDLHFCQUFxQixDQUFDLEVBQUU7WUFDaEMsT0FBTyxJQUFJLENBQUM7U0FDZjtRQUVELE1BQU0sSUFBSSxDQUFDLDhCQUE4QixDQUFDLG9DQUFvQyxDQUFDLE1BQU0sRUFBRSxxQkFBcUIsQ0FBQyxDQUFDO1FBRTlHLEtBQUssTUFBTSxpQkFBaUIsSUFBSSxZQUFZLEVBQUU7WUFDMUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLE9BQU8sSUFBSSxpQkFBaUIsQ0FBQyxRQUFRLENBQUMsU0FBUyxLQUFLLDJDQUFxQixDQUFDLEtBQUssRUFBRTtnQkFDcEcsU0FBUzthQUNaO1lBQ0QsaUJBQWlCLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxFQUFDLElBQUksRUFBRSwyQ0FBcUIsQ0FBQyxLQUFLLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBQyxDQUFDLENBQUM7WUFDckYsS0FBSyxNQUFNLE1BQU0sSUFBSSxpQkFBaUIsQ0FBQyxRQUFRLENBQUMsT0FBTyxFQUFFO2dCQUNyRCxNQUFNLElBQUksQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxDQUFDLENBQUM7YUFDeEU7U0FDSjtRQUVELE9BQU8sSUFBSSxDQUFDO0lBQ2hCLENBQUM7Q0FDSixDQUFBO0FBaENHO0lBREMsSUFBQSxlQUFNLEdBQUU7O2tEQUNXO0FBRXBCO0lBREMsSUFBQSxlQUFNLEdBQUU7OzREQUMwQjtBQUVuQztJQURDLElBQUEsZUFBTSxHQUFFOzhCQUN1QixrRUFBOEI7NkVBQUM7QUFQdEQscUJBQXFCO0lBRGpDLElBQUEsZ0JBQU8sR0FBRTtHQUNHLHFCQUFxQixDQW1DakM7QUFuQ1ksc0RBQXFCIn0=