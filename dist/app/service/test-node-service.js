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
const test_node_interface_1 = require("../../test-node-interface");
const enum_1 = require("../../enum");
const lodash_1 = require("lodash");
const egg_freelog_base_1 = require("egg-freelog-base");
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
    async findIntervalResourceList(condition, skip, limit, projection, sort) {
        return this.nodeTestResourceProvider.findIntervalList(condition, skip, limit, projection?.join(' '), sort);
    }
    /**
     * 匹配规则并且保存结果
     * @param nodeId
     * @param testRuleText
     */
    async matchAndSaveNodeTestRule(nodeId, testRuleText) {
        const testRules = this._compileAndMatchTestRule(nodeId, testRuleText);
        const nodeTestRuleInfo = {
            nodeId,
            ruleText: testRuleText,
            userId: this.ctx.userId,
            status: enum_1.NodeTestRuleMatchStatus.Pending,
            testRules: testRules.map(ruleInfo => Object({
                id: this.testNodeGenerator.generateTestRuleId(nodeId, ruleInfo.text),
                ruleInfo,
                matchErrors: [],
                efficientInfos: []
            }))
        };
        return this.nodeTestRuleProvider.findOneAndUpdate({ nodeId }, nodeTestRuleInfo, { new: true }).then(data => {
            return data ?? this.nodeTestRuleProvider.create(nodeTestRuleInfo);
        }).then(nodeTestRule => {
            this.matchTestRuleEventHandler.handle(nodeId);
            return nodeTestRule;
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
    _compileAndMatchTestRule(nodeId, testRuleText) {
        // const {errors, rules} = this.testRuleHandler.compileTestRule(testRuleText);
        // if (!isEmpty(errors)) {
        //     throw new ApplicationError(this.ctx.gettext('node-test-rule-compile-failed'), {errors})
        // }
        // if (!isEmpty(rules)) {
        //     return [];
        // }
        const ruleInfos = [];
        // ruleInfos.push({
        //     text: "alter hello  do \\n set_tags tag1,tag2\\n   show\\nend",
        //     tags: ["tag1", "tag2"],
        //     replaces: [],
        //     online: true,
        //     operation: TestNodeOperationEnum.Alter,
        //     presentableName: "hello"
        // });
        ruleInfos.push({
            text: "add  $yuliang/my-first-resource3@^1.0.0   as import_test_resource \\ndo\\nend",
            tags: ["tag1", "tag2"],
            replaces: [],
            online: null,
            operation: test_node_interface_1.TestNodeOperationEnum.Add,
            presentableName: 'import_test_resource',
            candidate: {
                name: "yuliang/my-first-resource3",
                versionRange: "^1.0.0",
                type: test_node_interface_1.TestResourceOriginType.Resource
            }
        });
        ruleInfos.push({
            text: "add   #yuliang/2a  as object_1 \\ndo  \\n  set_tags reset  \\n  replace #yuliang/readme2 with #yuliang/readme3  \\n   hide \\nend",
            tags: ["tag1", "tag2"],
            replaces: [
                {
                    replaced: {
                        name: "yuliang/my-resource-1",
                        type: test_node_interface_1.TestResourceOriginType.Resource
                    },
                    replacer: {
                        name: "yuliang/my-first-resource4",
                        type: test_node_interface_1.TestResourceOriginType.Resource
                    },
                    scopes: []
                }
            ],
            online: null,
            operation: test_node_interface_1.TestNodeOperationEnum.Add,
            presentableName: "object_1",
            candidate: {
                name: "yuliang/2a",
                type: test_node_interface_1.TestResourceOriginType.Object
            }
        });
        return ruleInfos.reverse();
    }
};
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], TestNodeService.prototype, "ctx", void 0);
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
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
], TestNodeService.prototype, "presentableService", void 0);
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], TestNodeService.prototype, "nodeProvider", void 0);
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], TestNodeService.prototype, "presentableVersionService", void 0);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdC1ub2RlLXNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvYXBwL3NlcnZpY2UvdGVzdC1ub2RlLXNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0FBQUEsbUNBQXVDO0FBQ3ZDLG1FQVVtQztBQUluQyxxQ0FBbUQ7QUFDbkQsbUNBQTREO0FBQzVELHVEQUFpRztBQUdqRyxJQUFhLGVBQWUsR0FBNUIsTUFBYSxlQUFlO0lBeUJ4QixLQUFLLENBQUMsbUJBQW1CLENBQUMsU0FBaUIsRUFBRSxHQUFHLElBQUk7UUFDaEQsT0FBTyxJQUFJLENBQUMsd0JBQXdCLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFDO0lBQ3JFLENBQUM7SUFFRCxLQUFLLENBQUMsaUJBQWlCLENBQUMsU0FBaUIsRUFBRSxHQUFHLElBQUk7UUFDOUMsT0FBTyxJQUFJLENBQUMsd0JBQXdCLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFDO0lBQ2xFLENBQUM7SUFFRCxLQUFLLENBQUMsd0JBQXdCLENBQUMsTUFBYyxFQUFFLEdBQUcsSUFBSTtRQUNsRCxPQUFPLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxPQUFPLENBQUMsRUFBQyxNQUFNLEVBQUMsRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFDO0lBQ2hFLENBQUM7SUFFRCxLQUFLLENBQUMsaUJBQWlCLENBQUMsU0FBaUI7UUFDckMsT0FBTyxJQUFJLENBQUMsd0JBQXdCLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQzFELENBQUM7SUFFRCxLQUFLLENBQUMsMkJBQTJCLENBQUMsU0FBaUIsRUFBRSxHQUFHLElBQUk7UUFDeEQsT0FBTyxJQUFJLENBQUMsNEJBQTRCLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFDO0lBQ3pFLENBQUM7SUFFRCxLQUFL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