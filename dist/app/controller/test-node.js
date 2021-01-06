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
    async showTestRuleInfo() {
        const { ctx } = this;
        const nodeId = ctx.checkParams('nodeId').toInt().gt(0).value;
        ctx.validateParams();
        await this.testNodeService.findNodeTestRuleInfoById(nodeId).then(ctx.success);
    }
    async createTestRule() {
        const { ctx } = this;
        const nodeId = ctx.checkParams('nodeId').toInt().gt(0).value;
        const testRuleText = ctx.checkBody('testRuleText').exist().type('string').decodeURIComponent().value;
        ctx.validateParams();
        const nodeInfo = await this.nodeService.findById(nodeId);
        this.nodeCommonChecker.nullObjectAndUserAuthorizationCheck(nodeInfo);
        await this.testNodeService.matchAndSaveNodeTestRule(nodeId, testRuleText ?? '').then(ctx.success);
    }
    async updateTestRule() {
        const { ctx } = this;
        const nodeId = ctx.checkParams('nodeId').exist().toInt().gt(0).value;
        const additionalTestRule = ctx.checkBody('additionalTestRule').exist().type('string').decodeURIComponent().value;
        ctx.validateParams();
        const nodeInfo = await this.nodeService.findById(nodeId);
        this.nodeCommonChecker.nullObjectAndUserAuthorizationCheck(nodeInfo);
        const nodeTestRule = await this.testNodeService.findNodeTestRuleInfoById(nodeId, 'ruleText');
        const currentRuleText = (nodeTestRule?.ruleText ?? '') + '   ' + additionalTestRule;
        await this.testNodeService.matchAndSaveNodeTestRule(nodeId, currentRuleText).then(ctx.success);
    }
    async rematchTestRule() {
        const { ctx } = this;
        const nodeId = ctx.checkParams('nodeId').toInt().gt(0).value;
        ctx.validateParams();
        const nodeInfo = await this.nodeService.findById(nodeId);
        this.nodeCommonChecker.nullObjectAndUserAuthorizationCheck(nodeInfo);
        const nodeTestRule = await this.testNodeService.findNodeTestRuleInfoById(nodeId, 'ruleText');
        await this.testNodeService.matchAndSaveNodeTestRule(nodeId, nodeTestRule?.ruleText ?? '').then(ctx.success);
    }
    async testResources() {
        const { ctx } = this;
        const nodeId = ctx.checkParams('nodeId').exist().toInt().gt(0).value;
        const skip = ctx.checkQuery('skip').optional().toInt().default(0).ge(0).value;
        const limit = ctx.checkQuery('limit').optional().toInt().default(10).gt(0).lt(101).value;
        const sort = ctx.checkQuery('sort').optional().value;
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
        await this.testNodeService.findIntervalResourceList(condition, skip, limit, projection, sort).then(ctx.success);
    }
    /**
     * 根据源资源获取测试资源.例如通过发行名称或者发行ID获取测试资源.API不再提供单一查询
     */
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
        if (lodash_1.isArray(entityIds)) {
            condition['originInfo.id'] = { $in: entityIds };
        }
        if (lodash_1.isArray(entityNames)) {
            condition['originInfo.name'] = { $in: entityNames };
        }
        await this.testNodeService.findTestResources(condition, projection.join(' ')).then(ctx.success);
    }
    async showTestResource() {
        const { ctx } = this;
        const testResourceId = ctx.checkParams('testResourceId').exist().isMd5().value;
        ctx.validateParams();
        await this.testNodeService.findOneTestResource({ testResourceId }).then(ctx.success);
    }
    async updateTestResource() {
        const { ctx } = this;
        const testResourceId = ctx.checkParams('testResourceId').exist().isMd5().value;
        const resolveResources = ctx.checkBody('resolveResources').exist().isArray().len(1, 999).value;
        ctx.validateParams();
        const resolveResourcesValidateResult = this.resolveResourcesValidator.validate(resolveResources ?? []);
        if (!lodash_1.isEmpty(resolveResourcesValidateResult.errors)) {
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
    async searchTestResources() {
        const { ctx } = this;
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
    async searchTestResourceDependencyTree() {
        const { ctx } = this;
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
    midway_1.inject(),
    __metadata("design:type", Object)
], TestNodeController.prototype, "ctx", void 0);
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
    egg_freelog_base_1.visitorIdentityValidator(egg_freelog_base_1.IdentityTypeEnum.LoginUser | egg_freelog_base_1.IdentityTypeEnum.InternalClient),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], TestNodeController.prototype, "showTestRuleInfo", null);
__decorate([
    midway_1.post('/:nodeId/rules'),
    egg_freelog_base_1.visitorIdentityValidator(egg_freelog_base_1.IdentityTypeEnum.LoginUser),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], TestNodeController.prototype, "createTestRule", null);
__decorate([
    midway_1.put('/:nodeId/rules'),
    egg_freelog_base_1.visitorIdentityValidator(egg_freelog_base_1.IdentityTypeEnum.LoginUser),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], TestNodeController.prototype, "updateTestRule", null);
__decorate([
    midway_1.post('/:nodeId/rules/rematch'),
    egg_freelog_base_1.visitorIdentityValidator(egg_freelog_base_1.IdentityTypeEnum.LoginUser),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], TestNodeController.prototype, "rematchTestRule", null);
