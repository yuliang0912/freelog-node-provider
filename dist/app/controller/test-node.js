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
exports.TestNodeController = void 0;
const semver_1 = require("semver");
const midway_1 = require("midway");
const test_node_interface_1 = require("../../test-node-interface");
const lodash_1 = require("lodash");
const egg_freelog_base_1 = require("egg-freelog-base");
let TestNodeController = class TestNodeController {
    ctx;
    nodeCommonChecker;
    testNodeGenerator;
    nodeService;
    testNodeService;
    resolveResourcesValidator;
    // 查看节点测试规则
    async showTestRuleInfo() {
        const { ctx } = this;
        const nodeId = ctx.checkParams('nodeId').toInt().gt(0).value;
        ctx.validateParams();
        await this.testNodeService.findNodeTestRuleInfoById(nodeId).then(ctx.success);
    }
    // 创建节点测试规则
    async createTestRule() {
        const { ctx } = this;
        const nodeId = ctx.checkParams('nodeId').toInt().gt(0).value;
        const testRuleText = ctx.checkBody('testRuleText').exist().type('string').decodeURIComponent().value;
        ctx.validateParams();
        const nodeInfo = await this.nodeService.findById(nodeId);
        this.nodeCommonChecker.nullObjectAndUserAuthorizationCheck(nodeInfo);
        await this.testNodeService.matchAndSaveNodeTestRule(nodeId, testRuleText ?? '').then(ctx.success);
    }
    // 更新节点测试规则
    async updateTestRule() {
        const { ctx } = this;
        const nodeId = ctx.checkParams('nodeId').exist().toInt().gt(0).value;
        const additionalTestRule = ctx.checkBody('additionalTestRule').exist().type('string').decodeURIComponent().value;
        ctx.validateParams();
        const nodeInfo = await this.nodeService.findById(nodeId);
        this.nodeCommonChecker.nullObjectAndUserAuthorizationCheck(nodeInfo);
        const nodeTestRule = await this.testNodeService.findNodeTestRuleInfoById(nodeId, 'ruleText');
        const currentRuleText = additionalTestRule + '   ' + (nodeTestRule?.ruleText ?? '');
        await this.testNodeService.matchAndSaveNodeTestRule(nodeId, currentRuleText).then(ctx.success);
    }
    // 规则改动之后数据结构有变动,会强制重新匹配一次
    async rematch() {
        const { ctx } = this;
        const nodeId = ctx.checkParams('nodeId').toInt().gt(0).value;
        const isMandatoryMatch = ctx.checkBody('isMandatoryMatch').optional().toInt().in([0, 1]).default(0).value;
        ctx.validateParams();
        const nodeInfo = await this.nodeService.findById(nodeId);
        this.nodeCommonChecker.nullObjectAndUserAuthorizationCheck(nodeInfo);
        await this.testNodeService.tryMatchNodeTestRule(nodeId, isMandatoryMatch).then();
        ctx.success(true);
    }
    // 节点测试规则预执行
    async testRulePreExecution() {
        const { ctx } = this;
        const nodeId = ctx.checkParams('nodeId').toInt().gt(0).value;
        const testRuleText = ctx.checkBody('testRuleText').exist().type('string').decodeURIComponent().value;
        ctx.validateParams();
        const nodeInfo = await this.nodeService.findById(nodeId);
        this.nodeCommonChecker.nullObjectAndUserAuthorizationCheck(nodeInfo);
        const ruleMatchedInfos = await this.testNodeService.preExecutionNodeTestRule(nodeId, testRuleText ?? '');
        ctx.success(ruleMatchedInfos.map(x => (0, lodash_1.pick)(x, ['id', 'isValid', 'matchErrors', 'efficientInfos', 'effectiveMatchCount', 'ruleInfo'])));
    }
    // 重新匹配节点测试规则
    async rematchTestRule() {
        const { ctx } = this;
        const nodeId = ctx.checkParams('nodeId').toInt().gt(0).value;
        const isMandatoryMatch = ctx.checkBody('isMandatoryMatch').optional().toInt().in([0, 1]).default(0).value;
        ctx.validateParams();
        const nodeInfo = await this.nodeService.findById(nodeId);
        this.nodeCommonChecker.nullObjectAndUserAuthorizationCheck(nodeInfo);
        await this.testNodeService.tryMatchNodeTestRule(nodeId, isMandatoryMatch).then();
        ctx.success(true);
    }
    // 查询节点下的所有测试资源
    async testResources() {
        const { ctx } = this;
        const nodeId = ctx.checkParams('nodeId').exist().toInt().gt(0).value;
        const skip = ctx.checkQuery('skip').optional().toInt().default(0).ge(0).value;
        const limit = ctx.checkQuery('limit').optional().toInt().default(10).gt(0).lt(101).value;
        const sort = ctx.checkQuery('sort').optional().value;
        const keywords = ctx.checkQuery('keywords').optional().type('string').len(1, 100).value;
        const tags = ctx.checkQuery('tags').optional().toSplitArray().len(1, 20).value;
        const resourceType = ctx.checkQuery('resourceType').optional().isResourceType().value;
        const onlineStatus = ctx.checkQuery('onlineStatus').optional().toInt().default(1).in([0, 1, 2]).value;
        const projection = ctx.checkQuery('projection').optional().toSplitArray().default([]).value;
        const omitResourceType = ctx.checkQuery('omitResourceType').optional().isResourceType().value;
        ctx.validateParams();
        const nodeInfo = await this.nodeService.findById(nodeId);
        this.nodeCommonChecker.nullObjectAndUserAuthorizationCheck(nodeInfo);
        const condition = { nodeId };
        if ((0, lodash_1.isString)(resourceType)) { //resourceType 与 omitResourceType互斥
            condition.resourceType = resourceType;
        }
        else if ((0, lodash_1.isString)(omitResourceType)) {
            condition.resourceType = { $ne: omitResourceType };
        }
        if ((0, lodash_1.isArray)(tags)) {
            condition['stateInfo.tagInfo.tags'] = { $in: tags };
        }
        if (onlineStatus === 1 || onlineStatus === 0) {
            condition['stateInfo.onlineStatusInfo.onlineStatus'] = onlineStatus;
        }
        if ((0, lodash_1.isString)(keywords)) {
            const searchExp = { $regex: keywords, $options: 'i' };
            condition.$or = [{ testResourceName: searchExp }, { 'originInfo.name': searchExp }];
        }
        await this.testNodeService.findIntervalResourceList(condition, skip, limit, projection, sort).then(ctx.success);
    }
    // 根据源资源获取测试资源.例如通过发行名称或者发行ID获取测试资源.API不再提供单一查询
    async testResourceList() {
        const { ctx } = this;
        const nodeId = ctx.checkParams('nodeId').exist().toInt().gt(0).value;
        const entityType = ctx.checkQuery('entityType').optional().in([test_node_interface_1.TestResourceOriginType.Resource, test_node_interface_1.TestResourceOriginType.Object]).value;
        const entityIds = ctx.checkQuery('entityIds').optional().isSplitMongoObjectId().toSplitArray().len(1, 100).value;
        const entityNames = ctx.checkQuery('entityNames').optional().toSplitArray().len(1, 100).value;
        const projection = ctx.checkQuery('projection').optional().toSplitArray().default([]).value;
        ctx.validateParams();
        if ([entityType, entityIds, entityNames].every(lodash_1.isUndefined)) {
            throw new egg_freelog_base_1.ArgumentError('params-required-validate-failed', 'entityType,entityIds,entityNames');
        }
        const nodeInfo = await this.nodeService.findById(nodeId);
        this.nodeCommonChecker.nullObjectAndUserAuthorizationCheck(nodeInfo);
        const condition = { nodeId };
        if (entityType) {
            condition['originInfo.type'] = entityType;
        }
        if ((0, lodash_1.isArray)(entityIds)) {
            condition['originInfo.id'] = { $in: entityIds };
        }
        if ((0, lodash_1.isArray)(entityNames)) {
            condition['originInfo.name'] = { $in: entityNames };
        }
        await this.testNodeService.findTestResources(condition, projection.join(' ')).then(ctx.success);
    }
    // 查看测试资源详情
    async showTestResource() {
        const { ctx } = this;
        const testResourceId = ctx.checkParams('testResourceId').exist().isMd5().value;
        ctx.validateParams();
        await this.testNodeService.findOneTestResource({ testResourceId }).then(ctx.success);
    }
    // 解决测试资源的依赖授权
    async updateTestResource() {
        const { ctx } = this;
        const testResourceId = ctx.checkParams('testResourceId').exist().isMd5().value;
        const resolveResources = ctx.checkBody('resolveResources').exist().isArray().len(1, 999).value;
        ctx.validateParams();
        const resolveResourcesValidateResult = this.resolveResourcesValidator.validate(resolveResources ?? []);
        if (!(0, lodash_1.isEmpty)(resolveResourcesValidateResult.errors)) {
            throw new egg_freelog_base_1.ArgumentError(ctx.gettext('params-format-validate-failed', 'resolveResources'), {
                errors: resolveResourcesValidateResult.errors
            });
        }
        const testResourceInfo = await this.testNodeService.findOneTestResource({ testResourceId });
        ctx.entityNullValueAndUserAuthorizationCheck(testResourceInfo, {
            msg: ctx.gettext('params-validate-failed', 'testResourceId')
        });
        await this.testNodeService.updateTestResource(testResourceInfo, resolveResources).then(ctx.success);
    }
    // 根据依赖项的ID和版本范围匹配测试资源信息
    async searchTestResources() {
        const { ctx } = this;
        const nodeId = ctx.checkParams('nodeId').exist().toInt().gt(0).value;
        const dependentEntityId = ctx.checkQuery('dependentEntityId').exist().isMongoObjectId().value;
        const dependentEntityVersionRange = ctx.checkQuery('dependentEntityVersionRange').optional().toVersionRange().value;
        const resourceType = ctx.checkQuery('resourceType').optional().isResourceType().value;
        const omitResourceType = ctx.checkQuery('omitResourceType').optional().isResourceType().value;
        ctx.validateParams();
        const isFilterVersionRange = (0, lodash_1.isString)(dependentEntityVersionRange) && dependentEntityVersionRange !== '*';
        let testResourceTreeInfos = await this.testNodeService.matchTestResourceTreeInfos(nodeId, dependentEntityId, resourceType, omitResourceType);
        if (isFilterVersionRange) {
            testResourceTreeInfos = testResourceTreeInfos.filter(item => item.dependencyTree.some(x => x.id === dependentEntityId && (0, semver_1.satisfies)(dependentEntityVersionRange, x.version)));
        }
        if ((0, lodash_1.isEmpty)(testResourceTreeInfos)) {
            return ctx.success([]);
        }
        const testResourceIds = testResourceTreeInfos.map(x => x.testResourceId);
        const testResources = await this.testNodeService.findTestResources({ testResourceId: { $in: testResourceIds } }, 'testResourceId testResourceName resourceType originInfo stateInfo.replaceInfo.rootResourceReplacer');
        ctx.success(testResources.map(x => {
            const entityInfo = x.stateInfo.replaceInfo?.rootResourceReplacer ?? x.originInfo;
            return {
                testResourceId: x.testResourceId,
                testResourceName: x.testResourceName,
                resourceType: x.resourceType,
                entityName: entityInfo.name,
                entityId: entityInfo.id,
                entityType: entityInfo.type
            };
        }));
    }
    // 查看测试资源的依赖树
    async testResourceDependencyTree() {
        const { ctx } = this;
        const testResourceId = ctx.checkParams('testResourceId').exist().isMd5().value;
        const nid = ctx.checkQuery('nid').optional().type('string').value;
        const maxDeep = ctx.checkQuery('maxDeep').optional().toInt().default(100).lt(101).value;
        const isContainRootNode = ctx.checkQuery('isContainRootNode').optional().default(true).toBoolean().value;
        ctx.validateParams();
        const testResourceTreeInfo = await this.testNodeService.findOneTestResourceTreeInfo({ testResourceId }, 'dependencyTree');
        if (!testResourceTreeInfo) {
            return [];
        }
        const dependencyTree = this.testNodeGenerator.generateTestResourceDependencyTree(testResourceTreeInfo.dependencyTree, nid, maxDeep, isContainRootNode);
        ctx.success(dependencyTree);
    }
    // 查看测试资源的授权树
    async testResourceAuthTree() {
        const { ctx } = this;
        const testResourceId = ctx.checkParams('testResourceId').exist().isMd5().value;
        const nid = ctx.checkQuery('nid').optional().type('string').len(12, 12).value;
        const maxDeep = ctx.checkQuery('maxDeep').optional().toInt().default(100).lt(101).value;
        const isContainRootNode = ctx.checkQuery('isContainRootNode').optional().default(true).toBoolean().value;
        ctx.validateParams();
        const testResourceTreeInfo = await this.testNodeService.findOneTestResourceTreeInfo({ testResourceId }, 'authTree');
        if (!testResourceTreeInfo) {
            return [];
        }
        const dependencyTree = this.testNodeGenerator.convertTestResourceAuthTree(testResourceTreeInfo.authTree, nid, maxDeep, isContainRootNode);
        ctx.success(dependencyTree);
    }
    // 搜索节点全部测试资源的依赖树.返回包含该依赖的测试资源信息
    async searchTestResourceDependencyTree() {
        const { ctx } = this;
        const nodeId = ctx.checkParams('nodeId').exist().toInt().gt(0).value;
        const keywords = ctx.checkQuery('keywords').exist().type('string').value;
        const resourceType = ctx.checkQuery('resourceType').optional().isResourceType().value;
        const omitResourceType = ctx.checkQuery('omitResourceType').optional().isResourceType().value;
        ctx.validateParams();
        const searchResults = [];
        const nodeTestResourceDependencyTree = await this.testNodeService.searchTestResourceTreeInfos(nodeId, keywords, resourceType, omitResourceType);
        (0, lodash_1.chain)(nodeTestResourceDependencyTree).map(x => x.dependencyTree).flattenDeep().groupBy(x => x.id).forIn((values) => {
            const model = (0, lodash_1.pick)((0, lodash_1.first)(values), ['id', 'name', 'type']);
            model['versions'] = (0, lodash_1.uniq)(values.filter(x => x.version).map(x => x.version));
            searchResults.push(model);
        }).value();
        ctx.success(searchResults);
    }
    // 过滤测试资源依赖树.只显示指定的依赖
    async filterTestResourceDependencyTree() {
        const { ctx } = this;
        const testResourceId = ctx.checkParams('testResourceId').exist().isMd5().value;
        const dependentEntityId = ctx.checkQuery('dependentEntityId').exist().isMongoObjectId().value;
        const dependentEntityVersionRange = ctx.checkQuery('dependentEntityVersionRange').optional().toVersionRange().value;
        ctx.validateParams();
        const testResourceTreeInfo = await this.testNodeService.findOneTestResourceTreeInfo({ testResourceId }, 'dependencyTree');
        if (!testResourceTreeInfo) {
            return ctx.success([]);
        }
        const filteredDependencyTree = this.testNodeGenerator.filterTestResourceDependencyTree(testResourceTreeInfo.dependencyTree ?? [], dependentEntityId, dependentEntityVersionRange);
        ctx.success(filteredDependencyTree);
    }
};
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", Object)
], TestNodeController.prototype, "ctx", void 0);
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", Object)
], TestNodeController.prototype, "nodeCommonChecker", void 0);
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", Object)
], TestNodeController.prototype, "testNodeGenerator", void 0);
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", Object)
], TestNodeController.prototype, "nodeService", void 0);
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", Object)
], TestNodeController.prototype, "testNodeService", void 0);
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", Object)
], TestNodeController.prototype, "resolveResourcesValidator", void 0);
__decorate([
    (0, midway_1.get)('/:nodeId/rules'),
    (0, egg_freelog_base_1.visitorIdentityValidator)(egg_freelog_base_1.IdentityTypeEnum.LoginUser | egg_freelog_base_1.IdentityTypeEnum.InternalClient),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], TestNodeController.prototype, "showTestRuleInfo", null);
