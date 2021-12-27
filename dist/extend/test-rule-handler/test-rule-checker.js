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
    ctx;
    presentableService;
    /**
     * 设置实体的系统属性和自定义属性
     * @param matchRule
     * @param systemProperty
     * @param customPropertyDescriptors
     * @param presentableRewriteProperty
     */
    fillEntityPropertyMap(matchRule, systemProperty, customPropertyDescriptors, presentableRewriteProperty) {
        matchRule.propertyMap = new Map();
        for (const [key, value] of Object.entries(systemProperty)) {
            matchRule.propertyMap.set(key, {
                key, value: value,
                remark: '', authority: 1
            });
        }
        for (const { key, defaultValue, remark, type } of customPropertyDescriptors) {
            matchRule.propertyMap.set(key, {
                key, value: defaultValue, remark,
                authority: type === 'readonlyText' ? 1 : 2
            });
        }
        for (const { key, value, remark } of presentableRewriteProperty ?? []) {
            const property = matchRule.propertyMap.get(key);
            if (property && property.authority === 1) {
                continue;
            }
            matchRule.propertyMap.set(key, { key, authority: 6, value, remark });
        }
    }
    /**
     * 批量检测导入规则中的presentableName是否已存在.以及导入的发行是否已经签约到正式节点中
     * @private
     */
    async checkImportPresentableNameAndResourceNameIsExist(nodeId, testRules) {
        const condition = { nodeId, $or: [] };
        const allAddPresentableNames = testRules.filter(x => x.ruleInfo.operation === test_node_interface_1.TestNodeOperationEnum.Add).map(x => new RegExp(`^${x.ruleInfo.exhibitName}$`, 'i'));
        const allAddReleaseNames = testRules.filter(x => x.ruleInfo.operation === test_node_interface_1.TestNodeOperationEnum.Add && x.ruleInfo.candidate?.type === test_node_interface_1.TestResourceOriginType.Resource).map(x => new RegExp(`^${x.ruleInfo.candidate.name}$`, 'i'));
        if (!(0, lodash_1.isEmpty)(allAddPresentableNames)) {
            condition.$or.push({ presentableName: { $in: allAddPresentableNames } });
        }
        if (!(0, lodash_1.isEmpty)(allAddReleaseNames)) {
            condition.$or.push({ 'resourceInfo.resourceName': { $in: allAddReleaseNames } });
        }
        if ((0, lodash_1.isEmpty)(condition.$or)) {
            return testRules;
        }
        const addOperationRules = testRules.filter(x => x.ruleInfo.operation === test_node_interface_1.TestNodeOperationEnum.Add);
        const presentables = await this.presentableService.find(condition, 'presentableName resourceInfo');
        for (const { presentableName, resourceInfo } of presentables) {
            const existingPresentableNameRule = addOperationRules.find(x => this._isEqualStr(x.ruleInfo.exhibitName, presentableName));
            if (existingPresentableNameRule) {
                existingPresentableNameRule.matchErrors.push(this.ctx.gettext('reflect_rule_pre_excute_error_exhibit_name_existed', existingPresentableNameRule.ruleInfo.exhibitName));
            }
            const existingResourceNameRule = addOperationRules.find(x => x.ruleInfo.candidate?.type === test_node_interface_1.TestResourceOriginType.Resource && this._isEqualStr(x.ruleInfo.candidate?.name, resourceInfo.resourceName));
            if (existingResourceNameRule) {
                const msg = this.ctx.gettext(existingResourceNameRule.ruleInfo.candidate.type === 'resource' ? 'reflect_rule_pre_excute_error_test_resource_existed' : 'reflect_rule_pre_excute_error_test_object_existed', existingResourceNameRule.ruleInfo.candidate.name);
                existingResourceNameRule.matchErrors.push(msg);
            }
        }
        return testRules;
    }
    _isEqualStr(x, y, ignoreLowerAndUpCase = true) {
        if (!(0, lodash_1.isString)(x) || !(0, lodash_1.isString)(y)) {
            return false;
        }
        return ignoreLowerAndUpCase ? x.toLowerCase() === y.toLowerCase() : x === y;
    }
};
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", Object)
], TestRuleChecker.prototype, "ctx", void 0);
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", Object)
], TestRuleChecker.prototype, "presentableService", void 0);
TestRuleChecker = __decorate([
    (0, midway_1.provide)()
], TestRuleChecker);
exports.TestRuleChecker = TestRuleChecker;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdC1ydWxlLWNoZWNrZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvZXh0ZW5kL3Rlc3QtcnVsZS1oYW5kbGVyL3Rlc3QtcnVsZS1jaGVja2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztBQUFBLG1DQUF5QztBQUN6QyxtQ0FBdUM7QUFFdkMsbUVBS21DO0FBSW5DLElBQWEsZUFBZSxHQUE1QixNQUFhLGVBQWU7SUFHeEIsR0FBRyxDQUFpQjtJQUVwQixrQkFBa0IsQ0FBc0I7SUFFeEM7Ozs7OztPQU1HO0lBQ0gscUJBQXFCLENBQUMsU0FBNEIsRUFBRSxjQUFzQixFQUFFLHlCQUFnQyxFQUFFLDBCQUFrQztRQUM1SSxTQUFTLENBQUMsV0FBVyxHQUFHLElBQUksR0FBRyxFQUFvQyxDQUFDO1FBQ3BFLEtBQUssTUFBTSxDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMsSUFBSSxNQUFNLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxFQUFFO1lBQ3ZELFNBQVMsQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRTtnQkFDM0IsR0FBRyxFQUFFLEtBQUssRUFBRSxLQUFlO2dCQUMzQixNQUFNLEVBQUUsRUFBRSxFQUFFLFNBQVMsRUFBRSxDQUFDO2FBQzNCLENBQUMsQ0FBQztTQUNOO1FBQ0QsS0FBSyxNQUFNLEVBQUMsR0FBRyxFQUFFLFlBQVksRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFDLElBQUkseUJBQXlCLEVBQUU7WUFDdkUsU0FBUyxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFO2dCQUMzQixHQUFHLEVBQUUsS0FBSyxFQUFFLFlBQVksRUFBRSxNQUFNO2dCQUNoQyxTQUFTLEVBQUUsSUFBSSxLQUFLLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2FBQzdDLENBQUMsQ0FBQztTQUNOO1FBQ0QsS0FBSyxNQUFNLEVBQUMsR0FBRyxF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