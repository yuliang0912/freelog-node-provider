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
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], TestRuleHandler.prototype, "outsideApiService", void 0);
TestRuleHandler = __decorate([
    midway_1.provide()
], TestRuleHandler);
exports.TestRuleHandler = TestRuleHandler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvZXh0ZW5kL3Rlc3QtcnVsZS1oYW5kbGVyL2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztBQUFBLG1DQUErQjtBQUMvQixtQ0FBdUM7QUFDdkMsbUVBTW1DO0FBQ25DLDhFQUF1RTtBQUN2RSw0REFBZ0Q7QUFJaEQsSUFBYSxlQUFlLEdBQTVCLE1BQWEsZUFBZTtJQUV4QixNQUFNLENBQVM7SUFDZixrQkFBa0IsR0FBd0IsRUFBRSxDQUFDO0lBQzdDLGlCQUFpQixDQUFtQjtJQUdwQyxHQUFHLENBQUM7SUFFSixlQUFlLENBQUM7SUFFaEIseUJBQXlCLENBQUM7SUFFMUIsMkJBQTJCLENBQUM7SUFFNUIsOEJBQThCLENBQUM7SUFFL0Isd0JBQXdCLENBQTJCO0lBRW5ELG9CQUFvQixDQUFDO0lBRXJCLG9CQUFvQixDQUFDO0lBRXJCLDRCQUE0QixDQUFDO0lBRTdCLG9CQUFvQixDQUFDO0lBRXJCLHFCQUFxQixDQUFDO0lBRXRCLHFCQUFxQixDQUFDO0lBRXRCLG9CQUFvQixDQUFDO0lBRXJCLGlCQUFpQixDQUFDO0lBRWxCLGlCQUFpQixDQUFxQjtJQUV0QyxLQUFLLENBQUMsSUFBSSxDQUFDLE1BQWMsRUFBRSxTQUE2QjtRQUVwRCxJQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQztRQUNyQiwwREFBMEQ7UUFDMUQsTUFBTSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsU0FBUyxDQUFDLENBQUMsMkNBQTJDLEVBQUUsQ0FBQztRQUVyRixNQUFNLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1FBQzlCLE1BQU0sSUFBSSxDQUFDLHNCQUFzQixFQUFFLENBQUM7UUFDcEMsTUFBTSxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztRQUUvQixPQUFPLElBQUksQ0FBQyxrQkFBa0IsQ0FBQztJQUNuQyxDQUFDO0lBRUQ7Ozs7T0FJRztJQUNI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