__decorate([
    (0, midway_1.post)('/:nodeId/rules'),
    (0, egg_freelog_base_1.visitorIdentityValidator)(egg_freelog_base_1.IdentityTypeEnum.LoginUser),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], TestNodeController.prototype, "createTestRule", null);
__decorate([
    (0, midway_1.put)('/:nodeId/rules'),
    (0, egg_freelog_base_1.visitorIdentityValidator)(egg_freelog_base_1.IdentityTypeEnum.LoginUser),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], TestNodeController.prototype, "updateTestRule", null);
__decorate([
    (0, midway_1.get)('/rematch'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], TestNodeController.prototype, "rematch", null);
__decorate([
    (0, midway_1.post)('/:nodeId/rules/preExecution'),
    (0, egg_freelog_base_1.visitorIdentityValidator)(egg_freelog_base_1.IdentityTypeEnum.LoginUser),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], TestNodeController.prototype, "testRulePreExecution", null);
__decorate([
    (0, midway_1.post)('/:nodeId/rules/rematch'),
    (0, egg_freelog_base_1.visitorIdentityValidator)(egg_freelog_base_1.IdentityTypeEnum.LoginUser),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], TestNodeController.prototype, "rematchTestRule", null);
__decorate([
    (0, midway_1.get)('/:nodeId/testResources'),
    (0, egg_freelog_base_1.visitorIdentityValidator)(egg_freelog_base_1.IdentityTypeEnum.LoginUser),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], TestNodeController.prototype, "testResources", null);
__decorate([
    (0, midway_1.get)('/:nodeId/testResources/list'),
    (0, egg_freelog_base_1.visitorIdentityValidator)(egg_freelog_base_1.IdentityTypeEnum.LoginUser),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], TestNodeController.prototype, "testResourceList", null);
__decorate([
    (0, midway_1.get)('/testResources/:testResourceId'),
    (0, egg_freelog_base_1.visitorIdentityValidator)(egg_freelog_base_1.IdentityTypeEnum.LoginUser),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], TestNodeController.prototype, "showTestResource", null);
__decorate([
    (0, midway_1.put)('/testResources/:testResourceId'),
    (0, egg_freelog_base_1.visitorIdentityValidator)(egg_freelog_base_1.IdentityTypeEnum.LoginUser),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], TestNodeController.prototype, "updateTestResource", null);
__decorate([
    (0, midway_1.get)('/:nodeId/testResources/searchByDependency'),
    (0, egg_freelog_base_1.visitorIdentityValidator)(egg_freelog_base_1.IdentityTypeEnum.LoginUser),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], TestNodeController.prototype, "searchTestResources", null);
__decorate([
    (0, midway_1.get)('/testResources/:testResourceId/dependencyTree'),
    (0, egg_freelog_base_1.visitorIdentityValidator)(egg_freelog_base_1.IdentityTypeEnum.LoginUser),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], TestNodeController.prototype, "testResourceDependencyTree", null);
__decorate([
    (0, midway_1.get)('/testResources/:testResourceId/authTree'),
    (0, egg_freelog_base_1.visitorIdentityValidator)(egg_freelog_base_1.IdentityTypeEnum.LoginUser),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], TestNodeController.prototype, "testResourceAuthTree", null);
__decorate([
    (0, midway_1.get)('/:nodeId/testResources/dependencyTree/search'),
    (0, egg_freelog_base_1.visitorIdentityValidator)(egg_freelog_base_1.IdentityTypeEnum.LoginUser),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], TestNodeController.prototype, "searchTestResourceDependencyTree", null);
__decorate([
    (0, midway_1.get)('/testResources/:testResourceId/dependencyTree/filter'),
    (0, egg_freelog_base_1.visitorIdentityValidator)(egg_freelog_base_1.IdentityTypeEnum.LoginUser),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], TestNodeController.prototype, "filterTestResourceDependencyTree", null);
TestNodeController = __decorate([
    (0, midway_1.provide)(),
    (0, midway_1.controller)('/v2/testNodes')
], TestNodeController);
exports.TestNodeController = TestNodeController;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdC1ub2RlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2FwcC9jb250cm9sbGVyL3Rlc3Qtbm9kZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7QUFBQSxtQ0FBaUM7QUFFakMsbUNBQW1FO0FBQ25FLG1FQUFtRjtBQUNuRixtQ0FBeUY7QUFDekYsdURBRTBCO0FBSTFCLElBQWEsa0JBQWtCLEdBQS9CLE1BQWEsa0JBQWtCO0lBRzNCLEdBQUcsQ0FBaUI7SUFFcEIsaUJBQWlCLENBQUM7SUFFbEIsaUJBQWlCLENBQUM7SUFFbEIsV0FBVyxDQUFlO0lBRTFCLGVBQWUsQ0FBbUI7SUFFbEMseUJBQXlCLENBQXNCO0lBRS9DLFdBQVc7SUFHWCxLQUFLLENBQUMsZ0JBQWdCO1FBRWxCLE1BQU0sRUFBQyxHQUFHLEVBQUMsR0FBRyxJQUFJLENBQUM7UUFDbkIsTUFBTSxNQUFNLEdBQUcsR0FBRyxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO1FBQzdELEdBQUcsQ0FBQyxjQUFjLEVBQUUsQ0FBQztRQUVyQixNQUFNLElBQUksQ0FBQyxlQUFlLENBQUMsd0JBQXdCLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUNsRixDQUFDO0lBRUQsV0FBVztJQUdYLEtBQUssQ0FBQyxjQUFjO1FBRWhCLE1BQU0sRUFBQyxHQUFHLEVBQUMsR0FBRyxJQUFJLENBQUM7UUFDbkIsTUFBTSxNQUFNLEdBQUcsR0FBRyxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO1FBQzdELE1BQU0sWUFBWSxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsY0FBYyxDQUFDLENBQUMsS0FBSyxF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