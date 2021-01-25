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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvZXh0ZW5kL3Rlc3QtcnVsZS1oYW5kbGVyL2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztBQUFBLG1DQUErQjtBQUMvQixtQ0FBdUM7QUFDdkMsbUVBRW1DO0FBQ25DLDhFQUF1RTtBQUN2RSw0REFBZ0Q7QUFHaEQsSUFBYSxlQUFlLEdBQTVCLE1BQWEsZUFBZTtJQUE1QjtRQUdJLHVCQUFrQixHQUF3QixFQUFFLENBQUM7SUFtS2pELENBQUM7SUFuSUcsS0FBSyxDQUFDLElBQUksQ0FBQyxNQUFjLEVBQUUsU0FBNkI7UUFFcEQsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUM7UUFDckIsMERBQTBEO1FBQzFELE1BQU0sSUFBSSxDQUFDLGdCQUFnQixDQUFDLFNBQVMsQ0FBQyxDQUFDLDJDQUEyQyxFQUFFLENBQUM7UUFFckYsTUFBTSxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztRQUM5QixNQUFNLElBQUksQ0FBQyxzQkFBc0IsRUFBRSxDQUFDO1FBQ3BDLE1BQU0sSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUM7UUFFL0IsT0FBTyxJQUFJLENBQUMsa0JBQWtCLENBQUM7SUFDbkMsQ0FBQztJQUVEOzs7O09BSUc7SUFDSCxjQUFjLENBQUMsTUFBYyxFQUFFLG1CQUFzQztRQUNqRSxJQUFJLENBQUMsbUJBQW1CLEVBQUU7WUFDdEIsT0FBTyxJQUFJLENBQUM7U0FDZjtRQUNELE9BQU8sSUFBSSxDQUFDLG9CQUFvQixDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsbUJBQW1CLENBQUMsQ0FBQTtJQUN4RSxDQUFDO0lBRUQ7OztPQUdHO0lBQ0gsZ0JBQWdCLENBQUMsU0FBNkI7UUFDMUMsSUFBSSxDQUFDLGtCQUFrQixHQUFHLFNBQVMsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUM7WUFDdkQsRUFB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