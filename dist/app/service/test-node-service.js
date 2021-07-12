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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdC1ub2RlLXNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvYXBwL3NlcnZpY2UvdGVzdC1ub2RlLXNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0FBQUEsbUNBQXVDO0FBT3ZDLHFDQUFtRDtBQUNuRCxtQ0FBc0U7QUFDdEUsdURBQWlHO0FBQ2pHLHNFQUErRDtBQUcvRCxJQUFhLGVBQWUsR0FBNUIsTUFBYSxlQUFlO0lBbUJ4QixLQUFLLENBQUMsbUJBQW1CLENBQUMsU0FBaUIsRUFBRSxHQUFHLElBQUk7UUFDaEQsT0FBTyxJQUFJLENBQUMsd0JBQXdCLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFDO0lBQ3JFLENBQUM7SUFFRCxLQUFLLENBQUMsaUJBQWlCLENBQUMsU0FBaUIsRUFBRSxHQUFHLElBQUk7UUFDOUMsT0FBTyxJQUFJLENBQUMsd0JBQXdCLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFDO0lBQ2xFLENBQUM7SUFFRCxLQUFLLENBQUMsd0JBQXdCLENBQUMsTUFBYyxFQUFFLEdBQUcsSUFBSTtRQUNsRCxPQUFPLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxPQUFPLENBQUMsRUFBQyxNQUFNLEVBQUMsRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFDO0lBQ2hFLENBQUM7SUFFRCxLQUFLLENBQUMsaUJBQWlCLENBQUMsU0FBaUI7UUFDckMsT0FBTyxJQUFJLENBQUMsd0JBQXdCLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQzFELENBQUM7SUFFRCxLQUFLLENBQUMsMkJBQTJCLENBQUMsU0FBaUIsRUFBRSxHQUFHLElBQUk7UUFDeEQsT0FBTyxJQUFJLENBQUMsNEJBQTRCLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFDO0lBQ3pFLENBQUM7SUFFRCxLQUFL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