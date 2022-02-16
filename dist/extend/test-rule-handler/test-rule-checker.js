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
        for (const customPropertyDescriptorInfo of customPropertyDescriptors) {
            matchRule.propertyMap.set(customPropertyDescriptorInfo.key, {
                key: customPropertyDescriptorInfo.key,
                value: customPropertyDescriptorInfo.defaultValue,
                type: customPropertyDescriptorInfo.type,
                remark: customPropertyDescriptorInfo.remark,
                candidateItems: customPropertyDescriptorInfo.candidateItems,
                authority: customPropertyDescriptorInfo.type === 'readonlyText' ? 1 : 2
            });
        }
        for (const { key, value, remark } of presentableRewriteProperty ?? []) {
            // 如果系统属性以及资源自定义的属性都不存在改key值,则代表是通过展品拓展的
            if (!matchRule.propertyMap.has(key)) {
                matchRule.propertyMap.set(key, { key, authority: 6, value, remark });
                continue;
            }
            // 如果已经存在,则允许修改remark.但是value值需要视情况而定(下拉框选项,设定的值必须在规定范围内才生效).
            const property = matchRule.propertyMap.get(key);
            property.remark = remark;
            if (property.authority === 1 || (property.type === 'select' && !property.candidateItems.includes(value))) {
                continue;
            }
            property.value = value;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdC1ydWxlLWNoZWNrZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvZXh0ZW5kL3Rlc3QtcnVsZS1oYW5kbGVyL3Rlc3QtcnVsZS1jaGVja2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztBQUFBLG1DQUF5QztBQUN6QyxtQ0FBdUM7QUFFdkMsbUVBS21DO0FBSW5DLElBQWEsZUFBZSxHQUE1QixNQUFhLGVBQWU7SUFHeEIsR0FBRyxDQUFpQjtJQUVwQixrQkFBa0IsQ0FBc0I7SUFFeEM7Ozs7OztPQU1HO0lBQ0gscUJBQXFCLENBQUMsU0FBNEIsRUFBRSxjQUFzQixFQUFFLHlCQUFnQyxFQUFFLDBCQUFrQztRQUM1SSxTQUFTLENBQUMsV0FBVyxHQUFHLElBQUksR0FBRyxFQUFvQyxDQUFDO1FBQ3BFLEtBQUssTUFBTSxDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMsSUFBSSxNQUFNLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxFQUFFO1lBQ3ZELFNBQVMsQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRTtnQkFDM0IsR0FBRyxFQUFFLEtBQUssRUFBRSxLQUFlO2dCQUMzQixNQUFNLEVBQUUsRUFBRSxFQUFFLFNBQVMsRUFBRSxDQUFDO2FBQzNCLENBQUMsQ0FBQztTQUNOO1FBQ0QsS0FBSyxNQUFNLDRCQUE0QixJQUFJLHlCQUF5QixFQUFFO1lBQ2xFLFNBQVMsQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLDRCQUE0QixDQUFDLEdBQUcsRUFBRTtnQkFDeEQsR0FBRyxFQUFFLDRCQUE0QixDQUFDLEdBQUc7Z0JBQ3JDLEtBQUssRUFBRSw0QkFBNEIsQ0FBQyxZQUFZO2dCQUNoRCxJQUFJLEVBQUUsNEJBQTRCLENBQUMsSUFBSTtnQkFDdkMsTUFBTSxFQUFFLDRCQUE0QixDQUFDLE1BQU07Z0JBQzNDLGNBQWMsRUFBRSw0QkFBNEIsQ0FBQyxjQUFjO2dCQUMzRCxTQUFTLEVBQUUsNEJBQTRCLENBQUMsSUFBSSxLQUFLLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2FBQzFFLENBQUMsQ0FBQztTQUNOO1FBQ0QsS0FBSyxNQUFNLEVBQUMsR0FBRyxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUMsSUFBSSwwQkFBMEIsSUFBSSxFQUFFLEVBQUU7WUFDakUsd0NBQXdDO1lBQ3hDLElBQUksQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRTtnQkFDakMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLEVBQUMsR0FBRyxFQUFFLFNBQVMsRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBQyxDQUFDLENBQUM7Z0JBQ25FLFNBQVM7YUFDWjtZQUNELDZEQUE2RDtZQUM3RCxNQUFNLFFBQVEsR0FBRyxTQUFTLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUNoRCxRQUFRLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQztZQUN6QixJQUFJLFFBQVEsQ0FBQyxTQUFTLEtBQUssQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksS0FBSyxRQUFRLElBQUksQ0FBQyxRQUFRLENBQUMsY0FBYyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFO2dCQUN0RyxTQUFTO2FBQ1o7WUFDRCxRQUFRLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQztTQUMxQjtJQUNMLENBQUM7SUFFRDs7O09BR0c7SUFDSCxLQUFLLENBQUMsZ0RBQWdELENBQUMsTUFBYyxFQUFFLFNBQThCO1FBRWpHLE1BQU0sU0FBUyxHQUFHLEVBQUMsTUFBTSxFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUMsQ0FBQztRQUNwQyxNQUFNLHNCQUFzQixHQUFHLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLFNBQVMsS0FBSywyQ0FBcUIsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxRQUFRLENBQUMsV0FBVyxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQztRQUNsSyxNQUFNLGtCQUFrQixHQUFHLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLFNBQVMsS0FBSywyQ0FBcUIsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLFFBQVEsQ0FBQyxTQUFTLEVBQUUsSUFBSSxLQUFLLDRDQUFzQixDQUFDLFFBQVEsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsSUFBSSxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQztRQUVuTyxJQUFJLENBQUMsSUFBQSxnQkFBTyxFQUFDLHNCQUFzQixDQUFDLEVBQUU7WUFDbEMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBQyxlQUFlLEVBQUUsRUFBQyxHQUFHLEVBQUUsc0JBQXNCLEVBQUMsRUFBQyxDQUFDLENBQUM7U0FDeEU7UUFDRCxJQUFJLENBQUMsSUFBQSxnQkFBTyxFQUFDLGtCQUFrQixDQUFDLEVBQUU7WUFDOUIsU0FBUyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBQywyQkFBMkIsRUFBRSxFQUFDLEdBQUcsRUFBRSxrQkFBa0IsRUFBQyxFQUFDLENBQUMsQ0FBQztTQUNoRjtRQUNELElBQUksSUFBQSxnQkFBTyxFQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsRUFBRTtZQUN4QixPQUFPLFNBQVMsQ0FBQztTQUNwQjtRQUVELE1BQU0saUJBQWlCLEdBQUcsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsU0FBUyxLQUFLLDJDQUFxQixDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ3BHLE1BQU0sWUFBWSxHQUFHLE1BQU0sSUFBSSxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsOEJBQThCLENBQUMsQ0FBQztRQUVuRyxLQUFLLE1BQU0sRUFBQyxlQUFlLEVBQUUsWUFBWSxFQUFDLElBQUksWUFBWSxFQUFFO1lBQ3hELE1BQU0sMkJBQTJCLEdBQUcsaUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLFdBQVcsRUFBRSxlQUFlLENBQUMsQ0FBQyxDQUFDO1lBQzNILElBQUksMkJBQTJCLEVBQUU7Z0JBQzdCLDJCQUEyQixDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsb0RBQW9ELEVBQUUsMkJBQTJCLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUM7YUFDMUs7WUFDRCxNQUFNLHdCQUF3QixHQUFHLGlCQUFpQixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsU0FBUyxFQUFFLElBQUksS0FBSyw0Q0FBc0IsQ0FBQyxRQUFRLElBQUksSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLFNBQVMsRUFBRSxJQUFJLEVBQUUsWUFBWSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUM7WUFDeE0sSUFBSSx3QkFBd0IsRUFBRTtnQkFDMUIsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsd0JBQXdCLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxJQUFJLEtBQUssVUFBVSxDQUFDLENBQUMsQ0FBQyxxREFBcUQsQ0FBQyxDQUFDLENBQUMsbURBQW1ELEVBQUUsd0JBQXdCLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDOVAsd0JBQXdCLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQzthQUNsRDtTQUNKO1FBRUQsT0FBTyxTQUFTLENBQUM7SUFDckIsQ0FBQztJQUVELFdBQVcsQ0FBQyxDQUFTLEVBQUUsQ0FBUyxFQUFFLHVCQUFnQyxJQUFJO1FBQ2xFLElBQUksQ0FBQyxJQUFBLGlCQUFRLEVBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFBLGlCQUFRLEVBQUMsQ0FBQyxDQUFDLEVBQUU7WUFDOUIsT0FBTyxLQUFLLENBQUM7U0FDaEI7UUFDRCxPQUFPLG9CQUFvQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxFQUFFLEtBQUssQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ2hGLENBQUM7Q0FDSixDQUFBO0FBekZHO0lBREMsSUFBQSxlQUFNLEdBQUU7OzRDQUNXO0FBRXBCO0lBREMsSUFBQSxlQUFNLEdBQUU7OzJEQUMrQjtBQUwvQixlQUFlO0lBRDNCLElBQUEsZ0JBQU8sR0FBRTtHQUNHLGVBQWUsQ0E0RjNCO0FBNUZZLDBDQUFlIn0=