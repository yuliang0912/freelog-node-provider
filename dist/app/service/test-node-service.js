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
    async searchTestResourceTreeInfos(nodeId, keywords) {
        const searchRegexp = new RegExp(keywords, 'i');
        return this.nodeTestResourceTreeProvider.aggregate([
            { $match: { nodeId } },
            { $unwind: '$dependencyTree' },
            { $match: { 'dependencyTree.name': searchRegexp } },
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdC1ub2RlLXNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvYXBwL3NlcnZpY2UvdGVzdC1ub2RlLXNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0FBQUEsbUNBQXVDO0FBT3ZDLHFDQUFtRDtBQUNuRCxtQ0FBNEQ7QUFDNUQsdURBQWlHO0FBQ2pHLHNFQUErRDtBQUcvRCxJQUFhLGVBQWUsR0FBNUIsTUFBYSxlQUFlO0lBbUJ4QixLQUFLLENBQUMsbUJBQW1CLENBQUMsU0FBaUIsRUFBRSxHQUFHLElBQUk7UUFDaEQsT0FBTyxJQUFJLENBQUMsd0JBQXdCLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFDO0lBQ3JFLENBQUM7SUFFRCxLQUFLLENBQUMsaUJBQWlCLENBQUMsU0FBaUIsRUFBRSxHQUFHLElBQUk7UUFDOUMsT0FBTyxJQUFJLENBQUMsd0JBQXdCLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFDO0lBQ2xFLENBQUM7SUFFRCxLQUFLLENBQUMsd0JBQXdCLENBQUMsTUFBYyxFQUFFLEdBQUcsSUFBSTtRQUNsRCxPQUFPLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxPQUFPLENBQUMsRUFBQyxNQUFNLEVBQUMsRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFDO0lBQ2hFLENBQUM7SUFFRCxLQUFLLENBQUMsaUJBQWlCLENBQUMsU0FBaUI7UUFDckMsT0FBTyxJQUFJLENBQUMsd0JBQXdCLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQzFELENBQUM7SUFFRCxLQUFLLENBQUMsMkJBQTJCLENBQUMsU0FBaUIsRUFBRSxHQUFHLElBQUk7UUFDeEQsT0FBTyxJQUFJLENBQUMsNEJBQTRCLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFDO0lBQ3pFLENBQUM7SUFFRCxLQUFL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