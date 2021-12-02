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
exports.TestRuleHandler = void 0;
const lodash_1 = require("lodash");
const midway_1 = require("midway");
const test_node_interface_1 = require("../../test-node-interface");
const presentable_common_checker_1 = require("../presentable-common-checker");
const nmr_translator_1 = require("@freelog/nmr_translator");
let TestRuleHandler = class TestRuleHandler {
    nodeId;
    testRuleMatchInfos = [];
    activateThemeRule;
    ctx;
    testRuleChecker;
    importObjectEntityHandler;
    importResourceEntityHandler;
    importPresentableEntityHandler;
    presentableCommonChecker;
    optionSetTagsHandler;
    optionReplaceHandler;
    optionSetOnlineStatusHandler;
    optionSetAttrHandler;
    optionSetTitleHandler;
    optionSetCoverHandler;
    activateThemeHandler;
    testNodeGenerator;
    outsideApiService;
    async main(nodeId, testRules) {
        this.nodeId = nodeId;
        // 初始化,转换数据格式.并且校验新增的展品名称是否与现有的展品名称冲突,新增的资源是否与现有展品对应的资源冲突.
        await this.initialTestRules(testRules).presentableNameAndResourceNameExistingCheck();
        await this.importEntityData();
        await this.generateDependencyTree();
        await this.ruleOptionsHandle();
        return this.testRuleMatchInfos;
    }
    /**
     * 匹配激活主题规则
     * @param nodeId
     * @param activeThemeRuleInfo
     */
    matchThemeRule(nodeId, activeThemeRuleInfo) {
        if (!activeThemeRuleInfo) {
            return null;
        }
        return this.activateThemeHandler.handle(nodeId, activeThemeRuleInfo);
    }
    /**
     * 初始化规则,拓展规则的基础属性
     * @param testRules
     */
    initialTestRules(testRules) {
        this.testRuleMatchInfos = testRules.map(ruleInfo => Object({
            id: this.testNodeGenerator.generateTestRuleId(this.nodeId, ruleInfo.text ?? ''),
            isValid: true,
            matchErrors: [],
            effectiveMatchCount: 0,
            efficientInfos: [],
            ruleInfo
        }));
        this.testRuleMatchInfos.forEach(item => Object.defineProperty(item, 'isValid', {
            get() {
                return !item.matchErrors.length;
            }
        }));
        return this;
    }
    /**
     * 编译测试规则
     * @param testRuleText
     */
    compileTestRule(testRuleText) {
        if (testRuleText === null || testRuleText === undefined || testRuleText === '') {
            return { errors: [], rules: [] };
        }
        return (0, nmr_translator_1.compile)(testRuleText);
    }
    /**
     * 检查add对应的presentableName或者resourceName是否已经存在
     */
    async presentableNameAndResourceNameExistingCheck() {
        await this.testRuleChecker.checkImportPresentableNameAndResourceNameIsExist(this.nodeId, this.testRuleMatchInfos);
        return this;
    }
    /**
     * 导入实体数据
     */
    async importEntityData() {
        const { alterPresentableRules, addResourceRules, addObjectRules } = this.testRuleMatchInfos.reduce((acc, current) => {
            if (current.isValid && current.ruleInfo.operation === test_node_interface_1.TestNodeOperationEnum.Alter) {
                acc.alterPresentableRules.push(current);
            }
            else if (current.isValid && current.ruleInfo.operation === test_node_interface_1.TestNodeOperationEnum.Add && current.ruleInfo.candidate.type === test_node_interface_1.TestResourceOriginType.Resource) {
                acc.addResourceRules.push(current);
            }
            else if (current.isValid && current.ruleInfo.operation === test_node_interface_1.TestNodeOperationEnum.Add && current.ruleInfo.candidate.type === test_node_interface_1.TestResourceOriginType.Object) {
                acc.addObjectRules.push(current);
            }
            return acc;
        }, { alterPresentableRules: [], addResourceRules: [], addObjectRules: [] });
        const tasks = [];
        if (!(0, lodash_1.isEmpty)(alterPresentableRules)) {
            tasks.push(this.importPresentableEntityHandler.importPresentableEntityDataFromRules(this.nodeId, alterPresentableRules));
        }
        if (!(0, lodash_1.isEmpty)(addResourceRules)) {
            tasks.push(this.importResourceEntityHandler.importResourceEntityDataFromRules(addResourceRules));
        }
        if (!(0, lodash_1.isEmpty)(addObjectRules)) {
            tasks.push(this.importObjectEntityHandler.importObjectEntityDataFromRules(this.ctx.userId, addObjectRules));
        }
        await Promise.all(tasks);
    }
    /**
     * 生成依赖树
     */
    async generateDependencyTree() {
        const tasks = [];
        for (const testRuleInfo of this.testRuleMatchInfos) {
            if (!testRuleInfo.isValid || !['alter', 'add'].includes(testRuleInfo.ruleInfo.operation)) {
                continue;
            }
            let generateDependencyTreeTask = null;
            switch (testRuleInfo.ruleInfo.candidate?.type) {
                case test_node_interface_1.TestResourceOriginType.Object:
                    generateDependencyTreeTask = this.importObjectEntityHandler.getObjectDependencyTree(testRuleInfo.testResourceOriginInfo.id);
                    break;
                case test_node_interface_1.TestResourceOriginType.Resource:
                    generateDependencyTreeTask = this.importResourceEntityHandler.getResourceDependencyTree(testRuleInfo.testResourceOriginInfo.id, testRuleInfo.testResourceOriginInfo.version);
                    break;
            }
            if (generateDependencyTreeTask !== null) {
                tasks.push(generateDependencyTreeTask.then(dependencyTree => testRuleInfo.entityDependencyTree = dependencyTree));
            }
        }
        await Promise.all(tasks);
    }
    /**
     * 选项规则处理
     */
    async ruleOptionsHandle() {
        const tasks = this.testRuleMatchInfos.map(testRuleInfo => this.optionReplaceHandler.handle(testRuleInfo));
        await Promise.all(tasks);
        const rootResourceReplacerRules = this.testRuleMatchInfos.filter(x => x.isValid && x.rootResourceReplacer?.type === test_node_interface_1.TestResourceOriginType.Resource);
        const resourceVersionIds = rootResourceReplacerRules.map(x => this.presentableCommonChecker.generateResourceVersionId(x.rootResourceReplacer.id, x.rootResourceReplacer.version));
        const resourceProperties = await this.outsideApiService.getResourceVersionList(resourceVersionIds, {
            projection: 'resourceId,systemProperty,customPropertyDescriptors'
        });
        for (const ruleInfo of rootResourceReplacerRules) {
            const resourceProperty = resourceProperties.find(x => x.resourceId === ruleInfo.rootResourceReplacer.id);
            ruleInfo.rootResourceReplacer.systemProperty = resourceProperty.systemProperty;
            ruleInfo.rootResourceReplacer.customPropertyDescriptors = resourceProperty.customPropertyDescriptors;
        }
        for (const testRuleInfo of this.testRuleMatchInfos) {
            this.optionSetTagsHandler.handle(testRuleInfo);
            this.optionSetTitleHandler.handle(testRuleInfo);
            this.optionSetCoverHandler.handle(testRuleInfo);
            this.optionSetAttrHandler.handle(testRuleInfo);
            this.optionSetOnlineStatusHandler.handle(testRuleInfo);
        }
    }
};
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", Object)
], TestRuleHandler.prototype, "ctx", void 0);
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", Object)
], TestRuleHandler.prototype, "testRuleChecker", void 0);
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", Object)
], TestRuleHandler.prototype, "importObjectEntityHandler", void 0);
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", Object)
], TestRuleHandler.prototype, "importResourceEntityHandler", void 0);
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", Object)
], TestRuleHandler.prototype, "importPresentableEntityHandler", void 0);
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", presentable_common_checker_1.PresentableCommonChecker)
], TestRuleHandler.prototype, "presentableCommonChecker", void 0);
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", Object)
], TestRuleHandler.prototype, "optionSetTagsHandler", void 0);
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", Object)
], TestRuleHandler.prototype, "optionReplaceHandler", void 0);
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", Object)
], TestRuleHandler.prototype, "optionSetOnlineStatusHandler", void 0);
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", Object)
], TestRuleHandler.prototype, "optionSetAttrHandler", void 0);
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", Object)
], TestRuleHandler.prototype, "optionSetTitleHandler", void 0);
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", Object)
], TestRuleHandler.prototype, "optionSetCoverHandler", void 0);
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", Object)
], TestRuleHandler.prototype, "activateThemeHandler", void 0);
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", Object)
], TestRuleHandler.prototype, "testNodeGenerator", void 0);
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", Object)
], TestRuleHandler.prototype, "outsideApiService", void 0);
TestRuleHandler = __decorate([
    (0, midway_1.provide)()
], TestRuleHandler);
exports.TestRuleHandler = TestRuleHandler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvZXh0ZW5kL3Rlc3QtcnVsZS1oYW5kbGVyL2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztBQUFBLG1DQUErQjtBQUMvQixtQ0FBdUM7QUFDdkMsbUVBTW1DO0FBQ25DLDhFQUF1RTtBQUN2RSw0REFBZ0Q7QUFJaEQsSUFBYSxlQUFlLEdBQTVCLE1BQWEsZUFBZTtJQUV4QixNQUFNLENBQVM7SUFDZixrQkFBa0IsR0FBd0IsRUFBRSxDQUFDO0lBQzdDLGlCQUFpQixDQUFtQjtJQUdwQyxHQUFHLENBQUM7SUFFSixlQUFlLENBQUM7SUFFaEIseUJBQXlCLENBQUM7SUFFMUIsMkJBQTJCLENBQUM7SUFFNUIsOEJBQThCLENBQUM7SUFFL0Isd0JBQXdCLENBQTJCO0lBRW5ELG9CQUFvQixDQUFDO0lBRXJCLG9CQUFvQixDQUFDO0lBRXJCLDRCQUE0QixDQUFDO0lBRTdCLG9CQUFvQixDQUFDO0lBRXJCLHFCQUFxQixDQUFDO0lBRXRCLHFCQUFxQixDQUFDO0lBRXRCLG9CQUFvQixDQUFDO0lBRXJCLGlCQUFpQixDQUFDO0lBRWxCLGlCQUFpQixDQUFxQjtJQUV0QyxLQUFLLENBQUMsSUFBSSxDQUFDLE1BQWMsRUFBRSxTQUE2QjtRQUVwRCxJQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQztRQUNyQiwwREFBMEQ7UUFDMUQsTUFBTSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsU0FBUyxDQUFDLENBQUMsMkNBQTJDLEVBQUUsQ0FBQztRQUVyRixNQUFNLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1FBQzlCLE1BQU0sSUFBSSxDQUFDLHNCQUFzQixFQUFFLENBQUM7UUFDcEMsTUFBTSxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztRQUUvQixPQUFPLElBQUksQ0FBQyxrQkFBa0IsQ0FBQztJQUNuQyxDQUFDO0lBRUQ7Ozs7T0FJRztJQUNILGNBQWMsQ0FBQyxNQUFjLEVBQUUsbUJBQXNDO1FBQ2pFLElBQUksQ0FBQyxtQkFBbUIsRUFBRTtZQUN0QixPQUFPLElBQUksQ0FBQztTQUNmO1FBQ0QsT0FBTyxJQUFJLENBQUMsb0JBQW9CLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxtQkFBbUIsQ0FBQyxDQUFDO0lBQ3pFLENBQUM7SUFFRDs7O09BR0c7SUFDSCxnQkFBZ0IsQ0FBQyxTQUE2QjtRQUUxQyxJQUFJLENBQUMsa0JBQWtCLEdBQUcsU0FBUyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQztZQUN2RCxFQUFFLEVBQUUsSUFBSSxDQUFDLGlCQUFpQixDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsUUFBUSxDQUFDLElBQUksSUFBSSxFQUFFLENBQUM7WUFDL0UsT0FBTyxFQUFFLElBQUk7WUFDYixXQUFXLEVBQUUsRUFBRTtZQUNmLG1CQUFtQixFQUFFLENBQUM7WUFDdEIsY0FBYyxFQUFFLEVBQUU7WUFDbEIsUUFBUTtTQUNYLENBQUMsQ0FBQyxDQUFDO1FBQ0osSUFBSSxDQUFDLGtCQUFrQixDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxjQUFjLENBQUMsSUFBSSxFQUFFLFNBQVMsRUFBRTtZQUMzRSxHQUFHO2dCQUNDLE9BQU8sQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQztZQUNwQyxDQUFDO1NBQ0osQ0FBQyxDQUFDLENBQUM7UUFDSixPQUFPLElBQUksQ0FBQztJQUNoQixDQUFDO0lBRUQ7OztPQUdHO0lBQ0gsZUFBZSxDQUFDLFlBQW9CO1FBRWhDLElBQUksWUFBWSxLQUFLLElBQUksSUFBSSxZQUFZLEtBQUssU0FBUyxJQUFJLFlBQVksS0FBSyxFQUFFLEVBQUU7WUFDNUUsT0FBTyxFQUFDLE1BQU0sRUFBRSxFQUFFLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBQyxDQUFDO1NBQ2xDO1FBRUQsT0FBTyxJQUFBLHdCQUFPLEVBQUMsWUFBWSxDQUFDLENBQUM7SUFDakMsQ0FBQztJQUVEOztPQUVHO0lBQ0gsS0FBSyxDQUFDLDJDQUEyQztRQUM3QyxNQUFNLElBQUksQ0FBQyxlQUFlLENBQUMsZ0RBQWdELENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsa0JBQWtCLENBQUMsQ0FBQztRQUNsSCxPQUFPLElBQUksQ0FBQztJQUNoQixDQUFDO0lBRUQ7O09BRUc7SUFDSCxLQUFLLENBQUMsZ0JBQWdCO1FBRWxCLE1BQU0sRUFBQyxxQkFBcUIsRUFBRSxnQkFBZ0IsRUFBRSxjQUFjLEVBQUMsR0FBRyxJQUFJLENBQUMsa0JBQWtCLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxFQUFFLE9BQU8sRUFBRSxFQUFFO1lBQzlHLElBQUksT0FBTyxDQUFDLE9BQU8sSUFBSSxPQUFPLENBQUMsUUFBUSxDQUFDLFNBQVMsS0FBSywyQ0FBcUIsQ0FBQyxLQUFLLEVBQUU7Z0JBQy9FLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7YUFDM0M7aUJBQU0sSUFBSSxPQUFPLENBQUMsT0FBTyxJQUFJLE9BQU8sQ0FBQyxRQUFRLENBQUMsU0FBUyxLQUFLLDJDQUFxQixDQUFDLEdBQUcsSUFBSSxPQUFPLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxJQUFJLEtBQUssNENBQXNCLENBQUMsUUFBUSxFQUFFO2dCQUMzSixHQUFHLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO2FBQ3RDO2lCQUFNLElBQUksT0FBTyxDQUFDLE9BQU8sSUFBSSxPQUFPLENBQUMsUUFBUSxDQUFDLFNBQVMsS0FBSywyQ0FBcUIsQ0FBQyxHQUFHLElBQUksT0FBTyxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsSUFBSSxLQUFLLDRDQUFzQixDQUFDLE1BQU0sRUFBRTtnQkFDekosR0FBRyxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7YUFDcEM7WUFDRCxPQUFPLEdBQUcsQ0FBQztRQUNmLENBQUMsRUFBRSxFQUFDLHFCQUFxQixFQUFFLEVBQUUsRUFBRSxnQkFBZ0IsRUFBRSxFQUFFLEVBQUUsY0FBYyxFQUFFLEVBQUUsRUFBQyxDQUFDLENBQUM7UUFFMUUsTUFBTSxLQUFLLEdBQUcsRUFBRSxDQUFDO1FBQ2pCLElBQUksQ0FBQyxJQUFBLGdCQUFPLEVBQUMscUJBQXFCLENBQUMsRUFBRTtZQUNqQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyw4QkFBOEIsQ0FBQyxvQ0FBb0MsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLHFCQUFxQixDQUFDLENBQUMsQ0FBQztTQUM1SDtRQUNELElBQUksQ0FBQyxJQUFBLGdCQUFPLEVBQUMsZ0JBQWdCLENBQUMsRUFBRTtZQUM1QixLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxpQ0FBaUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUM7U0FDcEc7UUFDRCxJQUFJLENBQUMsSUFBQSxnQkFBTyxFQUFDLGNBQWMsQ0FBQyxFQUFFO1lBQzFCLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLHlCQUF5QixDQUFDLCtCQUErQixDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLGNBQWMsQ0FBQyxDQUFDLENBQUM7U0FDL0c7UUFDRCxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDN0IsQ0FBQztJQUVEOztPQUVHO0lBQ0gsS0FBSyxDQUFDLHNCQUFzQjtRQUN4QixNQUFNLEtBQUssR0FBRyxFQUFFLENBQUM7UUFDakIsS0FBSyxNQUFNLFlBQVksSUFBSSxJQUFJLENBQUMsa0JBQWtCLEVBQUU7WUFDaEQsSUFBSSxDQUFDLFlBQVksQ0FBQyxPQUFPLElBQUksQ0FBQyxDQUFDLE9BQU8sRUFBRSxLQUFLLENBQUMsQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsRUFBRTtnQkFDdEYsU0FBUzthQUNaO1lBQ0QsSUFBSSwwQkFBMEIsR0FBRyxJQUFJLENBQUM7WUFDdEMsUUFBUSxZQUFZLENBQUMsUUFBUSxDQUFDLFNBQVMsRUFBRSxJQUFJLEVBQUU7Z0JBQzNDLEtBQUssNENBQXNCLENBQUMsTUFBTTtvQkFDOUIsMEJBQTBCLEdBQUcsSUFBSSxDQUFDLHlCQUF5QixDQUFDLHVCQUF1QixDQUFDLFlBQVksQ0FBQyxzQkFBc0IsQ0FBQyxFQUFFLENBQUMsQ0FBQztvQkFDNUgsTUFBTTtnQkFDVixLQUFLLDRDQUFzQixDQUFDLFFBQVE7b0JBQ2hDLDBCQUEwQixHQUFHLElBQUksQ0FBQywyQkFBMkIsQ0FBQyx5QkFBeUIsQ0FBQyxZQUFZLENBQUMsc0JBQXNCLENBQUMsRUFBRSxFQUFFLFlBQVksQ0FBQyxzQkFBc0IsQ0FBQyxPQUFPLENBQUMsQ0FBQztvQkFDN0ssTUFBTTthQUNiO1lBQ0QsSUFBSSwwQkFBMEIsS0FBSyxJQUFJLEVBQUU7Z0JBQ3JDLEtBQUssQ0FBQyxJQUFJLENBQUMsMEJBQTBCLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxFQUFFLENBQUMsWUFBWSxDQUFDLG9CQUFvQixHQUFHLGNBQWMsQ0FBQyxDQUFDLENBQUM7YUFDckg7U0FDSjtRQUNELE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUM3QixDQUFDO0lBRUQ7O09BRUc7SUFDSCxLQUFLLENBQUMsaUJBQWlCO1FBRW5CLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUM7UUFFMUcsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBRXpCLE1BQU0seUJBQXlCLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxDQUFDLG9CQUFvQixFQUFFLElBQUksS0FBSyw0Q0FBc0IsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUNySixNQUFNLGtCQUFrQixHQUFHLHlCQUF5QixDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDLENBQUMsb0JBQW9CLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxvQkFBb0IsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1FBQ2xMLE1BQU0sa0JBQWtCLEdBQUcsTUFBTSxJQUFJLENBQUMsaUJBQWlCLENBQUMsc0JBQXNCLENBQUMsa0JBQWtCLEVBQUU7WUFDL0YsVUFBVSxFQUFFLHFEQUFxRDtTQUNwRSxDQUFDLENBQUM7UUFFSCxLQUFLLE1BQU0sUUFBUSxJQUFJLHlCQUF5QixFQUFFO1lBQzlDLE1BQU0sZ0JBQWdCLEdBQUcsa0JBQWtCLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFVBQVUsS0FBSyxRQUFRLENBQUMsb0JBQW9CLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDekcsUUFBUSxDQUFDLG9CQUFvQixDQUFDLGNBQWMsR0FBRyxnQkFBZ0IsQ0FBQyxjQUFjLENBQUM7WUFDL0UsUUFBUSxDQUFDLG9CQUFvQixDQUFDLHlCQUF5QixHQUFHLGdCQUFnQixDQUFDLHlCQUF5QixDQUFDO1NBQ3hHO1FBRUQsS0FBSyxNQUFNLFlBQVksSUFBSSxJQUFJLENBQUMsa0JBQWtCLEVBQUU7WUFDaEQsSUFBSSxDQUFDLG9CQUFvQixDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsQ0FBQztZQUMvQyxJQUFJLENBQUMscUJBQXFCLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxDQUFDO1lBQ2hELElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDLENBQUM7WUFDaEQsSUFBSSxDQUFDLG9CQUFvQixDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsQ0FBQztZQUMvQyxJQUFJLENBQUMsNEJBQTRCLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxDQUFDO1NBQzFEO0lBQ0wsQ0FBQztDQUNKLENBQUE7QUFyTEc7SUFEQyxJQUFBLGVBQU0sR0FBRTs7NENBQ0w7QUFFSjtJQURDLElBQUEsZUFBTSxHQUFFOzt3REFDTztBQUVoQjtJQURDLElBQUEsZUFBTSxHQUFFOztrRUFDaUI7QUFFMUI7SUFEQyxJQUFBLGVBQU0sR0FBRTs7b0VBQ21CO0FBRTVCO0lBREMsSUFBQSxlQUFNLEdBQUU7O3VFQUNzQjtBQUUvQjtJQURDLElBQUEsZUFBTSxHQUFFOzhCQUNpQixxREFBd0I7aUVBQUM7QUFFbkQ7SUFEQyxJQUFBLGVBQU0sR0FBRTs7NkRBQ1k7QUFFckI7SUFEQyxJQUFBLGVBQU0sR0FBRTs7NkRBQ1k7QUFFckI7SUFEQyxJQUFBLGVBQU0sR0FBRTs7cUVBQ29CO0FBRTdCO0lBREMsSUFBQSxlQUFNLEdBQUU7OzZEQUNZO0FBRXJCO0lBREMsSUFBQSxlQUFNLEdBQUU7OzhEQUNhO0FBRXRCO0lBREMsSUFBQSxlQUFNLEdBQUU7OzhEQUNhO0FBRXRCO0lBREMsSUFBQSxlQUFNLEdBQUU7OzZEQUNZO0FBRXJCO0lBREMsSUFBQSxlQUFNLEdBQUU7OzBEQUNTO0FBRWxCO0lBREMsSUFBQSxlQUFNLEdBQUU7OzBEQUM2QjtBQW5DN0IsZUFBZTtJQUQzQixJQUFBLGdCQUFPLEdBQUU7R0FDRyxlQUFlLENBNEwzQjtBQTVMWSwwQ0FBZSJ9