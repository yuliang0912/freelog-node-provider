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
exports.ExhibitController = void 0;
const midway_1 = require("midway");
const lodash_1 = require("lodash");
const egg_freelog_base_1 = require("egg-freelog-base");
const presentable_common_checker_1 = require("../../extend/presentable-common-checker");
const presentable_adapter_1 = require("../../extend/exhibit-adapter/presentable-adapter");
const test_resource_adapter_1 = require("../../extend/exhibit-adapter/test-resource-adapter");
let ExhibitController = class ExhibitController {
    ctx;
    presentableCommonChecker;
    presentableService;
    presentableVersionService;
    presentableAdapter;
    testResourceAdapter;
    testNodeService;
    nodeService;
    /**
     * 批量查询展品
     */
    async exhibitList() {
        const { ctx } = this;
        const nodeId = ctx.checkParams('nodeId').exist().toInt().gt(0).value;
        const presentableIds = ctx.checkQuery('exhibitIds').optional().isSplitMongoObjectId().toSplitArray().len(1, 100).value;
        const articleIds = ctx.checkQuery('articleIds').optional().isSplitMongoObjectId().toSplitArray().len(1, 100).value;
        const isLoadPolicyInfo = ctx.checkQuery('isLoadPolicyInfo').optional().toInt().in([0, 1]).value;
        const isTranslate = ctx.checkQuery('isTranslate').optional().toBoolean().default(false).value;
        const isLoadVersionProperty = ctx.checkQuery('isLoadVersionProperty').optional().toInt().default(0).in([0, 1]).value;
        const projection = ctx.checkQuery('projection').optional().toSplitArray().default([]).value;
        ctx.validateParams();
        const condition = { nodeId };
        if (presentableIds) {
            condition._id = { $in: presentableIds };
        }
        if (articleIds) {
            condition['resourceInfo.resourceId'] = { $in: articleIds };
        }
        if (!articleIds && !presentableIds) {
            throw new egg_freelog_base_1.ArgumentError(ctx.gettext('params-required-validate-failed', 'presentableIds,resourceIds,resourceNames'));
        }
        let presentableVersionPropertyMap = new Map();
        let presentableList = await this.presentableService.find(condition, projection.join(' '));
        if (isLoadPolicyInfo) {
            presentableList = await this.presentableService.fillPresentablePolicyInfo(presentableList, isTranslate);
        }
        if (isLoadVersionProperty) {
            const presentableVersionIds = presentableList.map(x => this.presentableCommonChecker.generatePresentableVersionId(x.presentableId, x.version));
            presentableVersionPropertyMap = await this.presentableVersionService.find({ presentableVersionId: { $in: presentableVersionIds } }, 'presentableId versionProperty').then(list => {
                return new Map(list.map(x => [x.presentableId, x]));
            });
        }
        const exhibitList = presentableList.map(item => this.presentableAdapter.presentableWrapToExhibitInfo(item, presentableVersionPropertyMap.get(item.presentableId)));
        ctx.success(exhibitList);
    }
    /**
     * 正式节点的展品
     */
    async exhibits() {
        const { ctx } = this;
        const nodeId = ctx.checkParams('nodeId').exist().toInt().gt(0).value;
        const skip = ctx.checkQuery('skip').optional().toInt().default(0).ge(0).value;
        const limit = ctx.checkQuery('limit').optional().toInt().default(10).gt(0).lt(101).value;
        const sort = ctx.checkQuery('sort').optional().toSortObject().value;
        const articleResourceTypes = ctx.checkQuery('articleResourceTypes').optional().toSplitArray().value;
        const omitArticleResourceType = ctx.checkQuery('omitArticleResourceType').optional().isResourceType().value;
        const tags = ctx.checkQuery('tags').optional().toSplitArray().len(1, 20).value;
        const onlineStatus = ctx.checkQuery('onlineStatus').optional().toInt().default(1).value;
        const keywords = ctx.checkQuery('keywords').optional().type('string').len(1, 100).value;
        const isLoadPolicyInfo = ctx.checkQuery('isLoadPolicyInfo').optional().toInt().default(0).in([0, 1]).value;
        const isTranslate = ctx.checkQuery('isTranslate').optional().toBoolean().default(false).value;
        const isLoadVersionProperty = ctx.checkQuery('isLoadVersionProperty').optional().toInt().default(0).in([0, 1]).value;
        const projection = ctx.checkQuery('projection').optional().toSplitArray().default([]).value;
        ctx.validateParams();
        const condition = { nodeId };
        if (articleResourceTypes?.length) { //resourceType 与 omitResourceType互斥
            condition['resourceInfo.resourceType'] = { $in: articleResourceTypes };
        }
        else if (lodash_1.isString(omitArticleResourceType)) {
            condition['resourceInfo.resourceType'] = { $ne: omitArticleResourceType };
        }
        if (tags) {
            condition.tags = { $in: tags };
        }
        if (onlineStatus === 0 || onlineStatus === 1) {
            condition.onlineStatus = onlineStatus;
        }
        if (lodash_1.isString(keywords)) {
            const searchExp = { $regex: keywords, $options: 'i' };
            condition.$or = [{ presentableName: searchExp }, { presentableTitle: searchExp }, { 'resourceInfo.resourceName': searchExp }];
        }
        let presentableVersionPropertyMap = new Map();
        const pageResult = await this.presentableService.findIntervalList(condition, skip, limit, projection, sort);
        if (isLoadPolicyInfo) {
            pageResult.dataList = await this.presentableService.fillPresentablePolicyInfo(pageResult.dataList, isTranslate);
        }
        if (isLoadVersionProperty) {
            const presentableVersionIds = pageResult.dataList.map(x => this.presentableCommonChecker.generatePresentableVersionId(x.presentableId, x.version));
            presentableVersionPropertyMap = await this.presentableVersionService.find({ presentableVersionId: { $in: presentableVersionIds } }, 'presentableId versionProperty').then(list => {
                return new Map(list.map(x => [x.presentableId, x]));
            });
        }
        const exhibitPageResult = {
            skip: pageResult.skip,
            limit: pageResult.limit,
            totalItem: pageResult.totalItem,
            dataList: []
        };
        for (const item of pageResult.dataList) {
            exhibitPageResult.dataList.push(this.presentableAdapter.presentableWrapToExhibitInfo(item, presentableVersionPropertyMap.get(item.presentableId)));
        }
        return ctx.success(exhibitPageResult);
    }
    /**
     * 测试节点的展品
     */
    async testExhibitList() {
        const { ctx } = this;
        const nodeId = ctx.checkParams('nodeId').exist().toInt().gt(0).value;
        const testResourceIds = ctx.checkQuery('exhibitIds').optional().isSplitMd5().toSplitArray().len(1, 100).value;
        const articleIds = ctx.checkQuery('articleIds').optional().isSplitMongoObjectId().toSplitArray().len(1, 100).value;
        const isLoadVersionProperty = ctx.checkQuery('isLoadVersionProperty').optional().toInt().default(0).in([0, 1]).value;
        const projection = ctx.checkQuery('projection').optional().toSplitArray().default([]).value;
        ctx.validateParams();
        if ([testResourceIds, articleIds].every(lodash_1.isUndefined)) {
            throw new egg_freelog_base_1.ArgumentError('params-required-validate-failed', 'exhibitIds,articleIds');
        }
        const condition = { nodeId, userId: this.ctx.userId };
        if (lodash_1.isArray(articleIds)) {
            condition['originInfo.id'] = { $in: articleIds };
        }
        if (lodash_1.isArray(testResourceIds)) {
            condition._id = { $in: testResourceIds };
        }
        const testResources = await this.testNodeService.findTestResources(condition, projection.join(' '));
        const exhibitList = testResources.map(item => this.testResourceAdapter.testResourceWrapToExhibitInfo(item, isLoadVersionProperty ? {} : null));
        ctx.success(exhibitList);
    }
    /**
     * 测试节点的展品
     */
    async testExhibits() {
        const { ctx } = this;
        const nodeId = ctx.checkParams('nodeId').exist().toInt().gt(0).value;
        const skip = ctx.checkQuery('skip').optional().toInt().default(0).ge(0).value;
        const limit = ctx.checkQuery('limit').optional().toInt().default(10).gt(0).lt(101).value;
        const sort = ctx.checkQuery('sort').optional().toSortObject().value;
        const articleResourceTypes = ctx.checkQuery('articleResourceTypes').optional().toSplitArray().value;
        const omitArticleResourceType = ctx.checkQuery('omitArticleResourceType').optional().isResourceType().value;
        const tags = ctx.checkQuery('tags').optional().toSplitArray().len(1, 20).value;
        const onlineStatus = ctx.checkQuery('onlineStatus').optional().toInt().default(1).value;
        const isLoadVersionProperty = ctx.checkQuery('isLoadVersionProperty').optional().toInt().default(0).in([0, 1]).value;
        const keywords = ctx.checkQuery('keywords').optional().type('string').len(1, 100).value;
        const projection = ctx.checkQuery('projection').optional().toSplitArray().default([]).value;
        ctx.validateParams();
        const condition = { nodeId, userId: ctx.userId };
        if (lodash_1.isString(articleResourceTypes)) {
            condition.resourceType = { $in: articleResourceTypes };
        }
        else if (lodash_1.isString(omitArticleResourceType)) {
            condition.resourceType = { $ne: omitArticleResourceType };
        }
        if (lodash_1.isArray(tags)) {
            condition['stateInfo.tagsInfo.tags'] = { $in: tags };
        }
        if (onlineStatus === 1 || onlineStatus === 0) {
            condition['stateInfo.onlineStatusInfo.onlineStatus'] = onlineStatus;
        }
        if (lodash_1.isString(keywords)) {
            const searchExp = { $regex: keywords, $options: 'i' };
            condition.$or = [{ testResourceName: searchExp }, { 'originInfo.name': searchExp }];
        }
        const pageResult = await this.testNodeService.findIntervalResourceList(condition, skip, limit, projection, sort);
        const exhibitPageResult = {
            skip: pageResult.skip,
            limit: pageResult.limit,
            totalItem: pageResult.totalItem,
            dataList: []
        };
        for (const item of pageResult.dataList) {
            exhibitPageResult.dataList.push(this.testResourceAdapter.testResourceWrapToExhibitInfo(item, isLoadVersionProperty ? {} : null));
        }
        return ctx.success(exhibitPageResult);
    }
    /**
     * 查询单个测试展品
     */
    async testExhibitDetail() {
        const { ctx } = this;
        const nodeId = ctx.checkParams('nodeId').exist().toInt().gt(0).value;
        const testResourceId = ctx.checkParams('exhibitId').exist().isMd5().value;
        const isLoadVersionProperty = ctx.checkQuery('isLoadVersionProperty').optional().toInt().default(0).in([0, 1]).value;
        ctx.validateParams();
        const testResource = await this.testNodeService.findOneTestResource({ nodeId, testResourceId });
        if (!testResource) {
            return null;
        }
        const exhibitInfo = this.testResourceAdapter.testResourceWrapToExhibitInfo(testResource, isLoadVersionProperty ? {} : null);
        ctx.success(exhibitInfo);
    }
    /**
     * 查询单个展品
     */
    async exhibitDetail() {
        const { ctx } = this;
        const nodeId = ctx.checkParams('nodeId').exist().toInt().gt(0).value;
        const presentableId = ctx.checkParams('exhibitId').isPresentableId().value;
        const isLoadPolicyInfo = ctx.checkQuery('isLoadPolicyInfo').optional().toInt().default(0).in([0, 1]).value;
        const isTranslate = ctx.checkQuery('isTranslate').optional().toBoolean().default(false).value;
        const isLoadVersionProperty = ctx.checkQuery('isLoadVersionProperty').optional().toInt().default(0).in([0, 1]).value;
        ctx.validateParams();
        let presentableInfo = await this.presentableService.findOne({ nodeId, _id: presentableId });
        if (!presentableInfo) {
            return ctx.success(null);
        }
        let presentableVersionInfo = null;
        if (isLoadVersionProperty) {
            presentableVersionInfo = await this.presentableVersionService.findById(presentableInfo.presentableId, presentableInfo.version, 'presentableId versionProperty');
        }
        if (isLoadPolicyInfo) {
            presentableInfo = await this.presentableService.fillPresentablePolicyInfo([presentableInfo], isTranslate).then(lodash_1.first);
        }
        const exhibitInfo = this.presentableAdapter.presentableWrapToExhibitInfo(presentableInfo, presentableVersionInfo);
        ctx.success(exhibitInfo);
    }
};
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], ExhibitController.prototype, "ctx", void 0);
__decorate([
    midway_1.inject(),
    __metadata("design:type", presentable_common_checker_1.PresentableCommonChecker)
], ExhibitController.prototype, "presentableCommonChecker", void 0);
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], ExhibitController.prototype, "presentableService", void 0);
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], ExhibitController.prototype, "presentableVersionService", void 0);
__decorate([
    midway_1.inject(),
    __metadata("design:type", presentable_adapter_1.PresentableAdapter)
], ExhibitController.prototype, "presentableAdapter", void 0);
__decorate([
    midway_1.inject(),
    __metadata("design:type", test_resource_adapter_1.TestResourceAdapter)
], ExhibitController.prototype, "testResourceAdapter", void 0);
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], ExhibitController.prototype, "testNodeService", void 0);
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], ExhibitController.prototype, "nodeService", void 0);
__decorate([
    midway_1.get('/list'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ExhibitController.prototype, "exhibitList", null);
__decorate([
    midway_1.get('/'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ExhibitController.prototype, "exhibits", null);
__decorate([
    midway_1.get('/test/list'),
    egg_freelog_base_1.visitorIdentityValidator(egg_freelog_base_1.IdentityTypeEnum.LoginUser),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ExhibitController.prototype, "testExhibitList", null);
__decorate([
    midway_1.get('/test'),
    egg_freelog_base_1.visitorIdentityValidator(egg_freelog_base_1.IdentityTypeEnum.LoginUser),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ExhibitController.prototype, "testExhibits", null);
__decorate([
    midway_1.get('/test/:exhibitId'),
    egg_freelog_base_1.visitorIdentityValidator(egg_freelog_base_1.IdentityTypeEnum.LoginUser),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ExhibitController.prototype, "testExhibitDetail", null);
__decorate([
    midway_1.get('/:exhibitId'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ExhibitController.prototype, "exhibitDetail", null);
ExhibitController = __decorate([
    midway_1.provide(),
    midway_1.controller('/v2/exhibits/:nodeId')
], ExhibitController);
exports.ExhibitController = ExhibitController;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhoaWJpdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9hcHAvY29udHJvbGxlci9leGhpYml0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztBQUFBLG1DQUF3RDtBQUN4RCxtQ0FBNkQ7QUFLN0QsdURBQXVIO0FBQ3ZILHdGQUFpRjtBQUNqRiwwRkFBb0Y7QUFFcEYsOEZBQXVGO0FBSXZGLElBQWEsaUJBQWlCLEdBQTlCLE1BQWEsaUJBQWlCO0lBRzFCLEdBQUcsQ0FBaUI7SUFFcEIsd0JBQXdCLENBQTJCO0lBRW5ELGtCQUFrQixDQUFzQjtJQUV4Qyx5QkFBeUIsQ0FBNkI7SUFFdEQsa0JBQWtCLENBQXFCO0lBRXZDLG1CQUFtQixDQUFzQjtJQUV6QyxlQUFlLENBQW1CO0lBRWxDLFdBQVcsQ0FBZTtJQUUxQjs7T0FFRztJQUVILEtBQUssQ0FBQyxXQUFXO1FBQ2IsTUFBTSxFQUFDLEdBQUcsRUFBQyxHQUFHLElBQUksQ0FBQztRQUNuQixNQUFNLE1BQU0sR0FBRyxHQUFHLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLEtBQUssRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7UUFDckUsTUFBTSxjQUFjLEdBQUcsR0FBRyxDQUFDLFVBQVUsQ0FBQyxZQUFZLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxvQkFBb0IsRUFBRSxDQUFDLFlBQVksRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDO1FBQ3ZILE1BQU0sVUFBVSxHQUFHLEdBQUcsQ0FBQyxVQUFVLENBQUMsWUFBWSxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUMsb0JBQW9CLEVBQUUsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQztRQUNuSCxNQUFNLGdCQUFn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