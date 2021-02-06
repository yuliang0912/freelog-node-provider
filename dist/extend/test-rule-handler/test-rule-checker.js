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
exports.TestRuleChecker = void 0;
const lodash_1 = require("lodash");
const midway_1 = require("midway");
const test_node_interface_1 = require("../../test-node-interface");
let TestRuleChecker = class TestRuleChecker {
    /**
     * 批量检测导入规则中的presentableName是否已存在.以及导入的发行是否已经签约到正式节点中
     * @private
     */
    async checkImportPresentableNameAndResourceNameIsExist(nodeId, testRules) {
        const condition = { nodeId, $or: [] };
        const allAddPresentableNames = testRules.filter(x => x.ruleInfo.operation === test_node_interface_1.TestNodeOperationEnum.Add).map(x => new RegExp(`^${x.ruleInfo.exhibitName}$`, 'i'));
        const allAddReleaseNames = testRules.filter(x => x.ruleInfo.operation === test_node_interface_1.TestNodeOperationEnum.Add && x.ruleInfo.candidate?.type === test_node_interface_1.TestResourceOriginType.Resource).map(x => new RegExp(`^${x.ruleInfo.candidate.name}$`, 'i'));
        if (!lodash_1.isEmpty(allAddPresentableNames)) {
            condition.$or.push({ presentableName: { $in: allAddPresentableNames } });
        }
        if (!lodash_1.isEmpty(allAddReleaseNames)) {
            condition.$or.push({ 'resourceInfo.resourceName': { $in: allAddReleaseNames } });
        }
        if (lodash_1.isEmpty(condition.$or)) {
            return testRules;
        }
        const addOperationRules = testRules.filter(x => x.ruleInfo.operation === test_node_interface_1.TestNodeOperationEnum.Add);
        const presentables = await this.presentableService.find(condition, 'presentableName resourceInfo');
        for (const { presentableName, resourceInfo } of presentables) {
            const existingPresentableNameRule = addOperationRules.find(x => this._isEqualStr(x.ruleInfo.exhibitName, presentableName));
            if (existingPresentableNameRule) {
                existingPresentableNameRule.isValid = false;
                existingPresentableNameRule.matchErrors.push(`节点的已存在名称为${existingPresentableNameRule.ruleInfo.exhibitName}的展品,规则无法生效`);
            }
            const existingResourceNameRule = addOperationRules.find(x => x.ruleInfo.candidate?.type === test_node_interface_1.TestResourceOriginType.Resource && this._isEqualStr(x.ruleInfo.candidate?.name, resourceInfo.resourceName));
            if (existingResourceNameRule) {
                existingResourceNameRule.isValid = false;
                existingResourceNameRule.matchErrors.push(`节点中已存在引用资源名称为${existingResourceNameRule.ruleInfo.candidate.name}的展品,规则无法生效`);
            }
        }
        return testRules;
    }
    _isEqualStr(x, y, ignoreLowerAndUpCase = true) {
        if (!lodash_1.isString(x) || !lodash_1.isString(y)) {
            return false;
        }
        return ignoreLowerAndUpCase ? x.toLowerCase() === y.toLowerCase() : x === y;
    }
};
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], TestRuleChecker.prototype, "presentableService", void 0);
TestRuleChecker = __decorate([
    midway_1.provide()
], TestRuleChecker);
exports.TestRuleChecker = TestRuleChecker;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdC1ydWxlLWNoZWNrZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvZXh0ZW5kL3Rlc3QtcnVsZS1oYW5kbGVyL3Rlc3QtcnVsZS1jaGVja2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztBQUFBLG1DQUF5QztBQUN6QyxtQ0FBdUM7QUFFdkMsbUVBQTJHO0FBRzNHLElBQWEsZUFBZSxHQUE1QixNQUFhLGVBQWU7SUFLeEI7OztPQUdHO0lBQ0gsS0FBSyxDQUFDLGdEQUFnRCxDQUFDLE1BQWMsRUFBRSxTQUE4QjtRQUVqRyxNQUFNLFNBQVMsR0FBRyxFQUFDLE1BQU0sRUFBRSxHQUFHLEVBQUUsRUFBRSxFQUFDLENBQUM7UUFDcEMsTUFBTSxzQkFBc0IsR0FBRyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxTQUFTLEtBQUssMkNBQXFCLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsUUFBUSxDQUFDLFdBQVcsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDbEssTUFBTSxrQkFBa0IsR0FBRyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxTQUFTLEtBQUssMkNBQXFCLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxRQUFRLENBQUMsU0FBUyxFQUFFLElBQUksS0FBSyw0Q0FBc0IsQ0FBQyxRQUFRLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLElBQUksR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFFbk8sSUFBSSxDQUFDLGdCQUFPLENB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