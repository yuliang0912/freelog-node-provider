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
const vistorIdentityDecorator_1 = require("../../extend/vistorIdentityDecorator");
const index_1 = require("egg-freelog-base/index");
const test_node_interface_1 = require("../../test-node-interface");
const lodash_1 = require("lodash");
let TestNodeController = class TestNodeController {
    async showTestRuleInfo(ctx) {
        const nodeId = ctx.checkParams('nodeId').toInt().gt(0).value;
        ctx.validateParams();
        await this.testNodeService.findNodeTestRuleInfoById(nodeId).then(ctx.success);
    }
    async createTestRule(ctx) {
        const nodeId = ctx.checkParams('nodeId').toInt().gt(0).value;
        const testRuleText = ctx.checkBody('testRuleText').exist().type('string').decodeURIComponent().value;
        ctx.validateParams();
        const nodeInfo = await this.nodeService.findById(nodeId);
        this.nodeCommonChecker.nullObjectAndUserAuthorizationCheck(nodeInfo);
        await this.testNodeService.matchAndSaveNodeTestRule(80000000, testRuleText ?? '').then(ctx.success);
    }
    async updateTestRule(ctx) {
        const nodeId = ctx.checkParams('nodeId').exist().toInt().gt(0).value;
        const additionalTestRule = ctx.checkBody('additionalTestRule').exist().type('string').decodeURIComponent().value;
        ctx.validateParams();
        const nodeInfo = await this.nodeService.findById(nodeId);
        this.nodeCommonChecker.nullObjectAndUserAuthorizationCheck(nodeInfo);
        const nodeTestRule = await this.testNodeService.findNodeTestRuleInfoById(nodeId, 'ruleText');
        const currentRuleText = (nodeTestRule?.ruleText ?? '') + '   ' + additionalTestRule;
        await ctx.service.testRuleService.matchAndSaveNodeTestRule(nodeId, currentRuleText).then(ctx.success);
    }
    async rematchTestRule(ctx) {
        const nodeId = ctx.checkParams('nodeId').toInt().gt(0).value;
        ctx.validateParams();
        const nodeInfo = await this.nodeService.findById(nodeId);
        this.nodeCommonChecker.nullObjectAndUserAuthorizationCheck(nodeInfo);
        const nodeTestRule = await this.testNodeService.findNodeTestRuleInfoById(nodeId, 'ruleText');
        await this.testNodeService.matchAndSaveNodeTestRule(nodeId, nodeTestRule?.ruleText ?? '').then(ctx.success);
    }
    async testResources(ctx) {
        const nodeId = ctx.checkParams('nodeId').exist().toInt().gt(0).value;
        const page = ctx.checkQuery("page").optional().default(1).toInt().gt(0).value;
        const pageSize = ctx.checkQuery("pageSize").optional().default(10).gt(0).lt(101).toInt().value;
        const keywords = ctx.checkQuery('keywords').optional().type('string').len(1, 100).value;
        const tags = ctx.checkQuery('tags').optional().toSplitArray().len(1, 20).value;
        const resourceType = ctx.checkQuery('resourceType').optional().isResourceType().value;
        const isOnline = ctx.checkQuery('isOnline').optional().toInt().default(1).in([0, 1, 2]).value;
        const projection = ctx.checkQuery('projection').optional().toSplitArray().default([]).value;
        const omitResourceType = ctx.checkQuery('omitResourceType').optional().isResourceType().value;
        ctx.validateParams();
        const nodeInfo = await this.nodeService.findById(nodeId);
        this.nodeCommonChecker.nullObjectAndUserAuthorizationCheck(nodeInfo);
        const condition = { nodeId };
        if (lodash_1.isString(resourceType)) { //resourceType 与 omitResourceType互斥
            condition.resourceType = resourceType;
        }
        else if (lodash_1.isString(omitResourceType)) {
            condition.resourceType = { $ne: omitResourceType };
        }
        if (lodash_1.isArray(tags)) {
            condition['stateInfo.tagsInfo.tags'] = { $in: tags };
        }
        if (isOnline === 1 || isOnline === 0) {
            condition['stateInfo.onlineStatusInfo.isOnline'] = isOnline;
        }
        if (lodash_1.isString(keywords)) {
            const searchExp = { $regex: keywords, $options: 'i' };
            condition.$or = [{ testResourceName: searchExp }, { 'originInfo.name': searchExp }];
        }
        await this.testNodeService.findTestResourcePageList(condition, page, pageSize, projection, null).then(ctx.success);
    }
    /**
     * 根据源资源获取测试资源.例如通过发行名称或者发行ID获取测试资源.API不再提供单一查询
     * @param ctx
     */
    async testResourceList(ctx) {
        const nodeId = ctx.checkParams('nodeId').exist().toInt().gt(0).value;
        const entityType = ctx.checkQuery('entityType').optional().in([test_node_interface_1.TestResourceOriginType.Resource, test_node_interface_1.TestResourceOriginType.Object]).value;
        const entityIds = ctx.checkQuery('entityIds').optional().isSplitMongoObjectId().toSplitArray().len(1, 100).value;
        const entityNames = ctx.checkQuery('entityNames').optional().toSplitArray().len(1, 100).value;
        const projection = ctx.checkQuery('projection').optional().toSplitArray().default([]).value;
        ctx.validateParams();
        if ([entityType, entityIds, entityNames].every(lodash_1.isUndefined)) {
            throw new index_1.ArgumentError('params-required-validate-failed', 'entityType,entityIds,entityNames');
        }
        const nodeInfo = await this.nodeService.findById(nodeId);
        this.nodeCommonChecker.nullObjectAndUserAuthorizationCheck(nodeInfo);
        const condition = { nodeId };
        if (entityType) {
            condition['originInfo.type'] = entityType;
        }
        if (lodash_1.isArray(entityIds)) {
            condition['originInfo.id'] = { $in: entityIds };
        }
        if (lodash_1.isArray(entityNames)) {
            condition['originInfo.name'] = { $in: entityNames };
        }
        await this.testNodeService.findTestResources(condition, projection.join(' ')).then(ctx.success);
    }
    async showTestResource(ctx) {
        const testResourceId = ctx.checkParams('testResourceId').exist().isMd5().value;
        ctx.validateParams();
        await this.testNodeService.findOneTestResource({ testResourceId }).then(ctx.success);
    }
    async updateTestResource(ctx) {
        const testResourceId = ctx.checkParams('testResourceId').exist().isMd5().value;
        const resolveResources = ctx.checkBody('resolveResources').exist().isArray().len(1, 999).value;
        ctx.validateParams();
        const resolveResourcesValidateResult = this.resolveResourcesValidator.validate(resolveResources ?? []);
        if (!lodash_1.isEmpty(resolveResourcesValidateResult.errors)) {
            throw new index_1.ArgumentError(ctx.gettext('params-format-validate-failed', 'resolveResources'), {
                errors: resolveResourcesValidateResult.errors
            });
        }
        const testResourceInfo = await this.testNodeService.findOneTestResource({ testResourceId });
        ctx.entityNullValueAndUserAuthorizationCheck(testResourceInfo, {
            msg: ctx.gettext('params-validate-failed', 'testResourceId')
        });
        await this.testNodeService.updateTestResource(testResourceInfo, resolveResources).then(ctx.success);
    }
    async searchTestResources(ctx) {
        const nodeId = ctx.checkParams('nodeId').exist().toInt().gt(0).value;
        const dependentEntityId = ctx.checkQuery('dependentEntityId').exist().isMongoObjectId().value;
        const dependentEntityVersionRange = ctx.checkQuery('dependentEntityVersionRange').optional().toVersionRange().value;
        ctx.validateParams();
        const isFilterVersionRange = lodash_1.isString(dependentEntityVersionRange) && dependentEntityVersionRange !== '*';
        const projection = isFilterVersionRange ? 'testResourceId testResourceName dependencyTree' : 'testResourceId testResourceName';
        let testResourceTreeInfos = await this.testNodeService.findTestResourceTreeInfos({
            nodeId, 'dependencyTree.id': dependentEntityId
        }, projection);
        if (isFilterVersionRange) {
            testResourceTreeInfos = testResourceTreeInfos.filter(item => item.dependencyTree.some(x => x.id === dependentEntityId && semver_1.satisfies(dependentEntityVersionRange, x.version)));
        }
        ctx.success(testResourceTreeInfos.map(x => lodash_1.pick(x, ['testResourceId', 'testResourceName'])));
    }
    async testResourceDependencyTree(ctx) {
        const testResourceId = ctx.checkParams('testResourceId').exist().isMd5().value;
        const entityNid = ctx.checkQuery('entityNid').optional().type('string').len(12, 12).value;
        const maxDeep = ctx.checkQuery('maxDeep').optional().toInt().default(100).lt(101).value;
        const isContainRootNode = ctx.checkQuery('isContainRootNode').optional().default(true).toBoolean().value;
        ctx.validateParams();
        const testResourceTreeInfo = await this.testNodeService.findOneTestResourceTreeInfo({ testResourceId }, 'dependencyTree');
        if (!testResourceTreeInfo) {
            return [];
        }
        const dependencyTree = this.testNodeGenerator.generateTestResourceDependencyTree(testResourceTreeInfo.dependencyTree, entityNid, maxDeep, isContainRootNode);
        ctx.success(dependencyTree);
    }
    async searchTestResourceDependencyTree(ctx) {
        const nodeId = ctx.checkParams('nodeId').exist().toInt().gt(0).value;
        const keywords = ctx.checkQuery('keywords').exist().type('string').value;
        ctx.validateParams();
        const searchRegexp = new RegExp(keywords, 'i');
        const condition = {
            nodeId, 'dependencyTree.name': searchRegexp
        };
        const nodeTestResourceDependencyTrees = await this.testNodeService.findTestResourceTreeInfos(condition, 'dependencyTree');
        const searchResults = [];
        lodash_1.chain(nodeTestResourceDependencyTrees).map(x => x.dependencyTree).flattenDeep().filter(x => searchRegexp.test(x.name)).groupBy(x => x.id).forIn((values) => {
            const model = lodash_1.pick(lodash_1.first(values), ['id', 'name', 'type']);
            model['versions'] = lodash_1.uniq(values.filter(x => x.version).map(x => x.version));
            searchResults.push(model);
        }).value();
        ctx.success(searchResults);
    }
    async filterTestResourceDependencyTree(ctx) {
        const testResourceId = ctx.checkParams('testResourceId').exist().isMd5().value;
        const dependentEntityId = ctx.checkQuery('dependentEntityId').exist().isMongoObjectId().value;
        const dependentEntityVersionRange = ctx.checkQuery('dependentEntityVersionRange').optional().toVersionRange().value;
        ctx.validateParams();
        const testResourceTreeInfo = await this.testNodeService.findOneTestResourceTreeInfo({ testResourceId }, 'dependencyTree');
        if (!testResourceTreeInfo) {
            return [];
        }
        const filteredDependencyTree = this.testNodeGenerator.filterTestResourceDependencyTree(testResourceTreeInfo.dependencyTree ?? [], dependentEntityId, dependentEntityVersionRange);
        ctx.success(filteredDependencyTree);
    }
};
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], TestNodeController.prototype, "testRuleHandler", void 0);
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], TestNodeController.prototype, "nodeCommonChecker", void 0);
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], TestNodeController.prototype, "testNodeGenerator", void 0);
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], TestNodeController.prototype, "nodeService", void 0);
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], TestNodeController.prototype, "testNodeService", void 0);
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], TestNodeController.prototype, "resolveResourcesValidator", void 0);
__decorate([
    midway_1.get('/rules/:nodeId'),
    vistorIdentityDecorator_1.visitorIdentity(index_1.LoginUser | index_1.InternalClient),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TestNodeController.prototype, "showTestRuleInfo", null);
__decorate([
    midway_1.post('/rules/:nodeId'),
    vistorIdentityDecorator_1.visitorIdentity(index_1.LoginUser),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TestNodeController.prototype, "createTestRule", null);
__decorate([
    midway_1.put('/rules/:nodeId'),
    vistorIdentityDecorator_1.visitorIdentity(index_1.LoginUser),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TestNodeController.prototype, "updateTestRule", null);
__decorate([
    midway_1.post('/rules/:nodeId/rematch'),
    vistorIdentityDecorator_1.visitorIdentity(index_1.LoginUser),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TestNodeController.prototype, "rematchTestRule", null);
__decorate([
    midway_1.get('/:nodeId/testResources'),
    vistorIdentityDecorator_1.visitorIdentity(index_1.LoginUser),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TestNodeController.prototype, "testResources", null);
__decorate([
    midway_1.get('/:nodeId/testResources/list'),
    vistorIdentityDecorator_1.visitorIdentity(index_1.LoginUser),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TestNodeController.prototype, "testResourceList", null);
__decorate([
    midway_1.get('/testResources/:testResourceId'),
    vistorIdentityDecorator_1.visitorIdentity(index_1.LoginUser),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TestNodeController.prototype, "showTestResource", null);
__decorate([
    midway_1.put('/testResources/:testResourceId'),
    vistorIdentityDecorator_1.visitorIdentity(index_1.LoginUser),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TestNodeController.prototype, "updateTestResource", null);
__decorate([
    midway_1.get('/:nodeId/testResources/search'),
    vistorIdentityDecorator_1.visitorIdentity(index_1.LoginUser),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TestNodeController.prototype, "searchTestResources", null);
__decorate([
    midway_1.get('/testResources/:testResourceId/dependencyTree'),
    vistorIdentityDecorator_1.visitorIdentity(index_1.LoginUser),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TestNodeController.prototype, "testResourceDependencyTree", null);
__decorate([
    midway_1.get('/:nodeId/testResources/dependencyTree/search'),
    vistorIdentityDecorator_1.visitorIdentity(index_1.LoginUser),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TestNodeController.prototype, "searchTestResourceDependencyTree", null);
__decorate([
    midway_1.get('/testResources/:testResourceId/dependencyTree/filter'),
    vistorIdentityDecorator_1.visitorIdentity(index_1.LoginUser),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TestNodeController.prototype, "filterTestResourceDependencyTree", null);
TestNodeController = __decorate([
    midway_1.provide(),
    midway_1.controller('/v2/testNodes')
], TestNodeController);
exports.TestNodeController = TestNodeController;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdC1ub2RlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2FwcC9jb250cm9sbGVyL3Rlc3Qtbm9kZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7QUFBQSxtQ0FBaUM7QUFFakMsbUNBQW1FO0FBQ25FLGtGQUFxRTtBQUNyRSxrREFBZ0Y7QUFDaEYsbUVBQW1GO0FBQ25GLG1DQUF5RjtBQUl6RixJQUFhLGtCQUFrQixHQUEvQixNQUFhLGtCQUFrQjtJQWlCM0IsS0FBSyxDQUFDLGdCQUFnQixDQUFDLEdBQUc7UUFFdEIsTUFBTSxNQUFNLEdBQUcsR0FBRyxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO1FBQzdELEdBQUcsQ0FBQyxjQUFjLEVBQUUsQ0FBQTtRQUVwQixNQUFNLElBQUksQ0FBQyxlQUFlLENBQUMsd0JBQXdCLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUNsRixDQUFDO0lBSUQsS0FBSyxDQUFDLGNBQWMsQ0FBQyxHQUFHO1FBRXBCLE1BQU0sTUFBTSxHQUFHLEdBQUcsQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztRQUM3RCxNQUFNLFlBQVksR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLGNBQWMsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxrQkFBa0IsRUFBRSxDQUFDLEtBQUssQ0FBQztRQUNyRyxHQUFHLENBQUMsY0FBYyxFQUFFLENBQUM7UUFFckIsTUFBTSxRQUFRLEdBQUcsTUFBTSxJQUFJLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUN6RCxJQUFJ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