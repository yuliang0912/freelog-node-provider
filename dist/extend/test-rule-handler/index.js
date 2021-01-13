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
const nmrTranslator = require('@freelog/nmr_translator');
let TestRuleHandler = class TestRuleHandler {
    constructor() {
        this.testRuleMatchInfos = [];
    }
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
        return this;
    }
    /**
     * 编译测试规则
     * @param testRuleText
     */
    compileTestRule(testRuleText) {
        if (testRuleText === null || testRuleText === undefined || testRuleText === "") {
            return { errors: [], rules: [] };
        }
        return nmrTranslator.compile(testRuleText);
    }
    /**
     * 检查add对应的presentableName或者resourceName是否已经存在
     */
    async presentableNameAndResourceNameExistingCheck() {
        await this.testRuleChecker.checkImportPresentableNameAndResourceNameIsExist(this.nodeId, this.testRuleMatchInfos);
        return this;
    }
    /**
     * 导入属性
     */
    async importEntityProperty() {
        const objectIds = [];
        const resourceVersionIds = [];
        const presentableVersionIds = [];
        const validRules = this.testRuleMatchInfos.filter(x => x.isValid && ['alter', 'add'].includes(x.ruleInfo.operation));
        for (const testRuleInfo of validRules) {
            switch (testRuleInfo.ruleInfo.candidate?.type) {
                case test_node_interface_1.TestResourceOriginType.Object:
                    objectIds.push(testRuleInfo.testResourceOriginInfo.id);
                    break;
                case test_node_interface_1.TestResourceOriginType.Resource:
                    resourceVersionIds.push(this.presentableCommonChecker.generateResourceVersionId(testRuleInfo.testResourceOriginInfo.id, testRuleInfo.testResourceOriginInfo.version));
                    break;
                default:
                    presentableVersionIds.push(this.presentableCommonChecker.generatePresentableVersionId(testRuleInfo.presentableInfo.presentableId, testRuleInfo.presentableInfo.version));
                    break;
            }
        }
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
        if (!lodash_1.isEmpty(alterPresentableRules)) {
            tasks.push(this.importPresentableEntityHandler.importPresentableEntityDataFromRules(this.nodeId, alterPresentableRules));
        }
        if (!lodash_1.isEmpty(addResourceRules)) {
            tasks.push(this.importResourceEntityHandler.importResourceEntityDataFromRules(addResourceRules));
        }
        if (!lodash_1.isEmpty(addObjectRules)) {
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
                default:
                    generateDependencyTreeTask = this.importPresentableEntityHandler.getPresentableDependencyTree(testRuleInfo.presentableInfo.presentableId, testRuleInfo.presentableInfo.version);
                    break;
            }
            tasks.push(generateDependencyTreeTask.then(dependencyTree => testRuleInfo.entityDependencyTree = dependencyTree));
        }
        await Promise.all(tasks);
    }
    /**
     * 选项规则处理
     */
    async ruleOptionsHandle() {
        const tasks = [];
        for (const testRuleInfo of this.testRuleMatchInfos) {
            this.optionSetTagsHandler.handle(testRuleInfo);
            this.optionSetTitleHandler.handle(testRuleInfo);
            this.optionSetCoverHandler.handle(testRuleInfo);
            this.optionSetAttrHandler.handle(testRuleInfo);
            this.optionSetOnlineStatusHandler.handle(testRuleInfo);
            tasks.push(this.optionReplaceHandler.handle(testRuleInfo));
        }
        await Promise.all(tasks);
    }
};
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], TestRuleHandler.prototype, "ctx", void 0);
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], TestRuleHandler.prototype, "testRuleChecker", void 0);
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], TestRuleHandler.prototype, "importObjectEntityHandler", void 0);
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], TestRuleHandler.prototype, "importResourceEntityHandler", void 0);
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], TestRuleHandler.prototype, "importPresentableEntityHandler", void 0);
__decorate([
    midway_1.inject(),
    __metadata("design:type", presentable_common_checker_1.PresentableCommonChecker)
], TestRuleHandler.prototype, "presentableCommonChecker", void 0);
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], TestRuleHandler.prototype, "optionSetTagsHandler", void 0);
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], TestRuleHandler.prototype, "optionReplaceHandler", void 0);
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], TestRuleHandler.prototype, "optionSetOnlineStatusHandler", void 0);
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], TestRuleHandler.prototype, "optionSetAttrHandler", void 0);
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], TestRuleHandler.prototype, "optionSetTitleHandler", void 0);
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], TestRuleHandler.prototype, "optionSetCoverHandler", void 0);
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], TestRuleHandler.prototype, "testNodeGenerator", void 0);
TestRuleHandler = __decorate([
    midway_1.provide()
], TestRuleHandler);
exports.TestRuleHandler = TestRuleHandler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvZXh0ZW5kL3Rlc3QtcnVsZS1oYW5kbGVyL2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztBQUFBLG1DQUErQjtBQUMvQixtQ0FBdUM7QUFDdkMsbUVBRW1DO0FBQ25DLDhFQUF1RTtBQUV2RSxNQUFNLGFBQWEsR0FBRyxPQUFPLENBQUMseUJBQXlCLENBQUMsQ0FBQztBQUd6RCxJQUFhLGVBQWUsR0FBNUIsTUFBYSxlQUFlO0lBQTVCO1FBR0ksdUJBQWtCLEdBQXdCLEVBQUUsQ0FBQztJQTRLakQsQ0FBQztJQS9JRyxLQUFLLENBQUMsSUFBSSxDQUFDLE1BQWMsRUFBRSxTQUE2QjtRQUVwRCxJQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQztRQUNyQiwwREFBMEQ7UUFDMUQsTUFBTSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsU0FBUyxDQUFDLENBQUMsMkNBQTJDLEVBQUUsQ0FBQztRQUVyRixNQUFNLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1FBQzlCLE1BQU0sSUFBSSxDQUFDLHNCQUFzQixFQUFFLENBQUM7UUFDcEMsTUFBTSxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztRQUUvQixPQUFPLElBQUksQ0FBQyxrQkFBa0IsQ0FBQztJQUNuQyxDQUFDO0lBRUQ7OztPQUdHO0lBQ0gsZ0JBQWdCLENBQUMsU0FBNkI7UUFDMUMsSUFBSSxDQUFDLGtCQUFrQixHQUFHLFNBQVMsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUM7WUFDdkQsRUFBRSxFQUFFLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLFFBQVEsQ0FBQyxJQUFJLElBQUksRUFBRSxDQUFDO1lBQy9FLE9BQU8sRUFBRSxJQUFJO1lBQ2IsV0FBVyxFQUFFLEVBQUU7WUFDZixtQkFBbUIs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