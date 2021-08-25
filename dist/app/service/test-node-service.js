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
exports.TestNodeService = void 0;
const midway_1 = require("midway");
const enum_1 = require("../../enum");
const lodash_1 = require("lodash");
const egg_freelog_base_1 = require("egg-freelog-base");
const test_rule_handler_1 = require("../../extend/test-rule-handler");
let TestNodeService = class TestNodeService {
    ctx;
    testRuleHandler;
    testNodeGenerator;
    outsideApiService;
    matchTestRuleEventHandler;
    nodeTestRuleProvider;
    nodeTestResourceProvider;
    nodeTestResourceTreeProvider;
    async findOneTestResource(condition, ...args) {
        return this.nodeTestResourceProvider.findOne(condition, ...args);
    }
    async findTestResources(condition, ...args) {
        return this.nodeTestResourceProvider.find(condition, ...args);
    }
    async findNodeTestRuleInfoById(nodeId, ...args) {
        return this.nodeTestRuleProvider.findOne({ nodeId }, ...args);
    }
    async testResourceCount(condition) {
        return this.nodeTestResourceProvider.count(condition);
    }
    async findOneTestResourceTreeInfo(condition, ...args) {
        return this.nodeTestResourceTreeProvider.findOne(condition, ...args);
    }
    async findTestResourceTreeInfos(condition, ...args) {
        return this.nodeTestResourceTreeProvider.find(condition, ...args);
    }
    async matchTestResourceTreeInfos(nodeId, dependentEntityId, resourceType, omitResourceType) {
        const condition = { nodeId };
        if (lodash_1.isString(resourceType)) {
            condition.resourceType = resourceType;
        }
        else if (lodash_1.isString(omitResourceType)) {
            condition.resourceType = { $ne: omitResourceType };
        }
        return this.nodeTestResourceTreeProvider.aggregate([
            { $match: condition },
            { $unwind: '$dependencyTree' },
            { $match: { 'dependencyTree.deep': { $gt: 1 }, 'dependencyTree.id': dependentEntityId } },
            { $group: { _id: '$testResourceId', dependencyTree: { $push: '$dependencyTree' } } },
            { $project: { testResourceId: `$_id`, _id: 0, dependencyTree: 1 } },
        ]);
    }
    async searchTestResourceTreeInfos(nodeId, keywords, resourceType, omitResourceType) {
        const searchRegexp = new RegExp(keywords, 'i');
        const condition = { nodeId };
        if (lodash_1.isString(resourceType)) {
            condition.resourceType = resourceType;
        }
        else if (lodash_1.isString(omitResourceType)) {
            condition.resourceType = { $ne: omitResourceType };
        }
        return this.nodeTestResourceTreeProvider.aggregate([
            { $match: condition },
            { $unwind: '$dependencyTree' },
            { $match: { 'dependencyTree.deep': { $gt: 1 }, 'dependencyTree.name': searchRegexp } },
            { $group: { _id: null, dependencyTree: { $push: '$dependencyTree' } } },
            { $project: { dependencyTree: 1, _id: 0 } }
        ]);
    }
    async findIntervalResourceList(condition, skip, limit, projection, sort) {
        return this.nodeTestResourceProvider.findIntervalList(condition, skip, limit, projection?.join(' '), sort);
    }
    /**
     * 获取测试规则预执行结果
     * @param nodeId
     * @param testRuleText
     */
    async preExecutionNodeTestRule(nodeId, testRuleText) {
        const { errors, rules } = this.testRuleHandler.compileTestRule(testRuleText);
        if (errors?.length) {
            throw new egg_freelog_base_1.ApplicationError('测试节点策略编辑失败', { errors });
        }
        return this.testRuleHandler.main(nodeId, rules);
    }
    /**
     * 匹配规则并且保存结果
     * @param nodeId
     * @param testRuleText
     */
    async matchAndSaveNodeTestRule(nodeId, testRuleText) {
        const { errors, rules } = this.testRuleHandler.compileTestRule(testRuleText);
        if (errors?.length) {
            throw new egg_freelog_base_1.ApplicationError('测试节点策略编辑失败', { errors });
        }
        const nodeTestRuleInfo = {
            nodeId,
            ruleText: testRuleText,
            userId: this.ctx.userId,
            status: enum_1.NodeTestRuleMatchStatus.ToBePending,
            testRules: rules.map(ruleInfo => Object({
                id: this.testNodeGenerator.generateTestRuleId(nodeId, ruleInfo.text),
                ruleInfo,
                matchErrors: [],
                efficientInfos: []
            }))
        };
        const nodeTestRule = await this.nodeTestRuleProvider.findOneAndUpdate({ nodeId }, nodeTestRuleInfo, { new: true }).then(data => {
            return data ?? this.nodeTestRuleProvider.create(nodeTestRuleInfo);
        });
        this.matchTestRuleEventHandler.handle(nodeId, true).then();
        return new Promise((resolve) => {
            setTimeout(function () {
                resolve(nodeTestRule);
            }, 50);
        });
    }
    /**
     * 尝试匹配规则
     * @param nodeId
     * @param isMandatoryMatch
     */
    async tryMatchNodeTestRule(nodeId, isMandatoryMatch) {
        const nodeTestRuleInfo = await this.nodeTestRuleProvider.findOne({ nodeId });
        if (!nodeTestRuleInfo) {
            return this.matchAndSaveNodeTestRule(nodeId, '');
        }
        this.matchTestRuleEventHandler.handle(nodeId, isMandatoryMatch).then();
        return new Promise((resolve) => {
            setTimeout(function () {
                resolve(nodeTestRuleInfo);
            }, 50);
        });
    }
    /**
     * 更新测试资源
     * @param testResource
     * @param resolveResources
     */
    async updateTestResource(testResource, resolveResources) {
        const invalidResolves = lodash_1.differenceBy(resolveResources, testResource.resolveResources, 'resourceId');
        if (!lodash_1.isEmpty(invalidResolves)) {
            throw new egg_freelog_base_1.ApplicationError(this.ctx.gettext('node-test-resolve-release-invalid-error'), { invalidResolves });
        }
        const beSignSubjects = lodash_1.chain(resolveResources).map(({ resourceId, contracts }) => contracts.map(({ policyId }) => Object({
            subjectId: resourceId, policyId
        }))).flattenDeep().value();
        const contractMap = await this.outsideApiService.batchSignNodeContracts(testResource.nodeId, beSignSubjects).then(contracts => {
            return new Map(contracts.map(x => [x.subjectId + x.policyId, x.contractId]));
        });
        resolveResources.forEach(resolveResource => resolveResource.contracts.forEach(item => {
            item.contractId = contractMap.get(resolveResource.resourceId + item.policyId) ?? '';
        }));
        const updateResolveResources = testResource.resolveResources.map(resolveResource => {
            const modifyResolveResource = resolveResources.find(x => x.resourceId === resolveResource.resourceId);
            return modifyResolveResource ? lodash_1.assign(resolveResource, modifyResolveResource) : resolveResource;
        });
        return this.nodeTestResourceProvider.findOneAndUpdate({ testResourceId: testResource.testResourceId }, {
            resolveResources: updateResolveResources
        }, { new: true });
    }
};
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], TestNodeService.prototype, "ctx", void 0);
__decorate([
    midway_1.inject(),
    __metadata("design:type", test_rule_handler_1.TestRuleHandler)
], TestNodeService.prototype, "testRuleHandler", void 0);
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], TestNodeService.prototype, "testNodeGenerator", void 0);
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], TestNodeService.prototype, "outsideApiService", void 0);
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], TestNodeService.prototype, "matchTestRuleEventHandler", void 0);
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], TestNodeService.prototype, "nodeTestRuleProvider", void 0);
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], TestNodeService.prototype, "nodeTestResourceProvider", void 0);
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], TestNodeService.prototype, "nodeTestResourceTreeProvider", void 0);
TestNodeService = __decorate([
    midway_1.provide()
], TestNodeService);
exports.TestNodeService = TestNodeService;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdC1ub2RlLXNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvYXBwL3NlcnZpY2UvdGVzdC1ub2RlLXNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0FBQUEsbUNBQXVDO0FBT3ZDLHFDQUFtRDtBQUNuRCxtQ0FBc0U7QUFDdEUsdURBQWlHO0FBQ2pHLHNFQUErRDtBQUcvRCxJQUFhLGVBQWUsR0FBNUIsTUFBYSxlQUFlO0lBR3hCLEdBQUcsQ0FBaUI7SUFFcEIsZUFBZSxDQUFrQjtJQUVqQyxpQkFBaUIsQ0FBQztJQUVsQixpQkFBaUIsQ0FBcUI7SUFFdEMseUJBQXlCLENBQTZCO0lBRXRELG9CQUFvQixDQUFzQztJQUUxRCx3QkFBd0IsQ0FBc0M7SUFFOUQsNEJBQTRCLENBQTBDO0lBRXRFLEtBQUssQ0FBQyxtQkFBbUIsQ0FBQyxTQUFpQixFQUFFLEdBQUcsSUFBSTtRQUNoRCxPQUFPLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLEdBQUcsSUFBSSxDQUFDLENBQUM7SUFDckUsQ0FBQztJQUVELEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxTQUFpQixFQUFFLEdBQUcsSUFBSTtRQUM5QyxPQUFPLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLEdBQUcsSUFBSSxDQUFDLENBQUM7SUFDbEUsQ0FBQztJQUVELEtBQUssQ0FBQyx3QkFBd0IsQ0FBQyxNQUFjLEVBQUUsR0FBRyxJQUFJO1FBQ2xELE9BQU8sSUFBSSxDQUFDLG9CQUFvQixDQUFDLE9BQU8sQ0FBQyxFQUFDLE1BQU0sRUFBQyxFQUFFLEdBQUcsSUFBSSxDQUFDLENBQUM7SUFDaEUsQ0FBQztJQUVELEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxTQUFpQjtRQUNyQyxPQUFPLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUM7SUFDMUQs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