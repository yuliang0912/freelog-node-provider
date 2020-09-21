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
    async findTestResourcePageList(condition, page, pageSize, projection, orderBy) {
        let dataList = [];
        const totalItem = await this.testResourceCount(condition);
        if (totalItem > (page - 1) * pageSize) {
            dataList = await this.nodeTestResourceProvider.findPageList(condition, page, pageSize, projection.join(' '), orderBy ?? { _id: 1 });
        }
        return { page, pageSize, totalItem, dataList };
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
], TestNodeService.prototype, "nodeProvider", void 0);
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
], TestNodeService.prototype, "nodeTestRuleProvider", void 0);
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], TestNodeService.prototype, "nodeTestResourceProvider", void 0);
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], TestNodeService.prototype, "nodeTestResourceTreeProvider", void 0);
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], TestNodeService.prototype, "presentableService", void 0);
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], TestNodeService.prototype, "outsideApiService", void 0);
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], TestNodeService.prototype, "presentableVersionService", void 0);
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], TestNodeService.prototype, "matchTestRuleEventHandler", void 0);
TestNodeService = __decorate([
    midway_1.provide()
], TestNodeService);
exports.TestNodeService = TestNodeService;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdC1ub2RlLXNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvYXBwL3NlcnZpY2UvdGVzdC1ub2RlLXNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0FBQUEsbUNBQXVDO0FBQ3ZDLG1FQVVtQztBQUluQyxxQ0FBbUQ7QUFDbkQsbUNBQTREO0FBQzVELHVEQUFrRDtBQUdsRCxJQUFhLGVBQWUsR0FBNUIsTUFBYSxlQUFlO0lBeUJ4QixLQUFLLENBQUMsbUJBQW1CLENBQUMsU0FBaUIsRUFBRSxHQUFHLElBQUk7UUFDaEQsT0FBTyxJQUFJLENBQUMsd0JBQXdCLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFDO0lBQ3JFLENBQUM7SUFFRCxLQUFLLENBQUMsaUJBQWlCLENBQUMsU0FBaUIsRUFBRSxHQUFHLElBQUk7UUFDOUMsT0FBTyxJQUFJLENBQUMsd0JBQXdCLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFDO0lBQ2xFLENBQUM7SUFFRCxLQUFLLENBQUMsd0JBQXdCLENBQUMsTUFBYyxFQUFFLEdBQUcsSUFBSTtRQUNsRCxPQUFPLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxPQUFPLENBQUMsRUFBQyxNQUFNLEVBQUMsRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFDO0lBQ2hFLENBQUM7SUFFRCxLQUFLLENBQUMsaUJBQWlCLENBQUMsU0FBaUI7UUFDckMsT0FBTyxJQUFJLENBQUMsd0JBQXdCLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQzFELENBQUM7SUFFRCxLQUFLLENBQUMsMkJBQTJCLENBQUMsU0FBaUIsRUFBRSxHQUFHLElBQUk7UUFDeEQsT0FBTyxJQUFJLENBQUMsNEJBQTRCLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFDO0lBQ3pFLENBQUM7SUFFRCxLQUFL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