__decorate([
    midway_1.get('/:nodeId/testResources'),
    egg_freelog_base_1.visitorIdentityValidator(egg_freelog_base_1.IdentityTypeEnum.LoginUser),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], TestNodeController.prototype, "testResources", null);
__decorate([
    midway_1.get('/:nodeId/testResources/list'),
    egg_freelog_base_1.visitorIdentityValidator(egg_freelog_base_1.IdentityTypeEnum.LoginUser),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], TestNodeController.prototype, "testResourceList", null);
__decorate([
    midway_1.get('/testResources/:testResourceId'),
    egg_freelog_base_1.visitorIdentityValidator(egg_freelog_base_1.IdentityTypeEnum.LoginUser),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], TestNodeController.prototype, "showTestResource", null);
__decorate([
    midway_1.put('/testResources/:testResourceId'),
    egg_freelog_base_1.visitorIdentityValidator(egg_freelog_base_1.IdentityTypeEnum.LoginUser),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], TestNodeController.prototype, "updateTestResource", null);
__decorate([
    midway_1.get('/:nodeId/testResources/searchByDependency'),
    egg_freelog_base_1.visitorIdentityValidator(egg_freelog_base_1.IdentityTypeEnum.LoginUser),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], TestNodeController.prototype, "searchTestResources", null);
__decorate([
    midway_1.get('/testResources/:testResourceId/dependencyTree'),
    egg_freelog_base_1.visitorIdentityValidator(egg_freelog_base_1.IdentityTypeEnum.LoginUser),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], TestNodeController.prototype, "testResourceDependencyTree", null);
__decorate([
    midway_1.get('/testResources/:testResourceId/authTree'),
    egg_freelog_base_1.visitorIdentityValidator(egg_freelog_base_1.IdentityTypeEnum.LoginUser),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], TestNodeController.prototype, "testResourceAuthTree", null);
__decorate([
    midway_1.get('/:nodeId/testResources/dependencyTree/search'),
    egg_freelog_base_1.visitorIdentityValidator(egg_freelog_base_1.IdentityTypeEnum.LoginUser),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], TestNodeController.prototype, "searchTestResourceDependencyTree", null);
__decorate([
    midway_1.get('/testResources/:testResourceId/dependencyTree/filter'),
    egg_freelog_base_1.visitorIdentityValidator(egg_freelog_base_1.IdentityTypeEnum.LoginUser),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], TestNodeController.prototype, "filterTestResourceDependencyTree", null);
TestNodeController = __decorate([
    midway_1.provide(),
    midway_1.controller('/v2/testNodes')
], TestNodeController);
exports.TestNodeController = TestNodeController;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdC1ub2RlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2FwcC9jb250cm9sbGVyL3Rlc3Qtbm9kZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7QUFBQSxtQ0FBaUM7QUFFakMsbUNBQW1FO0FBQ25FLG1FQUFtRjtBQUNuRixtQ0FBeUY7QUFDekYsdURBRzBCO0FBSTFCLElBQWEsa0JBQWtCLEdBQS9CLE1BQWEsa0JBQWtCO0lBaUIzQixLQUFLLENBQUMsZ0JBQWdCO1FBRWxCLE1BQU0sRUFBQyxHQUFHLEVBQUMsR0FBRyxJQUFJLENBQUM7UUFDbkIsTUFBTSxNQUFNLEdBQUcsR0FBRyxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO1FBQzdELEdBQUcsQ0FBQyxjQUFjLEVBQUUsQ0FBQztRQUVyQixNQUFNLElBQUksQ0FBQyxlQUFlLENBQUMsd0JBQXdCLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUNsRixDQUFDO0lBSUQsS0FBSyxDQUFDLGNBQWM7UUFFaEIsTUFBTSxFQUFDLEdBQUcsRUFBQyxHQUFHLElBQUksQ0FBQztRQUNuQixNQUFNLE1BQU0sR0FBRyxHQUFHLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7UUFDN0QsTUFBTSxZQUFZLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxjQUFjLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsa0JBQWtCLEVBQUUsQ0FBQyxLQUFLLENBQUM7UUFDckcsR0FBRyxDQUFDLGNBQWMsRUFBRSxDQUFDO1FBRXJCLE1BQU0sUUFBUSxHQUFHLE1BQU0sSUFBSSxD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RSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztRQUM5RSxNQUFNLEtBQUssR0FBRyxHQUFHLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFDLEtBQUssRUFBRSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQztRQUN6RixNQUFNLElBQUksR0FBRyxHQUFHLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFDLEtBQUssQ0FBQztRQUNyRCxNQUFNLFFBQVEsR0FBRyxHQUFHLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQztRQUN4RixNQUFNLElBQUksR0FBRyxHQUFHLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFDLFlBQVksRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDO1FBQy9FLE1BQU0sWUFBWSxHQUFHLEdBQUcsQ0FBQyxVQUFVLENBQUMsY0FBYyxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUMsY0FBYyxFQUFFLENBQUMsS0FBSyxDQUFDO1FBQ3RGLE1BQU0sUUFBUSxHQUFHLEdBQUcsQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUMsS0FBSyxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7UUFDOUYsTUFBTSxVQUFVLEdBQUcsR0FBRyxDQUFDLFVBQVUsQ0FBQyxZQUFZLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxZ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