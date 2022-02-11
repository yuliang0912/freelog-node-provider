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
            if (property && [1, 2].includes(property.authority)) {
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