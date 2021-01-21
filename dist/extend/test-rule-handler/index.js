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
     * 匹配激活主题规则
     * @param nodeId
     * @param testRuleMatchInfos
     */
    async matchThemeRule(nodeId, testRuleMatchInfos) {
        const activeThemeRuleInfo = testRuleMatchInfos.find(x => x.ruleInfo.operation === test_node_interface_1.TestNodeOperationEnum.ActivateTheme);
        if (!activeThemeRuleInfo) {
            return null;
        }
        await this.activateThemeHandler.handle(activeThemeRuleInfo, nodeId, testRuleMatchInfos);
        return activeThemeRuleInfo;
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
        return nmr_translator_1.compile(testRuleText);
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
], TestRuleHandler.prototype, "activateThemeHandler", void 0);
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], TestRuleHandler.prototype, "testNodeGenerator", void 0);
TestRuleHandler = __decorate([
    midway_1.provide()
], TestRuleHandler);
exports.TestRuleHandler = TestRuleHandler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvZXh0ZW5kL3Rlc3QtcnVsZS1oYW5kbGVyL2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztBQUFBLG1DQUErQjtBQUMvQixtQ0FBdUM7QUFDdkMsbUVBRW1DO0FBQ25DLDhFQUF1RTtBQUN2RSw0REFBZ0Q7QUFHaEQsSUFBYSxlQUFlLEdBQTVCLE1BQWEsZUFBZTtJQUE1QjtRQUdJLHVCQUFrQixHQUF3QixFQUFFLENBQUM7SUFvS2pELENBQUM7SUFySUcsS0FBSyxDQUFDLElBQUksQ0FBQyxNQUFjLEVBQUUsU0FBNkI7UUFFcEQsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUM7UUFDckIsMERBQTBEO1FBQzFELE1BQU0sSUFBSSxDQUFDLGdCQUFnQixDQUFDLFNBQVMsQ0FBQyxDQUFDLDJDQUEyQyxFQUFFLENBQUM7UUFFckYsTUFBTSxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztRQUM5QixNQUFNLElBQUksQ0FBQyxzQkFBc0IsRUFBRSxDQUFDO1FBQ3BDLE1BQU0sSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUM7UUFFL0IsT0FBTyxJQUFJLENBQUMsa0JBQWtCLENBQUM7SUFDbkMsQ0FBQztJQUVEOzs7O09BSUc7SUFDSCxLQUFLLENBQUMsY0FBYyxDQUFDLE1BQWMsRUFBRSxrQkFBdUM7UUFDeEUsTUFBTSxtQkFBbUIsR0FBRyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLFNBQVMsS0FBSywyQ0FBcUIsQ0FBQyxhQUFhLENBQUMsQ0FBQTtRQUN0SCxJQUFJLENBQUMsbUJBQW1CLEVBQUU7WUFDdEIsT0FBTyxJQUFJLENBQUM7U0FDZjtRQUNELE1BQU0sSUFBSSxDQUFDLG9CQUFvQixDQUFDLE1BQU0sQ0FBQyxtQkFBbUIsRUFBRSxNQUFNLEVBQUUsa0JBQWtC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