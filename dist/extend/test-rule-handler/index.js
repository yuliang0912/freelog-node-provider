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
const midway_1 = require("midway");
const test_node_interface_1 = require("../../test-node-interface");
const nmr_translator_1 = require("@freelog/nmr_translator");
const import_resource_entity_handler_1 = require("./import/import-resource-entity-handler");
const import_object_entity_handler_1 = require("./import/import-object-entity-handler");
const operation_activate_theme_handler_1 = require("./operation-handler/operation-activate-theme-handler");
let TestRuleHandler = class TestRuleHandler {
    nodeId;
    testRuleMatchInfos = [];
    ctx;
    testRuleChecker;
    importObjectEntityHandler;
    importResourceEntityHandler;
    operationAddHandler;
    operationAlterHandler;
    operationActivateThemeHandler;
    testNodeGenerator;
    async main(nodeId, testRules) {
        this.nodeId = nodeId;
        // 初始化,转换数据格式.并且校验新增的展品名称是否与现有的展品名称冲突,新增的资源是否与现有展品对应的资源冲突.
        await this.initialTestRules(testRules).presentableNameAndResourceNameExistingCheck();
        await this.operationAddHandler.handle(this.testRuleMatchInfos, nodeId);
        await this.operationAlterHandler.handle(this.testRuleMatchInfos, nodeId);
        await this.generateDependencyTree();
        await this.operationActivateThemeHandler.handle(this.testRuleMatchInfos, nodeId);
        // console.log(JSON.stringify(this.testRuleMatchInfos));
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
            operationAndActionRecords: [],
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
     * 生成依赖树
     */
    async generateDependencyTree() {
        const tasks = [];
        for (const testRuleInfo of this.testRuleMatchInfos) {
            // 如果执行替换规则,已经生成过依赖树,此处会自动忽略
            if (!testRuleInfo.isValid || !['alter', 'add'].includes(testRuleInfo.ruleInfo.operation) || testRuleInfo.entityDependencyTree) {
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
    __metadata("design:type", import_object_entity_handler_1.ImportObjectEntityHandler)
], TestRuleHandler.prototype, "importObjectEntityHandler", void 0);
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", import_resource_entity_handler_1.ImportResourceEntityHandler)
], TestRuleHandler.prototype, "importResourceEntityHandler", void 0);
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", Object)
], TestRuleHandler.prototype, "operationAddHandler", void 0);
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", Object)
], TestRuleHandler.prototype, "operationAlterHandler", void 0);
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", operation_activate_theme_handler_1.OperationActivateThemeHandler)
], TestRuleHandler.prototype, "operationActivateThemeHandler", void 0);
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", Object)
], TestRuleHandler.prototype, "testNodeGenerator", void 0);
TestRuleHandler = __decorate([
    (0, midway_1.provide)()
], TestRuleHandler);
exports.TestRuleHandler = TestRuleHandler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvZXh0ZW5kL3Rlc3QtcnVsZS1oYW5kbGVyL2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztBQUFBLG1DQUF1QztBQUN2QyxtRUFHbUM7QUFDbkMsNERBQWdEO0FBQ2hELDRGQUFvRjtBQUNwRix3RkFBZ0Y7QUFDaEYsMkdBQW1HO0FBR25HLElBQWEsZUFBZSxHQUE1QixNQUFhLGVBQWU7SUFFeEIsTUFBTSxDQUFTO0lBQ2Ysa0JBQWtCLEdBQXdCLEVBQUUsQ0FBQztJQUc3QyxHQUFHLENBQUM7SUFFSixlQUFlLENBQUM7SUFFaEIseUJBQXlCLENBQTRCO0lBRXJELDJCQUEyQixDQUE4QjtJQUd6RCxtQkFBbUIsQ0FBb0I7SUFFdkMscUJBQXFCLENBQW9CO0lBRXpDLDZCQUE2QixDQUFnQztJQUU3RCxpQkFBaUIsQ0FBQztJQUVsQixLQUFLLENBQUMsSUFBSSxDQUFDLE1BQWMsRUFBRSxTQUE2QjtRQUVwRCxJQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQztRQUNyQiwwREFBMEQ7UUFDMUQsTUFBTSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsU0FBUyxDQUFDLENBQUMsMkNBQTJDLEVBQUUsQ0FBQztRQUVyRixNQUFNLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLGtCQUFrQixFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQ3ZFLE1BQU0sSUFBSSxDQUFDLHFCQUFxQixDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsa0JBQWtCLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDekUsTUFBTSxJQUFJLENBQUMsc0JBQXNCLEVBQUUsQ0FBQztRQUNwQyxNQUFNLElBQUksQ0FBQyw2QkFBNkIsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLGtCQUFrQixFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQ2pGLHdEQUF3RDtRQUN4RCxPQUFPLElB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