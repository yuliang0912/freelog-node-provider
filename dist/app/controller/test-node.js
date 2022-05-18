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
    async test() {
        //const nodeTestRuleProvider = this.testNodeService['nodeTestRuleProvider'];
        // const nodeTestRule = await nodeTestRuleProvider.find({}, 'nodeId ruleText');
        // for (const item of nodeTestRule) {
        //     await this.testNodeService.matchAndSaveNodeTestRule(item.nodeId, item.ruleText ?? '');
        // }
        //
        // const nodes = await this.nodeService.find({});
        // for (const nodeInfo of nodes) {
        //     await nodeTestRuleProvider.updateOne({nodeId: nodeInfo.nodeId}, {userId: nodeInfo.ownerUserId});
        // }
        // const nodeTestResourceProvider = this.testNodeService['nodeTestResourceProvider'];
        // const testResources = await nodeTestResourceProvider.find({});
        // console.log(testResources.length);
        // for (const item1 of testResources) {
        //     const nodeInfo = nodes.find(x => x.nodeId === item1.nodeId);
        //     if (!nodeInfo) {
        //         continue;
        //     }
        //     await nodeTestResourceProvider.updateOne({testResourceId: item1.testResourceId}, {userId: nodeInfo.ownerUserId});
        // }
        // this.ctx.success(nodeTestRule.length);
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
            condition.$or = [{ testResourceName: searchExp }, { 'stateInfo.titleInfo.title': searchExp }, { 'originInfo.name': searchExp }];
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
    async showTestResourceDetail() {
        const { ctx } = this;
        const testResourceId = ctx.checkQuery('testResourceId').ignoreParamWhenEmpty().isMd5().value;
        const testResourceName = ctx.checkQuery('testResourceName').ignoreParamWhenEmpty().len(1, 128).value;
        ctx.validateParams();
        const condition = {};
        if (testResourceId) {
            condition.testResourceId = testResourceId;
        }
        if ((0, lodash_1.isString)(testResourceName)) {
            condition.testResourceName = testResourceName;
        }
        if (!Object.keys(condition).length) {
            throw new egg_freelog_base_1.ArgumentError(this.ctx.gettext('params-required-validate-failed'));
        }
        await this.testNodeService.findOneTestResource(condition).then(ctx.success);
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
    (0, midway_1.get)('/test'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], TestNodeController.prototype, "test", null);
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
    (0, midway_1.get)('/testResources/detail'),
    (0, egg_freelog_base_1.visitorIdentityValidator)(egg_freelog_base_1.IdentityTypeEnum.LoginUser),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], TestNodeController.prototype, "showTestResourceDetail", null);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdC1ub2RlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2FwcC9jb250cm9sbGVyL3Rlc3Qtbm9kZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7QUFBQSxtQ0FBaUM7QUFFakMsbUNBQW1FO0FBQ25FLG1FQUFxRztBQUNyRyxtQ0FBeUY7QUFDekYsdURBRTBCO0FBSTFCLElBQWEsa0JBQWtCLEdBQS9CLE1BQWEsa0JBQWtCO0lBRzNCLEdBQUcsQ0FBaUI7SUFFcEIsaUJBQWlCLENBQUM7SUFFbEIsaUJBQWlCLENBQUM7SUFFbEIsV0FBVyxDQUFlO0lBRTFCLGVBQWUsQ0FBbUI7SUFFbEMseUJBQXlCLENBQXNCO0lBRS9DLFdBQVc7SUFHWCxLQUFLLENBQUMsZ0JBQWdCO1FBRWxCLE1BQU0sRUFBQyxHQUFHLEVBQUMsR0FBRyxJQUFJLENBQUM7UUFDbkIsTUFBTSxNQUFNLEdBQUcsR0FBRyxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO1FBQzdELEdBQUcsQ0FBQyxjQUFjLEVBQUUsQ0FBQztRQUVyQixNQUFNLElBQUksQ0FBQyxlQUFlLENBQUMsd0JBQXdCLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUNsRixDQUFDO0lBRUQsV0FBVztJQUdYLEtBQUssQ0FBQyxjQUFjO1FBRWhCLE1BQU0sRUFBQyxHQUFHLEVBQUMsR0FBRyxJQUFJLENBQUM7UUFDbkIsTUFBTSxNQUFNLEdBQUcsR0FBRyxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO1FBQzdELE1BQU0sWUFBWSxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsY0FBYyxDQUFDLENBQUMsS0FBSyxF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