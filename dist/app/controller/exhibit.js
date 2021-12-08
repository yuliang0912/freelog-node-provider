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
const test_node_interface_1 = require("../../test-node-interface");
const test_resource_adapter_1 = require("../../extend/exhibit-adapter/test-resource-adapter");
const enum_1 = require("../../enum");
let ExhibitController = class ExhibitController {
    ctx;
    presentableCommonChecker;
    presentableService;
    presentableVersionService;
    presentableAdapter;
    testResourceAdapter;
    testNodeService;
    nodeService;
    outsideApiService;
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
        else if ((0, lodash_1.isString)(omitArticleResourceType)) {
            condition['resourceInfo.resourceType'] = { $ne: omitArticleResourceType };
        }
        if (tags) {
            condition.tags = { $in: tags };
        }
        if (onlineStatus === 0 || onlineStatus === 1) {
            condition.onlineStatus = onlineStatus;
        }
        if ((0, lodash_1.isString)(keywords)) {
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
     * 获取作品信息
     */
    async articles() {
        const { ctx } = this;
        // const nodeId = ctx.checkParams('nodeId').exist().toInt().gt(0).value;
        // const articleIds = ctx.checkQuery('articleIds').exist().isSplitMongoObjectId().toSplitArray().len(1, 100).value;
        ctx.validateParams();
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
        if ((0, lodash_1.isArray)(articleIds)) {
            condition['originInfo.id'] = { $in: articleIds };
        }
        if ((0, lodash_1.isArray)(testResourceIds)) {
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
        if ((0, lodash_1.isString)(articleResourceTypes)) {
            condition.resourceType = { $in: articleResourceTypes };
        }
        else if ((0, lodash_1.isString)(omitArticleResourceType)) {
            condition.resourceType = { $ne: omitArticleResourceType };
        }
        if ((0, lodash_1.isArray)(tags)) {
            condition['stateInfo.tagsInfo.tags'] = { $in: tags };
        }
        if (onlineStatus === 1 || onlineStatus === 0) {
            condition['stateInfo.onlineStatusInfo.onlineStatus'] = onlineStatus;
        }
        if ((0, lodash_1.isString)(keywords)) {
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
        const isLoadContract = ctx.checkQuery('isLoadContract').optional().toInt().default(0).in([0, 1]).value;
        ctx.validateParams();
        let presentableInfo = await this.presentableService.findOne({ nodeId, _id: presentableId });
        if (!presentableInfo) {
            return ctx.success(null);
        }
        let presentableVersionInfo = null;
        if (isLoadVersionProperty) {
            presentableVersionInfo = await this.presentableVersionService.findById(presentableInfo.presentableId, presentableInfo.version, 'presentableId versionProperty dependencyTree');
        }
        if (isLoadPolicyInfo) {
            presentableInfo = await this.presentableService.fillPresentablePolicyInfo([presentableInfo], isTranslate).then(lodash_1.first);
        }
        if (isLoadContract && ctx.isLoginUser()) {
            const contracts = await this.outsideApiService.getUserPresentableContracts(presentableInfo.presentableId, presentableInfo.nodeId, ctx.userId);
            presentableInfo = Reflect.has(presentableInfo, 'toObject') ? presentableInfo.toObject() : presentableInfo;
            presentableInfo.contracts = contracts;
        }
        const exhibitInfo = this.presentableAdapter.presentableWrapToExhibitInfo(presentableInfo, presentableVersionInfo);
        ctx.success(exhibitInfo);
    }
    /**
     * 查询展品作品的信息
     */
    async exhibitArticleList() {
        const { ctx } = this;
        const nodeId = ctx.checkParams('nodeId').exist().toInt().gt(0).value;
        const presentableId = ctx.checkParams('exhibitId').isPresentableId().value;
        const articleNids = ctx.checkQuery('articleNids').toSplitArray().len(1, 100).value;
        ctx.validateParams();
        const presentableInfo = await this.presentableService.findOne({ nodeId, _id: presentableId });
        if (!presentableInfo) {
            throw new egg_freelog_base_1.ArgumentError('参数校验失败,未找到展品信息');
        }
        const presentableVersion = await this.presentableVersionService.findOne({
            presentableId, version: presentableInfo.version
        }, 'dependencyTree');
        const articles = presentableVersion.dependencyTree.filter(x => articleNids.includes(x.nid));
        if ((0, lodash_1.isEmpty)(articles)) {
            return ctx.success(articles);
        }
        const resourceVersionPropertyInfos = await this.outsideApiService.getResourceVersionList(articles.map(x => x.versionId), {
            projection: 'versionId,systemProperty,customPropertyDescriptors'
        });
        ctx.success(articles.map(article => {
            const resourceVersionInfo = resourceVersionPropertyInfos.find(m => m.versionId === article.versionId);
            return {
                nid: article.nid,
                articleId: article.resourceId,
                articleName: article.resourceName,
                articleType: enum_1.ArticleTypeEnum.IndividualResource,
                version: article.version,
                resourceType: article.resourceType,
                articleProperty: resourceVersionInfo ? Object.assign(resourceVersionInfo['customProperty'], resourceVersionInfo.systemProperty) : {}
            };
        }));
    }
    /**
     * 测试展品依赖的作品信息(含有存储对象)
     */
    async testExhibitArticleList() {
        const { ctx } = this;
        const nodeId = ctx.checkParams('nodeId').exist().toInt().gt(0).value;
        const testResourceId = ctx.checkParams('exhibitId').isPresentableId().value;
        const articleNids = ctx.checkQuery('articleNids').toSplitArray().len(1, 100).value;
        ctx.validateParams();
        const testResourceTreeInfo = await this.testNodeService.findOneTestResourceTreeInfo({
            testResourceId, nodeId
        }, 'dependencyTree');
        if (!testResourceTreeInfo) {
            throw new egg_freelog_base_1.ArgumentError('未找到展品信息');
        }
        const articles = testResourceTreeInfo.dependencyTree.filter(x => articleNids.includes(x.nid));
        if ((0, lodash_1.isEmpty)(articles)) {
            return ctx.success(articles);
        }
        const resourceVersions = articles.filter(x => x.type === test_node_interface_1.TestResourceOriginType.Resource);
        const resourceVersionPropertyInfos = await this.outsideApiService.getResourceVersionList(resourceVersions.map(x => x.versionId), {
            projection: 'versionId,systemProperty,customPropertyDescriptors'
        });
        const objectInfos = await this.outsideApiService.getObjectListByObjectIds(articles.filter(x => x.type === test_node_interface_1.TestResourceOriginType.Object).map(x => x.id), {
            projection: 'objectId,systemProperty,customPropertyDescriptors'
        });
        const result = [];
        for (const article of articles) {
            const property = article.type === test_node_interface_1.TestResourceOriginType.Resource ?
                resourceVersionPropertyInfos.find(x => x.versionId === article.versionId) :
                objectInfos.find(x => x.objectId === article.id);
            result.push({
                nid: article.nid,
                articleId: article.id,
                articleName: article.name,
                articleType: article.type === test_node_interface_1.TestResourceOriginType.Resource ? enum_1.ArticleTypeEnum.IndividualResource : enum_1.ArticleTypeEnum.StorageObject,
                version: article.version,
                resourceType: article.resourceType,
                articleProperty: property ? Object.assign(property['customProperty'], property.systemProperty) : {}
            });
        }
        ctx.success(result);
    }
};
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", Object)
], ExhibitController.prototype, "ctx", void 0);
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", presentable_common_checker_1.PresentableCommonChecker)
], ExhibitController.prototype, "presentableCommonChecker", void 0);
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", Object)
], ExhibitController.prototype, "presentableService", void 0);
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", Object)
], ExhibitController.prototype, "presentableVersionService", void 0);
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", presentable_adapter_1.PresentableAdapter)
], ExhibitController.prototype, "presentableAdapter", void 0);
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", test_resource_adapter_1.TestResourceAdapter)
], ExhibitController.prototype, "testResourceAdapter", void 0);
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", Object)
], ExhibitController.prototype, "testNodeService", void 0);
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", Object)
], ExhibitController.prototype, "nodeService", void 0);
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", Object)
], ExhibitController.prototype, "outsideApiService", void 0);
__decorate([
    (0, midway_1.get)('/list'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ExhibitController.prototype, "exhibitList", null);
__decorate([
    (0, midway_1.get)('/'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ExhibitController.prototype, "exhibits", null);
__decorate([
    (0, midway_1.get)('/articles/list'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ExhibitController.prototype, "articles", null);
__decorate([
    (0, midway_1.get)('/test/list'),
    (0, egg_freelog_base_1.visitorIdentityValidator)(egg_freelog_base_1.IdentityTypeEnum.LoginUser),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ExhibitController.prototype, "testExhibitList", null);
__decorate([
    (0, midway_1.get)('/test'),
    (0, egg_freelog_base_1.visitorIdentityValidator)(egg_freelog_base_1.IdentityTypeEnum.LoginUser),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ExhibitController.prototype, "testExhibits", null);
__decorate([
    (0, midway_1.get)('/test/:exhibitId'),
    (0, egg_freelog_base_1.visitorIdentityValidator)(egg_freelog_base_1.IdentityTypeEnum.LoginUser),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ExhibitController.prototype, "testExhibitDetail", null);
__decorate([
    (0, midway_1.get)('/:exhibitId'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ExhibitController.prototype, "exhibitDetail", null);
__decorate([
    (0, midway_1.get)('/:exhibitId/articles/list'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ExhibitController.prototype, "exhibitArticleList", null);
__decorate([
    (0, midway_1.get)('/test/:exhibitId/articles/list'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ExhibitController.prototype, "testExhibitArticleList", null);
ExhibitController = __decorate([
    (0, midway_1.provide)(),
    (0, midway_1.controller)('/v2/exhibits/:nodeId')
], ExhibitController);
exports.ExhibitController = ExhibitController;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhoaWJpdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9hcHAvY29udHJvbGxlci9leGhpYml0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztBQUFBLG1DQUF3RDtBQUN4RCxtQ0FBc0U7QUFLdEUsdURBQXVIO0FBQ3ZILHdGQUFpRjtBQUNqRiwwRkFBb0Y7QUFDcEYsbUVBQW1GO0FBQ25GLDhGQUF1RjtBQUN2RixxQ0FBMkM7QUFJM0MsSUFBYSxpQkFBaUIsR0FBOUIsTUFBYSxpQkFBaUI7SUFHMUIsR0FBRyxDQUFpQjtJQUVwQix3QkFBd0IsQ0FBMkI7SUFFbkQsa0JBQWtCLENBQXNCO0lBRXhDLHlCQUF5QixDQUE2QjtJQUV0RCxrQkFBa0IsQ0FBcUI7SUFFdkMsbUJBQW1CLENBQXNCO0lBRXpDLGVBQWUsQ0FBbUI7SUFFbEMsV0FBVyxDQUFlO0lBRTFCLGlCQUFpQixDQUFxQjtJQUV0Qzs7T0FFRztJQUVILEtBQUssQ0FBQyxXQUFXO1FBQ2IsTUFBTSxFQUFDLEdBQUcsRUFBQyxHQUFHLElBQUksQ0FBQztRQUNuQixNQUFNLE1BQU0sR0FBRyxHQUFHLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLEtBQUssRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7UUFDckUsTUFBTSxjQUFjLEdBQUcsR0FBRyxDQUFDLFVBQVUsQ0FBQyxZQUFZLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxvQkFBb0IsRUFBRSxDQUFDLFlBQVksRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDO1FBQ3ZILE1BQU0sVUFBVSxHQUFHLEdBQUcsQ0FBQyxVQUFVLENBQUMsWUFBWSxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUMsb0JBQW9CLEVBQUUsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQztRQUNuSCxNQUFNLGdCQUFnQixHQUFHLEdBQUcsQ0FBQyxVQUFVLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7UUFDaEcsTUFBTSxXQUFXLEdBQUcsR0FBRyxDQUFDLFVBQVUsQ0FBQyxhQUFhLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsS0FBSyxDQUFDO1FBQzlGLE1BQU0scUJBQXFCLEdBQUcsR0FBRyxDQUFDLFVBQVUsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFDLEtBQUssRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7UUFDckgsTUFBTSxVQUFVLEdBQUcsR0FBRyxDQUFDLFVBQVUsQ0FBQyxZQUFZLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDO1FBQzVGLEdBQUcsQ0FBQyxjQUFjLEVBQUUsQ0FBQztRQUVyQixNQUFNLFNBQVMsR0FBUSxFQUFDLE1BQU0sRUFBQyxDQUFDO1FBQ2hDLElBQUksY0FBYyxFQUFFO1lBQ2hCLFNBQVMsQ0FBQyxHQUFHLEdBQUcsRUFBQyxHQUFHLEVBQUUsY0FBYyxFQUFDLENBQUM7U0FDekM7UUFDRCxJQUFJLFVBQVUsRUFBRTtZQUNaLFNBQVMsQ0FBQyx5QkFBeUIsQ0FBQyxHQUFHLEVBQUMsR0FBRyxFQUFFLFVBQVUsRUFBQyxDQUFDO1NBQzVEO1FBQ0QsSUFBSSxDQUFDLFVBQVUsSUFBSSxDQUFDLGNBQWMsRUFBRTtZQUNoQyxNQUFNLElBQUksZ0NBQWEsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLGlDQUFpQyxFQUFFLDBDQUEwQyxDQUFDLENBQUMsQ0FBQztTQUN2SDtRQUVELElBQUksNkJBQTZCLEdBQUcsSUFBSSxHQUFHLEVBQWtDLENBQUM7UUFDOUUsSUFBSSxlQUFlLEdBQUcsTUFBTSxJQUFJLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxVQUFVLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDMUYsSUFBSSxnQkFBZ0IsRUFBRTtZQUNsQixlQUFlLEdBQUcsTUFBTSxJQUFJLENBQUMsa0JBQWtCLENBQUMseUJBQXlCLENBQUMsZUFBZSxFQUFFLFdBQVcsQ0FBQyxDQUFDO1NBQzNHO1FBQ0QsSUFBSSxxQkFBcUIsRUFBRTtZQUN2QixNQUFNLHFCQUFxQixHQUFHLGVBQWUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsd0JBQXdCLENBQUMsNEJBQTRCLENBQUMsQ0FBQyxDQUFDLGFBQWEsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztZQUMvSSw2QkFBNkIsR0FBRyxNQUFNLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxJQUFJLENBQUMsRUFBQyxvQkFBb0IsRUFBRSxFQUFDLEdBQUcsRUFBRSxxQkFBcUIsRUFBQyxFQUFDLEVBQUUsK0JBQStCLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUU7Z0JBQ3pLLE9BQU8sSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLGFBQWEsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDeEQsQ0FBQyxDQUFDLENBQUM7U0FDTjtRQUNELE1BQU0sV0FBVyxHQUFHLGVBQWUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsNEJBQTRCLENBQUMsSUFBSSxFQUFFLDZCQUE2QixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ25LLEdBQUcsQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUM7SUFDN0IsQ0FBQztJQUVEOztPQUVHO0lBRUgsS0FBSyxDQUFDLFFBQVE7UUFFVixNQUFNLEVBQUMsR0FBRyxFQUFDLEdBQUcsSUFBSSxDQUFDO1FBQ25CLE1BQU0sTUFBTSxHQUFHLEdBQUcsQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsS0FBSyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztRQUNyRSxNQUFNLElBQUksR0FBRyxHQUFHLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFDLEtBQUssRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO1FBQzlFLE1BQU0sS0FBSyxHQUFHLEdBQUcsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUMsS0FBSyxFQUFFLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDO1FBQ3pGLE1BQU0sSUFBSSxHQUFHLEdBQUcsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUMsWUFBWSxFQUFFLENBQUMsS0FBSyxDQUFDO1FBQ3BFLE1BQU0sb0JBQW9CLEdBQUcsR0FBRyxDQUFDLFVBQVUsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFDLFlBQVksRUFBRSxDQUFDLEtBQUssQ0FBQztRQUNwRyxNQUFNLHVCQUF1QixHQUFHLEdBQUcsQ0FBQyxVQUFVLENBQUMseUJBQXlCLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxjQUFjLEVBQUUsQ0FBQyxLQUFLLENBQUM7UUFDNUcsTUFBTSxJQUFJLEdBQUcsR0FBRyxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQztRQUMvRSxNQUFNLFlBQVksR0FBRyxHQUFHLENBQUMsVUFBVSxDQUFDLGNBQWMsQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFDLEtBQUssRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7UUFDeEYsTUFBTSxRQUFRLEdBQUcsR0FBRyxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUM7UUFDeEYsTUFBTSxnQkFBZ0IsR0FBRyxHQUFHLENBQUMsVUFBVSxDQUFDLGtCQUFrQixDQUFDLENBQUMsUUFBUSxFQUFFLENBQUMsS0FBSyxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztRQUMzRyxNQUFNLFdBQVcsR0FBRyxHQUFHLENBQUMsVUFBVSxDQUFDLGFBQWEsQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFDLFNBQVMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxLQUFLLENBQUM7UUFDOUYsTUFBTSxxQkFBcUIsR0FBRyxHQUFHLENBQUMsVUFBVSxDQUFDLHVCQUF1QixDQUFDLENBQUMsUUFBUSxFQUFFLENBQUMsS0FBSyxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztRQUNySCxNQUFNLFVBQVUsR0FBRyxHQUFHLENBQUMsVUFBVSxDQUFDLFlBQVksQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFDLFlBQVksRUFBRSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUM7UUFDNUYsR0FBRyxDQUFDLGNBQWMsRUFBRSxDQUFDO1FBRXJCLE1BQU0sU0FBUyxHQUFRLEVBQUMsTUFBTSxFQUFDLENBQUM7UUFDaEMsSUFBSSxvQkFBb0IsRUFBRSxNQUFNLEVBQUUsRUFBRSxtQ0FBbUM7WUFDbkUsU0FBUyxDQUFDLDJCQUEyQixDQUFDLEdBQUcsRUFBQyxHQUFHLEVBQUUsb0JBQW9CLEVBQUMsQ0FBQztTQUN4RTthQUFNLElBQUksSUFBQSxpQkFBUSxFQUFDLHVCQUF1QixDQUFDLEVBQUU7WUFDMUMsU0FBUyxDQUFDLDJCQUEyQixDQUFDLEdBQUcsRUFBQyxHQUFHLEVBQUUsdUJBQXVCLEVBQUMsQ0FBQztTQUMzRTtRQUNELElBQUksSUFBSSxFQUFFO1lBQ04sU0FBUyxDQUFDLElBQUksR0FBRyxFQUFDLEdBQUcsRUFBRSxJQUFJLEVBQUMsQ0FBQztTQUNoQztRQUNELElBQUksWUFBWSxLQUFLLENBQUMsSUFBSSxZQUFZLEtBQUssQ0FBQyxFQUFFO1lBQzFDLFNBQVMsQ0FBQyxZQUFZLEdBQUcsWUFBWSxDQUFDO1NBQ3pDO1FBQ0QsSUFBSSxJQUFBLGlCQUFRLEVBQUMsUUFBUSxDQUFDLEVBQUU7WUFDcEIsTUFBTSxTQUFTLEdBQUcsRUFBQyxNQUFNLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxHQUFHLEVBQUMsQ0FBQztZQUNwRCxTQUFTLENBQUMsR0FBRyxHQUFHLENBQUMsRUFBQyxlQUFlLEVBQUUsU0FBUyxFQUFDLEVBQUUsRUFBQyxnQkFBZ0IsRUFBRSxTQUFTLEVBQUMsRUFBRSxFQUFDLDJCQUEyQixFQUFFLFNBQVMsRUFBQyxDQUFDLENBQUM7U0FDM0g7UUFFRCxJQUFJLDZCQUE2QixHQUFHLElBQUksR0FBRyxFQUFrQyxDQUFDO1FBQzlFLE1BQU0sVUFBVSxHQUFHLE1BQU0sSUFBSSxDQUFDLGtCQUFrQixDQUFDLGdCQUFnQixDQUFDLFNBQVMsRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLFVBQVUsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUM1RyxJQUFJLGdCQUFnQixFQUFFO1lBQ2xCLFVBQVUsQ0FBQyxRQUFRLEdBQUcsTUFBTSxJQUFJLENBQUMsa0JBQWtCLENBQUMseUJBQXlCLENBQUMsVUFBVSxDQUFDLFFBQVEsRUFBRSxXQUFXLENBQUMsQ0FBQztTQUNuSDtRQUNELElBQUkscUJBQXFCLEVBQUU7WUFDdkIsTUFBTSxxQkFBcUIsR0FBRyxVQUFVLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyw0QkFBNEIsQ0FBQyxDQUFDLENBQUMsYUFBYSxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1lBQ25KLDZCQUE2QixHQUFHLE1BQU0sSUFBSSxDQUFDLHlCQUF5QixDQUFDLElBQUksQ0FBQyxFQUFDLG9CQUFvQixFQUFFLEVBQUMsR0FBRyxFQUFFLHFCQUFxQixFQUFDLEVBQUMsRUFBRSwrQkFBK0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRTtnQkFDekssT0FBTyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsYUFBYSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUN4RCxDQUFDLENBQUMsQ0FBQztTQUNOO1FBRUQsTUFBTSxpQkFBaUIsR0FBNEI7WUFDL0MsSUFBSSxFQUFFLFVBQVUsQ0FBQyxJQUFJO1lBQ3JCLEtBQUssRUFBRSxVQUFVLENBQUMsS0FBSztZQUN2QixTQUFTLEVBQUUsVUFBVSxDQUFDLFNBQVM7WUFDL0IsUUFBUSxFQUFFLEVBQUU7U0FDZixDQUFDO1FBQ0YsS0FBSyxNQUFNLElBQUksSUFBSSxVQUFVLENBQUMsUUFBUSxFQUFFO1lBQ3BDLGlCQUFpQixDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLDRCQUE0QixDQUFDLElBQUksRUFBRSw2QkFBNkIsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUN0SjtRQUNELE9BQU8sR0FBRyxDQUFDLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0lBQzFDLENBQUM7SUFFRDs7T0FFRztJQUVILEtBQUssQ0FBQyxRQUFRO1FBQ1YsTUFBTSxFQUFDLEdBQUcsRUFBQyxHQUFHLElBQUksQ0FBQztRQUNuQix3RUFBd0U7UUFDeEUsbUhBQW1IO1FBQ25ILEdBQUcsQ0FBQyxjQUFjLEVBQUUsQ0FBQztJQUN6QixDQUFDO0lBRUQ7O09BRUc7SUFHSCxLQUFLLENBQUMsZUFBZTtRQUNqQixNQUFNLEVBQUMsR0FBRyxFQUFDLEdBQUcsSUFBSSxDQUFDO1FBQ25CLE1BQU0sTUFBTSxHQUFHLEdBQUcsQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsS0FBSyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztRQUNyRSxNQUFNLGVBQWUsR0FBRyxHQUFHLENBQUMsVUFBVSxDQUFDLFlBQVksQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFDLFVBQVUsRUFBRSxDQUFDLFlBQVksRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDO1FBQzlHLE1BQU0sVUFBVSxHQUFHLEdBQUcsQ0FBQyxVQUFVLENBQUMsWUFBWSxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUMsb0JBQW9CLEVBQUUsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQztRQUNuSCxNQUFNLHFCQUFxQixHQUFHLEdBQUcsQ0FBQyxVQUFVLENBQUMsdUJBQXVCLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO1FBQ3JILE1BQU0sVUFBVSxHQUFHLEdBQUcsQ0FBQyxVQUFVLENBQUMsWUFBWSxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUMsWUFBWSxFQUFFLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQztRQUM1RixHQUFHLENBQUMsY0FBYyxFQUFFLENBQUM7UUFFckIsSUFBSSxDQUFDLGVBQWUsRUFBRSxVQUFVLENBQUMsQ0FBQyxLQUFLLENBQUMsb0JBQVcsQ0FBQyxFQUFFO1lBQ2xELE1BQU0sSUFBSSxnQ0FBYSxDQUFDLGlDQUFpQyxFQUFFLHVCQUF1QixDQUFDLENBQUM7U0FDdkY7UUFFRCxNQUFNLFNBQVMsR0FBUSxFQUFDLE1BQU0sRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUMsQ0FBQztRQUN6RCxJQUFJLElBQUEsZ0JBQU8sRUFBQyxVQUFVLENBQUMsRUFBRTtZQUNyQixTQUFTLENBQUMsZUFBZSxDQUFDLEdBQUcsRUFBQyxHQUFHLEVBQUUsVUFBVSxFQUFDLENBQUM7U0FDbEQ7UUFDRCxJQUFJLElBQUEsZ0JBQU8sRUFBQyxlQUFlLENBQUMsRUFBRTtZQUMxQixTQUFTLENBQUMsR0FBRyxHQUFHLEVBQUMsR0FBRyxFQUFFLGVBQWUsRUFBQyxDQUFDO1NBQzFDO1FBRUQsTUFBTSxhQUFhLEdBQUcsTUFBTSxJQUFJLENBQUMsZUFBZSxDQUFDLGlCQUFpQixDQUFDLFNBQVMsRUFBRSxVQUFVLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDcEcsTUFBTSxXQUFXLEdBQUcsYUFBYSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyw2QkFBNkIsQ0FBQyxJQUFJLEVBQUUscUJBQXFCLENBQUMsQ0FBQyxDQUFFLEVBQVUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUN4SixHQUFHLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxDQUFDO0lBQzdCLENBQUM7SUFFRDs7T0FFRztJQUdILEtBQUssQ0FBQyxZQUFZO1FBQ2QsTUFBTSxFQUFDLEdBQUcsRUFBQyxHQUFHLElBQUksQ0FBQztRQUNuQixNQUFNLE1BQU0sR0FBRyxHQUFHLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLEtBQUssRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7UUFDckUsTUFBTSxJQUFJLEdBQUcsR0FBRyxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztRQUM5RSxNQUFNLEtBQUssR0FBRyxHQUFHLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFDLEtBQUssRUFBRSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQztRQUN6RixNQUFNLElBQUksR0FBRyxHQUFHLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFDLFlBQVksRUFBRSxDQUFDLEtBQUssQ0FBQztRQUNwRSxNQUFNLG9CQUFvQixHQUFHLEdBQUcsQ0FBQyxVQUFVLENBQUMsc0JBQXNCLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxLQUFLLENBQUM7UUFDcEcsTUFBTSx1QkFBdUIsR0FBRyxHQUFHLENBQUMsVUFBVSxDQUFDLHlCQUF5QixDQUFDLENBQUMsUUFBUSxFQUFFLENBQUMsY0FBYyxFQUFFLENBQUMsS0FBSyxDQUFDO1FBQzVHLE1BQU0sSUFBSSxHQUFHLEdBQUcsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUMsWUFBWSxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUM7UUFDL0UsTUFBTSxZQUFZLEdBQUcsR0FBRyxDQUFDLFVBQVUsQ0FBQyxjQUFjLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO1FBQ3hGLE1BQU0scUJBQXFCLEdBQUcsR0FBRyxDQUFDLFVBQVUsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFDLEtBQUssRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7UUFDckgsTUFBTSxRQUFRLEdBQUcsR0FBRyxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUM7UUFDeEYsTUFBTSxVQUFVLEdBQUcsR0FBRyxDQUFDLFVBQVUsQ0FBQyxZQUFZLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDO1FBQzVGLEdBQUcsQ0FBQyxjQUFjLEVBQUUsQ0FBQztRQUVyQixNQUFNLFNBQVMsR0FBUSxFQUFDLE1BQU0sRUFBRSxNQUFNLEVBQUUsR0FBRyxDQUFDLE1BQU0sRUFBQyxDQUFDO1FBQ3BELElBQUksSUFBQSxpQkFBUSxFQUFDLG9CQUFvQixDQUFDLEVBQUU7WUFDaEMsU0FBUyxDQUFDLFlBQVksR0FBRyxFQUFDLEdBQUcsRUFBRSxvQkFBb0IsRUFBQyxDQUFDO1NBQ3hEO2FBQU0sSUFBSSxJQUFBLGlCQUFRLEVBQUMsdUJBQXVCLENBQUMsRUFBRTtZQUMxQyxTQUFTLENBQUMsWUFBWSxHQUFHLEVBQUMsR0FBRyxFQUFFLHVCQUF1QixFQUFDLENBQUM7U0FDM0Q7UUFDRCxJQUFJLElBQUEsZ0JBQU8sRUFBQyxJQUFJLENBQUMsRUFBRTtZQUNmLFNBQVMsQ0FBQyx5QkFBeUIsQ0FBQyxHQUFHLEVBQUMsR0FBRyxFQUFFLElBQUksRUFBQyxDQUFDO1NBQ3REO1FBQ0QsSUFBSSxZQUFZLEtBQUssQ0FBQyxJQUFJLFlBQVksS0FBSyxDQUFDLEVBQUU7WUFDMUMsU0FBUyxDQUFDLHlDQUF5QyxDQUFDLEdBQUcsWUFBWSxDQUFDO1NBQ3ZFO1FBQ0QsSUFBSSxJQUFBLGlCQUFRLEVBQUMsUUFBUSxDQUFDLEVBQUU7WUFDcEIsTUFBTSxTQUFTLEdBQUcsRUFBQyxNQUFNLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxHQUFHLEVBQUMsQ0FBQztZQUNwRCxTQUFTLENBQUMsR0FBRyxHQUFHLENBQUMsRUFBQyxnQkFBZ0IsRUFBRSxTQUFTLEVBQUMsRUFBRSxFQUFDLGlCQUFpQixFQUFFLFNBQVMsRUFBQyxDQUFDLENBQUM7U0FDbkY7UUFFRCxNQUFNLFVBQVUsR0FBRyxNQUFNLElBQUksQ0FBQyxlQUFlLENBQUMsd0JBQXdCLENBQUMsU0FBUyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsVUFBVSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ2pILE1BQU0saUJBQWlCLEdBQTRCO1lBQy9DLElBQUksRUFBRSxVQUFVLENBQUMsSUFBSTtZQUNyQixLQUFLLEVBQUUsVUFBVSxDQUFDLEtBQUs7WUFDdkIsU0FBUyxFQUFFLFVBQVUsQ0FBQyxTQUFTO1lBQy9CLFFBQVEsRUFBRSxFQUFFO1NBQ2YsQ0FBQztRQUNGLEtBQUssTUFBTSxJQUFJLElBQUksVUFBVSxDQUFDLFFBQVEsRUFBRTtZQUNwQyxpQkFBaUIsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyw2QkFBNkIsQ0FBQyxJQUFJLEVBQUUscUJBQXFCLENBQUMsQ0FBQyxDQUFFLEVBQVUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztTQUM3STtRQUNELE9BQU8sR0FBRyxDQUFDLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0lBQzFDLENBQUM7SUFFRDs7T0FFRztJQUdILEtBQUssQ0FBQyxpQkFBaUI7UUFDbkIsTUFBTSxFQUFDLEdBQUcsRUFBQyxHQUFHLElBQUksQ0FBQztRQUNuQixNQUFNLE1BQU0sR0FBRyxHQUFHLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLEtBQUssRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7UUFDckUsTUFBTSxjQUFjLEdBQUcsR0FBRyxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxLQUFLLENBQUM7UUFDMUUsTUFBTSxxQkFBcUIsR0FBRyxHQUFHLENBQUMsVUFBVSxDQUFDLHVCQUF1QixDQUFDLENBQUMsUUFBUSxFQUFFLENBQUMsS0FBSyxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztRQUNySCxHQUFHLENBQUMsY0FBYyxFQUFFLENBQUM7UUFFckIsTUFBTSxZQUFZLEdBQUcsTUFBTSxJQUFJLENBQUMsZUFBZSxDQUFDLG1CQUFtQixDQUFDLEVBQUMsTUFBTSxFQUFFLGNBQWMsRUFBQyxDQUFDLENBQUM7UUFDOUYsSUFBSSxDQUFDLFlBQVksRUFBRTtZQUNmLE9BQU8sSUFBSSxDQUFDO1NBQ2Y7UUFFRCxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsbUJBQW1CLENBQUMsNkJBQTZCLENBQUMsWUFBWSxFQUFFLHFCQUFxQixDQUFDLENBQUMsQ0FBRSxFQUFVLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3JJLEdBQUcsQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUM7SUFDN0IsQ0FBQztJQUVEOztPQUVHO0lBRUgsS0FBSyxDQUFDLGFBQWE7UUFDZixNQUFNLEVBQUMsR0FBRyxFQUFDLEdBQUcsSUFBSSxDQUFDO1FBQ25CLE1BQU0sTUFBTSxHQUFHLEdBQUcsQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsS0FBSyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztRQUNyRSxNQUFNLGFBQWEsR0FBRyxHQUFHLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxDQUFDLGVBQWUsRUFBRSxDQUFDLEtBQUssQ0FBQztRQUMzRSxNQUFNLGdCQUFnQixHQUFHLEdBQUcsQ0FBQyxVQUFVLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO1FBQzNHLE1BQU0sV0FBVyxHQUFHLEdBQUcsQ0FBQyxVQUFVLENBQUMsYUFBYSxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUMsU0FBUyxFQUFFLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLEtBQUssQ0FBQztRQUM5RixNQUFNLHFCQUFxQixHQUFHLEdBQUcsQ0FBQyxVQUFVLENBQUMsdUJBQXVCLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO1FBQ3JILE1BQU0sY0FBYyxHQUFHLEdBQUcsQ0FBQyxVQUFVLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO1FBQ3ZHLEdBQUcsQ0FBQyxjQUFjLEVBQUUsQ0FBQztRQUVyQixJQUFJLGVBQWUsR0FBRyxNQUFNLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPLENBQUMsRUFBQyxNQUFNLEVBQUUsR0FBRyxFQUFFLGFBQWEsRUFBQyxDQUFDLENBQUM7UUFDMUYsSUFBSSxDQUFDLGVBQWUsRUFBRTtZQUNsQixPQUFPLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7U0FDNUI7UUFFRCxJQUFJLHNCQUFzQixHQUFHLElBQUksQ0FBQztRQUNsQyxJQUFJLHFCQUFxQixFQUFFO1lBQ3ZCLHNCQUFzQixHQUFHLE1BQU0sSUFBSSxDQUFDLHlCQUF5QixDQUFDLFFBQVEsQ0FBQyxlQUFlLENBQUMsYUFBYSxFQUFFLGVBQWUsQ0FBQyxPQUFPLEVBQUUsOENBQThDLENBQUMsQ0FBQztTQUNsTDtRQUNELElBQUksZ0JBQWdCLEVBQUU7WUFDbEIsZUFBZSxHQUFHLE1BQU0sSUFBSSxDQUFDLGtCQUFrQixDQUFDLHlCQUF5QixDQUFDLENBQUMsZUFBZSxDQUFDLEVBQUUsV0FBVyxDQUFDLENBQUMsSUFBSSxDQUFDLGNBQUssQ0FBQyxDQUFDO1NBQ3pIO1FBQ0QsSUFBSSxjQUFjLElBQUksR0FBRyxDQUFDLFdBQVcsRUFBRSxFQUFFO1lBQ3JDLE1BQU0sU0FBUyxHQUFHLE1BQU0sSUFBSSxDQUFDLGlCQUFpQixDQUFDLDJCQUEyQixDQUFDLGVBQWUsQ0FBQyxhQUFhLEVBQUUsZUFBZSxDQUFDLE1BQU0sRUFBRSxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDOUksZUFBZSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsZUFBZSxFQUFFLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBTyxlQUFnQixDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsQ0FBQyxlQUFlLENBQUM7WUFDakgsZUFBZSxDQUFDLFNBQVMsR0FBRyxTQUFTLENBQUM7U0FDekM7UUFDRCxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsa0JBQWtCLENBQUMsNEJBQTRCLENBQUMsZUFBZSxFQUFFLHNCQUFzQixDQUFDLENBQUM7UUFDbEgsR0FBRyxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUM3QixDQUFDO0lBRUQ7O09BRUc7SUFFSCxLQUFLLENBQUMsa0JBQWtCO1FBQ3BCLE1BQU0sRUFBQyxHQUFHLEVBQUMsR0FBRyxJQUFJLENBQUM7UUFDbkIsTUFBTSxNQUFNLEdBQUcsR0FBRyxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO1FBQ3JFLE1BQU0sYUFBYSxHQUFHLEdBQUcsQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLENBQUMsZUFBZSxFQUFFLENBQUMsS0FBSyxDQUFDO1FBQzNFLE1BQU0sV0FBVyxHQUFHLEdBQUcsQ0FBQyxVQUFVLENBQUMsYUFBYSxDQUFDLENBQUMsWUFBWSxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUM7UUFDbkYsR0FBRyxDQUFDLGNBQWMsRUFBRSxDQUFDO1FBRXJCLE1BQU0sZUFBZSxHQUFHLE1BQU0sSUFBSSxDQUFDLGtCQUFrQixDQUFDLE9BQU8sQ0FBQyxFQUFDLE1BQU0sRUFBRSxHQUFHLEVBQUUsYUFBYSxFQUFDLENBQUMsQ0FBQztRQUM1RixJQUFJLENBQUMsZUFBZSxFQUFFO1lBQ2xCLE1BQU0sSUFBSSxnQ0FBYSxDQUFDLGdCQUFnQixDQUFDLENBQUM7U0FDN0M7UUFFRCxNQUFNLGtCQUFrQixHQUFHLE1BQU0sSUFBSSxDQUFDLHlCQUF5QixDQUFDLE9BQU8sQ0FBQztZQUNwRSxhQUFhLEVBQUUsT0FBTyxFQUFFLGVBQWUsQ0FBQyxPQUFPO1NBQ2xELEVBQUUsZ0JBQWdCLENBQUMsQ0FBQztRQUVyQixNQUFNLFFBQVEsR0FBRyxrQkFBa0IsQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztRQUM1RixJQUFJLElBQUEsZ0JBQU8sRUFBQyxRQUFRLENBQUMsRUFBRTtZQUNuQixPQUFPLEdBQUcsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUM7U0FDaEM7UUFDRCxNQUFNLDRCQUE0QixHQUFHLE1BQU0sSUFBSSxDQUFDLGlCQUFpQixDQUFDLHNCQUFzQixDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLEVBQUU7WUFDckgsVUFBVSxFQUFFLG9EQUFvRDtTQUNuRSxDQUFDLENBQUM7UUFFSCxHQUFHLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLEVBQUU7WUFDL0IsTUFBTSxtQkFBbUIsR0FBRyw0QkFBNEIsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsU0FBUyxLQUFLLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUN0RyxPQUFPO2dCQUNILEdBQUcsRUFBRSxPQUFPLENBQUMsR0FBRztnQkFDaEIsU0FBUyxFQUFFLE9BQU8sQ0FBQyxVQUFVO2dCQUM3QixXQUFXLEVBQUUsT0FBTyxDQUFDLFlBQVk7Z0JBQ2pDLFdBQVcsRUFBRSxzQkFBZSxDQUFDLGtCQUFrQjtnQkFDL0MsT0FBTyxFQUFFLE9BQU8sQ0FBQyxPQUFPO2dCQUN4QixZQUFZLEVBQUUsT0FBTyxDQUFDLFlBQVk7Z0JBQ2xDLGVBQWUsRUFBRSxtQkFBbUIsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxtQkFBbUIsQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFLG1CQUFtQixDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFO2FBQ3ZJLENBQUM7UUFDTixDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ1IsQ0FBQztJQUVEOztPQUVHO0lBRUgsS0FBSyxDQUFDLHNCQUFzQjtRQUN4QixNQUFNLEVBQUMsR0FBRyxFQUFDLEdBQUcsSUFBSSxDQUFDO1FBQ25CLE1BQU0sTUFBTSxHQUFHLEdBQUcsQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsS0FBSyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztRQUNyRSxNQUFNLGNBQWMsR0FBRyxHQUFHLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxDQUFDLGVBQWUsRUFBRSxDQUFDLEtBQUssQ0FBQztRQUM1RSxNQUFNLFdBQVcsR0FBRyxHQUFHLENBQUMsVUFBVSxDQUFDLGFBQWEsQ0FBQyxDQUFDLFlBQVksRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDO1FBQ25GLEdBQUcsQ0FBQyxjQUFjLEVBQUUsQ0FBQztRQUVyQixNQUFNLG9CQUFvQixHQUFHLE1BQU0sSUFBSSxDQUFDLGVBQWUsQ0FBQywyQkFBMkIsQ0FBQztZQUNoRixjQUFjLEVBQUUsTUFBTTtTQUN6QixFQUFFLGdCQUFnQixDQUFDLENBQUM7UUFDckIsSUFBSSxDQUFDLG9CQUFvQixFQUFFO1lBQ3ZCLE1BQU0sSUFBSSxnQ0FBYSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1NBQ3RDO1FBRUQsTUFBTSxRQUFRLEdBQUcsb0JBQW9CLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDOUYsSUFBSSxJQUFBLGdCQUFPLEVBQUMsUUFBUSxDQUFDLEVBQUU7WUFDbkIsT0FBTyxHQUFHLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1NBQ2hDO1FBQ0QsTUFBTSxnQkFBZ0IsR0FBRyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksS0FBSyw0Q0FBc0IsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUMxRixNQUFNLDRCQUE0QixHQUFHLE1BQU0sSUFBSSxDQUFDLGlCQUFpQixDQUFDLHNCQUFzQixDQUFDLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsRUFBRTtZQUM3SCxVQUFVLEVBQUUsb0RBQW9EO1NBQ25FLENBQUMsQ0FBQztRQUNILE1BQU0sV0FBVyxHQUFHLE1BQU0sSUFBSSxDQUFDLGlCQUFpQixDQUFDLHdCQUF3QixDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxLQUFLLDRDQUFzQixDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRTtZQUNySixVQUFVLEVBQUUsbURBQW1EO1NBQ2xFLENBQUMsQ0FBQztRQUVILE1BQU0sTUFBTSxHQUFHLEVBQUUsQ0FBQztRQUNsQixLQUFLLE1BQU0sT0FBTyxJQUFJLFFBQVEsRUFBRTtZQUM1QixNQUFNLFFBQVEsR0FBRyxPQUFPLENBQUMsSUFBSSxLQUFLLDRDQUFzQixDQUFDLFFBQVEsQ0FBQyxDQUFDO2dCQUMvRCw0QkFBNEIsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsU0FBUyxLQUFLLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO2dCQUMzRSxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFFBQVEsS0FBSyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDckQsTUFBTSxDQUFDLElBQUksQ0FBQztnQkFDUixHQUFHLEVBQUUsT0FBTyxDQUFDLEdBQUc7Z0JBQ2hCLFNBQVMsRUFBRSxPQUFPLENBQUMsRUFBRTtnQkFDckIsV0FBVyxFQUFFLE9BQU8sQ0FBQyxJQUFJO2dCQUN6QixXQUFXLEVBQUUsT0FBTyxDQUFDLElBQUksS0FBSyw0Q0FBc0IsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLHNCQUFlLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLHNCQUFlLENBQUMsYUFBYTtnQkFDbEksT0FBTyxFQUFFLE9BQU8sQ0FBQyxPQUFPO2dCQUN4QixZQUFZLEVBQUUsT0FBTyxDQUFDLFlBQVk7Z0JBQ2xDLGVBQWUsRUFBRSxRQUFRLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLGdCQUFnQixDQUFDLEVBQUUsUUFBUSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFO2FBQ3RHLENBQUMsQ0FBQztTQUNOO1FBQ0QsR0FBRyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUN4QixDQUFDO0NBQ0osQ0FBQTtBQXZXRztJQURDLElBQUEsZUFBTSxHQUFFOzs4Q0FDVztBQUVwQjtJQURDLElBQUEsZUFBTSxHQUFFOzhCQUNpQixxREFBd0I7bUVBQUM7QUFFbkQ7SUFEQyxJQUFBLGVBQU0sR0FBRTs7NkRBQytCO0FBRXhDO0lBREMsSUFBQSxlQUFNLEdBQUU7O29FQUM2QztBQUV0RDtJQURDLElBQUEsZUFBTSxHQUFFOzhCQUNXLHdDQUFrQjs2REFBQztBQUV2QztJQURDLElBQUEsZUFBTSxHQUFFOzhCQUNZLDJDQUFtQjs4REFBQztBQUV6QztJQURDLElBQUEsZUFBTSxHQUFFOzswREFDeUI7QUFFbEM7SUFEQyxJQUFBLGVBQU0sR0FBRTs7c0RBQ2lCO0FBRTFCO0lBREMsSUFBQSxlQUFNLEdBQUU7OzREQUM2QjtBQU10QztJQURDLElBQUEsWUFBRyxFQUFDLE9BQU8sQ0FBQzs7OztvREFvQ1o7QUFNRDtJQURDLElBQUEsWUFBRyxFQUFDLEdBQUcsQ0FBQzs7OztpREEwRFI7QUFNRDtJQURDLElBQUEsWUFBRyxFQUFDLGdCQUFnQixDQUFDOzs7O2lEQU1yQjtBQU9EO0lBRkMsSUFBQSxZQUFHLEVBQUMsWUFBWSxDQUFDO0lBQ2pCLElBQUEsMkNBQXdCLEVBQUMsbUNBQWdCLENBQUMsU0FBUyxDQUFDOzs7O3dEQXlCcEQ7QUFPRDtJQUZDLElBQUEsWUFBRyxFQUFDLE9BQU8sQ0FBQztJQUNaLElBQUEsMkNBQXdCLEVBQUMsbUNBQWdCLENBQUMsU0FBUyxDQUFDOzs7O3FEQTRDcEQ7QUFPRDtJQUZDLElBQUEsWUFBRyxFQUFDLGtCQUFrQixDQUFDO0lBQ3ZCLElBQUEsMkNBQXdCLEVBQUMsbUNBQWdCLENBQUMsU0FBUyxDQUFDOzs7OzBEQWVwRDtBQU1EO0lBREMsSUFBQSxZQUFHLEVBQUMsYUFBYSxDQUFDOzs7O3NEQThCbEI7QUFNRDtJQURDLElBQUEsWUFBRyxFQUFDLDJCQUEyQixDQUFDOzs7OzJEQXFDaEM7QUFNRDtJQURDLElBQUEsWUFBRyxFQUFDLGdDQUFnQyxDQUFDOzs7OytEQTJDckM7QUF6V1EsaUJBQWlCO0lBRjdCLElBQUEsZ0JBQU8sR0FBRTtJQUNULElBQUEsbUJBQVUsRUFBQyxzQkFBc0IsQ0FBQztHQUN0QixpQkFBaUIsQ0EwVzdCO0FBMVdZLDhDQUFpQiJ9