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
        await this.testNodeService.matchAndSaveNodeTestRule(nodeId, testRuleText ?? '').then(ctx.success);
    }
    async updateTestRule(ctx) {
        const nodeId = ctx.checkParams('nodeId').exist().toInt().gt(0).value;
        const additionalTestRule = ctx.checkBody('additionalTestRule').exist().type('string').decodeURIComponent().value;
        ctx.validateParams();
        const nodeInfo = await this.nodeService.findById(nodeId);
        this.nodeCommonChecker.nullObjectAndUserAuthorizationCheck(nodeInfo);
        const nodeTestRule = await this.testNodeService.findNodeTestRuleInfoById(nodeId, 'ruleText');
        const currentRuleText = (nodeTestRule?.ruleText ?? '') + '   ' + additionalTestRule;
        await this.testNodeService.matchAndSaveNodeTestRule(nodeId, currentRuleText).then(ctx.success);
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
    async testResourceAuthTree(ctx) {
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
    async searchTestResourceDependencyTree(ctx) {
        const nodeId = ctx.checkParams('nodeId').exist().toInt().gt(0).value;
        const keywords = ctx.checkQuery('keywords').exist().type('string').value;
        ctx.validateParams();
        const searchRegexp = new RegExp(keywords, 'i');
        const condition = {
            nodeId, 'dependencyTree.name': searchRegexp
        };
        const nodeTestResourceDependencyTree = await this.testNodeService.findTestResourceTreeInfos(condition, 'dependencyTree');
        const searchResults = [];
        lodash_1.chain(nodeTestResourceDependencyTree).map(x => x.dependencyTree).flattenDeep().filter(x => searchRegexp.test(x.name)).groupBy(x => x.id).forIn((values) => {
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
            return ctx.success([]);
        }
        const filteredDependencyTree = this.testNodeGenerator.filterTestResourceDependencyTree(testResourceTreeInfo.dependencyTree ?? [], dependentEntityId, dependentEntityVersionRange);
        ctx.success(filteredDependencyTree);
    }
};
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
    midway_1.get('/:nodeId/rules'),
    vistorIdentityDecorator_1.visitorIdentity(index_1.LoginUser | index_1.InternalClient),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TestNodeController.prototype, "showTestRuleInfo", null);
__decorate([
    midway_1.post('/:nodeId/rules'),
    vistorIdentityDecorator_1.visitorIdentity(index_1.LoginUser),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TestNodeController.prototype, "createTestRule", null);
__decorate([
    midway_1.put('/:nodeId/rules'),
    vistorIdentityDecorator_1.visitorIdentity(index_1.LoginUser),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TestNodeController.prototype, "updateTestRule", null);
__decorate([
    midway_1.post('/:nodeId/rules/rematch'),
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
    midway_1.get('/:nodeId/testResources/searchByDependency'),
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
    midway_1.get('/testResources/:testResourceId/authTree'),
    vistorIdentityDecorator_1.visitorIdentity(index_1.LoginUser),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TestNodeController.prototype, "testResourceAuthTree", null);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdC1ub2RlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2FwcC9jb250cm9sbGVyL3Rlc3Qtbm9kZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7QUFBQSxtQ0FBaUM7QUFFakMsbUNBQW1FO0FBQ25FLGtGQUFxRTtBQUNyRSxrREFBZ0Y7QUFDaEYsbUVBQW1GO0FBQ25GLG1DQUF5RjtBQUl6RixJQUFhLGtCQUFrQixHQUEvQixNQUFhLGtCQUFrQjtJQWUzQixLQUFLLENBQUMsZ0JBQWdCLENBQUMsR0FBRztRQUV0QixNQUFNLE1BQU0sR0FBRyxHQUFHLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7UUFDN0QsR0FBRyxDQUFDLGNBQWMsRUFBRSxDQUFDO1FBRXJCLE1BQU0sSUFBSSxDQUFDLGVBQWUsQ0FBQyx3QkFBd0IsQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQ2xGLENBQUM7SUFJRCxLQUFLLENBQUMsY0FBYyxDQUFDLEdBQUc7UUFFcEIsTUFBTSxNQUFNLEdBQUcsR0FBRyxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO1FBQzdELE1BQU0sWUFBWSxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsY0FBYyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLGtCQUFrQixFQUFFLENBQUMsS0FBSyxDQUFDO1FBQ3JHLEdBQUcsQ0FBQyxjQUFjLEVBQUUsQ0FBQztRQUVyQixNQUFNLFFBQVEsR0FBRyxNQUFNLElBQUksQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ3pELElBQUks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