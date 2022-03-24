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
exports.PresentableController = void 0;
const validator_1 = require("validator");
const semver = require("semver");
const enum_1 = require("../../enum");
const midway_1 = require("midway");
const lodash_1 = require("lodash");
const egg_freelog_base_1 = require("egg-freelog-base");
let PresentableController = class PresentableController {
    ctx;
    nodeCommonChecker;
    presentableCommonChecker;
    nodeService;
    outsideApiService;
    presentableService;
    resolveResourcesValidator;
    presentablePolicyValidator;
    presentableRewritePropertyValidator;
    presentableVersionService;
    async index() {
        const { ctx } = this;
        const skip = ctx.checkQuery('skip').optional().toInt().default(0).ge(0).value;
        const limit = ctx.checkQuery('limit').optional().toInt().default(10).gt(0).lt(101).value;
        const sort = ctx.checkQuery('sort').optional().toSortObject().value;
        const nodeId = ctx.checkQuery('nodeId').exist().toInt().value;
        const resourceTypes = ctx.checkQuery('resourceType').optional().toSplitArray().value;
        const omitResourceType = ctx.checkQuery('omitResourceType').optional().isResourceType().value;
        const tags = ctx.checkQuery('tags').optional().toSplitArray().len(1, 20).value;
        const onlineStatus = ctx.checkQuery('onlineStatus').optional().toInt().default(1).value;
        const keywords = ctx.checkQuery('keywords').optional().type('string').len(1, 100).value;
        const isLoadPolicyInfo = ctx.checkQuery('isLoadPolicyInfo').optional().toInt().default(0).in([0, 1]).value;
        const isTranslate = ctx.checkQuery('isTranslate').optional().toBoolean().default(false).value;
        const isLoadVersionProperty = ctx.checkQuery('isLoadVersionProperty').optional().toInt().default(0).in([0, 1]).value;
        const projection = ctx.checkQuery('projection').optional().toSplitArray().default([]).value;
        ctx.validateParams();
        const condition = { nodeId };
        if (resourceTypes?.length) { // resourceType 与 omitResourceType 互斥
            condition['resourceInfo.resourceType'] = { $in: resourceTypes };
        }
        else if ((0, lodash_1.isString)(omitResourceType)) {
            condition['resourceInfo.resourceType'] = { $ne: omitResourceType };
        }
        if (tags) {
            condition.tags = { $in: tags };
        }
        if (onlineStatus === 0 || onlineStatus === 1) {
            condition.onlineStatus = onlineStatus;
        }
        if ((0, lodash_1.isString)(keywords)) {
            const searchExp = { $regex: keywords, $options: 'i' };
            condition.$or = [{ presentableName: searchExp }, { presentableTitle: searchExp }];
        }
        const pageResult = await this.presentableService.findIntervalList(condition, skip, limit, projection, sort);
        if (isLoadPolicyInfo) {
            pageResult.dataList = await this.presentableService.fillPresentablePolicyInfo(pageResult.dataList, isTranslate);
        }
        if (isLoadVersionProperty) {
            pageResult.dataList = await this.presentableService.fillPresentableVersionProperty(pageResult.dataList, false, false);
        }
        return ctx.success(pageResult);
    }
    async indexForAdmin() {
        const { ctx } = this;
        const skip = ctx.checkQuery('skip').ignoreParamWhenEmpty().toInt().default(0).ge(0).value;
        const limit = ctx.checkQuery('limit').ignoreParamWhenEmpty().toInt().default(10).gt(0).lt(101).value;
        const sort = ctx.checkQuery('sort').ignoreParamWhenEmpty().value;
        const resourceType = ctx.checkQuery('resourceType').optional().isResourceType().value;
        const tags = ctx.checkQuery('tags').ignoreParamWhenEmpty().toSplitArray().value;
        const keywords = ctx.checkQuery('keywords').ignoreParamWhenEmpty().type('string').len(1, 100).value;
        const startCreatedDate = ctx.checkQuery('startCreatedDate').ignoreParamWhenEmpty().toDate().value;
        const endCreatedDate = ctx.checkQuery('endCreatedDate').ignoreParamWhenEmpty().toDate().value;
        ctx.validateParams().validateOfficialAuditAccount();
        const condition = {};
        if ((0, lodash_1.isString)(resourceType)) {
            condition['resourceInfo.resourceType'] = resourceType;
        }
        if (tags) {
            condition.tags = { $in: tags };
        }
        if ((0, lodash_1.isDate)(startCreatedDate) && (0, lodash_1.isDate)(endCreatedDate)) {
            condition.createDate = { $gte: startCreatedDate, $lte: endCreatedDate };
        }
        else if ((0, lodash_1.isDate)(startCreatedDate)) {
            condition.createDate = { $gte: startCreatedDate };
        }
        else if ((0, lodash_1.isDate)(endCreatedDate)) {
            condition.createDate = { $lte: endCreatedDate };
        }
        const pageResult = await this.presentableService.searchIntervalList(condition, keywords, {
            sort: sort ?? { createDate: -1 }, limit, skip
        });
        if (!pageResult.dataList) {
            return ctx.success(pageResult);
        }
        pageResult.dataList = await this.presentableService.fillPresentablePolicyInfo(pageResult.dataList);
        pageResult.dataList.forEach(item => {
            item['nodeName'] = (0, lodash_1.first)(item.nodes)?.nodeName ?? '';
            item.presentableId = item._id;
            delete item.nodes;
            delete item._id;
        });
        ctx.success(pageResult);
    }
    async list() {
        const { ctx } = this;
        const userId = ctx.checkQuery('userId').optional().toInt().gt(0).value;
        const nodeId = ctx.checkQuery('nodeId').optional().toInt().gt(0).value;
        const presentableIds = ctx.checkQuery('presentableIds').optional().isSplitMongoObjectId().toSplitArray().len(1, 100).value;
        const resourceIds = ctx.checkQuery('resourceIds').optional().isSplitMongoObjectId().toSplitArray().len(1, 100).value;
        const resolveResourceIds = ctx.checkQuery('resolveResourceIds').optional().isSplitResourceId().toSplitArray().len(1, 300).value;
        const resourceNames = ctx.checkQuery('resourceNames').optional().toSplitArray().len(1, 100).value;
        const isLoadPolicyInfo = ctx.checkQuery('isLoadPolicyInfo').optional().toInt().in([0, 1]).value;
        const isTranslate = ctx.checkQuery('isTranslate').optional().toBoolean().default(false).value;
        const isLoadVersionProperty = ctx.checkQuery('isLoadVersionProperty').optional().toInt().default(0).in([0, 1]).value;
        const projection = ctx.checkQuery('projection').optional().toSplitArray().default([]).value;
        ctx.validateParams();
        const condition = {};
        if ((0, lodash_1.isNumber)(userId)) {
            condition.userId = userId;
        }
        if ((0, lodash_1.isNumber)(nodeId)) {
            condition.nodeId = nodeId;
        }
        if (presentableIds) {
            condition._id = { $in: presentableIds };
        }
        if (resourceIds) {
            condition['resourceInfo.resourceId'] = { $in: resourceIds };
        }
        if (resourceNames) {
            condition['resourceInfo.resourceNames'] = { $in: resourceNames.map(decodeURIComponent) };
        }
        if (resolveResourceIds && nodeId) {
            condition['resolveResources.resourceId'] = { $in: resolveResourceIds };
        }
        if (!resourceIds && !presentableIds && !resourceNames && !resolveResourceIds) {
            throw new egg_freelog_base_1.ArgumentError(ctx.gettext('params-required-validate-failed', 'presentableIds,resourceIds,resourceNames'));
        }
        let presentableList = await this.presentableService.find(condition, projection.join(' '));
        if (isLoadPolicyInfo) {
            presentableList = await this.presentableService.fillPresentablePolicyInfo(presentableList, isTranslate);
        }
        if (isLoadVersionProperty) {
            presentableList = await this.presentableService.fillPresentableVersionProperty(presentableList, false, false);
        }
        ctx.success(presentableList);
    }
    async createPresentable() {
        const { ctx } = this;
        const nodeId = ctx.checkBody('nodeId').exist().toInt().gt(0).value;
        const resourceId = ctx.checkBody('resourceId').isResourceId().value;
        const resolveResources = ctx.checkBody('resolveResources').exist().isArray().value;
        const policies = ctx.checkBody('policies').optional().default([]).isArray().value;
        const tags = ctx.checkBody('tags').optional().isArray().len(0, 20).value;
        const presentableName = ctx.checkBody('presentableName').exist().type('string').isPresentableName().value;
        const version = ctx.checkBody('version').exist().is(semver.valid, ctx.gettext('params-format-validate-failed', 'version')).value;
        ctx.validateParams();
        this._policySchemaValidate(policies, 'addPolicy');
        this._resolveResourcesSchemaValidate(resolveResources);
        const nodeInfo = await this.nodeService.findById(nodeId);
        this.nodeCommonChecker.nullObjectAndUserAuthorizationCheck(nodeInfo);
        await this.presentableCommonChecker.checkResourceIsCreated(nodeId, resourceId);
        await this.presentableCommonChecker.checkPresentableNameIsUnique(nodeId, presentableName);
        const resourceInfo = await this.outsideApiService.getResourceInfo(resourceId);
        if (!resourceInfo) {
            throw new egg_freelog_base_1.ArgumentError(ctx.gettext('params-validate-failed', 'resourceId'));
        }
        if (resourceInfo.status === 0) {
            throw new egg_freelog_base_1.ArgumentError(ctx.gettext('be-sign-subject-offline'), { resourceId });
        }
        const subjectVersionInfo = resourceInfo.resourceVersions.find(x => x.version === version);
        if (!subjectVersionInfo) {
            throw new egg_freelog_base_1.ArgumentError(ctx.gettext('params-validate-failed', 'version'), { version });
        }
        await this.presentableService.createPresentable({
            presentableName, resourceInfo, version,
            tags, policies, nodeInfo, resolveResources,
            versionId: subjectVersionInfo.versionId,
            presentableTitle: presentableName,
            coverImages: resourceInfo.coverImages,
        }).then(ctx.success);
    }
    async updatePresentable() {
        const { ctx } = this;
        const presentableId = ctx.checkParams('presentableId').exist().isPresentableId().value;
        const presentableTitle = ctx.checkBody('presentableTitle').optional().type('string').value;
        const tags = ctx.checkBody('tags').optional().isArray().value;
        const resolveResources = ctx.checkBody('resolveResources').optional().isArray().value;
        const updatePolicies = ctx.checkBody('updatePolicies').optional().isArray().len(1).value;
        const addPolicies = ctx.checkBody('addPolicies').optional().isArray().len(1).value;
        const coverImages = ctx.checkBody('coverImages').optional().isArray().len(0, 10).value;
        ctx.validateParams();
        if ([updatePolicies, addPolicies, presentableTitle, tags, resolveResources, coverImages].every(lodash_1.isUndefined)) {
            throw new egg_freelog_base_1.ArgumentError(ctx.gettext('params-required-validate-failed'));
        }
        if (!(0, lodash_1.isEmpty)(coverImages) && coverImages.some(x => !(0, validator_1.isURL)(x.toString(), { protocols: ['https'] }))) {
            throw new egg_freelog_base_1.ArgumentError(ctx.gettext('params-format-validate-failed', 'coverImages'));
        }
        this._policySchemaValidate(addPolicies, 'addPolicy');
        this._policySchemaValidate(updatePolicies, 'updatePolicy');
        this._resolveResourcesSchemaValidate(resolveResources);
        const presentableInfo = await this.presentableService.findById(presentableId);
        ctx.entityNullValueAndUserAuthorizationCheck(presentableInfo, {
            msg: ctx.gettext('params-validate-failed', 'presentableId')
        });
        await this.presentableService.updatePresentable(presentableInfo, {
            addPolicies, updatePolicies, presentableTitle, resolveResources, tags, coverImages
        }).then(ctx.success);
    }
    async updatePresentableOnlineStatus() {
        const { ctx } = this;
        const presentableId = ctx.checkParams('presentableId').exist().isPresentableId().value;
        const onlineStatus = ctx.checkBody('onlineStatus').exist().toInt().in([enum_1.PresentableOnlineStatusEnum.Offline, enum_1.PresentableOnlineStatusEnum.Online]).value;
        ctx.validateParams();
        const presentableInfo = await this.presentableService.findById(presentableId);
        ctx.entityNullValueAndUserAuthorizationCheck(presentableInfo, {
            msg: ctx.gettext('params-validate-failed', 'presentableId')
        });
        await this.presentableService.updateOnlineStatus(presentableInfo, onlineStatus).then(ctx.success);
    }
    async updatePresentableVersion() {
        const { ctx } = this;
        const presentableId = ctx.checkParams('presentableId').exist().isPresentableId().value;
        const version = ctx.checkBody('version').exist().is(semver.valid, ctx.gettext('params-format-validate-failed', 'version')).value;
        ctx.validateParams();
        const presentableInfo = await this.presentableService.findById(presentableId);
        ctx.entityNullValueAndUserAuthorizationCheck(presentableInfo, {
            msg: ctx.gettext('params-validate-failed', 'presentableId')
        });
        const resourceInfo = await this.outsideApiService.getResourceInfo(presentableInfo.resourceInfo.resourceId, { projection: 'resourceVersions' });
        const resourceVersionInfo = resourceInfo.resourceVersions.find(x => x.version === version);
        if (!resourceVersionInfo) {
            throw new egg_freelog_base_1.ArgumentError(ctx.gettext('params-validate-failed', 'version'), { version });
        }
        await this.presentableService.updatePresentableVersion(presentableInfo, resourceVersionInfo.version, resourceVersionInfo.versionId).then(ctx.success);
    }
    async updatePresentableRewriteProperty() {
        const { ctx } = this;
        const presentableId = ctx.checkParams('presentableId').exist().isPresentableId().value;
        const rewriteProperty = ctx.checkBody('rewriteProperty').exist().isArray().value;
        ctx.validateParams();
        const presentableInfo = await this.presentableService.findById(presentableId);
        ctx.entityNullValueAndUserAuthorizationCheck(presentableInfo, {
            msg: ctx.gettext('params-validate-failed', 'presentableId')
        });
        const rewritePropertyValidateResult = this.presentableRewritePropertyValidator.validate(rewriteProperty);
        if (!(0, lodash_1.isEmpty)(rewritePropertyValidateResult.errors)) {
            throw new egg_freelog_base_1.ArgumentError(this.ctx.gettext('params-format-validate-failed', 'rewriteProperty'), {
                errors: rewritePropertyValidateResult.errors
            });
        }
        await this.presentableVersionService.updatePresentableRewriteProperty(presentableInfo, rewriteProperty).then(ctx.success);
    }
    async presentableDetail() {
        const { ctx } = this;
        const nodeId = ctx.checkQuery('nodeId').exist().isInt().gt(0).value;
        const resourceId = ctx.checkQuery('resourceId').optional().isResourceId().value;
        const resourceName = ctx.checkQuery('resourceName').optional().isFullResourceName().value;
        const presentableName = ctx.checkQuery('presentableName').optional().isPresentableName().value;
        const projection = ctx.checkQuery('projection').optional().toSplitArray().default([]).value;
        const isLoadPolicyInfo = ctx.checkQuery('isLoadPolicyInfo').optional().toInt().in([0, 1]).value;
        const isTranslate = ctx.checkQuery('isTranslate').optional().toBoolean().default(false).value;
        const isLoadVersionProperty = ctx.checkQuery('isLoadVersionProperty').optional().toInt().default(0).in([0, 1]).value;
        const isLoadCustomPropertyDescriptors = ctx.checkQuery('isLoadCustomPropertyDescriptors').optional().toInt().default(0).in([0, 1]).value;
        const isLoadResourceDetailInfo = ctx.checkQuery('isLoadResourceDetailInfo').optional().toInt().default(0).in([0, 1]).value;
        const isLoadResourceVersionInfo = ctx.checkQuery('isLoadResourceVersionInfo').optional().toInt().default(0).in([0, 1]).value;
        ctx.validateParams();
        if ([resourceId, resourceName, presentableName].every(lodash_1.isUndefined)) {
            throw new egg_freelog_base_1.ArgumentError(ctx.gettext('params-required-validate-failed', 'resourceId,resourceName,presentableName'));
        }
        const condition = { nodeId };
        if ((0, lodash_1.isString)(resourceId)) {
            condition['resourceInfo.resourceId'] = resourceId;
        }
        if ((0, lodash_1.isString)(resourceName)) {
            condition['resourceInfo.resourceName'] = resourceName;
        }
        if ((0, lodash_1.isString)(presentableName)) {
            condition['presentableName'] = presentableName;
        }
        let presentableInfo = await this.presentableService.findOne(condition, projection.join(' '));
        if (presentableInfo && (isLoadVersionProperty || isLoadCustomPropertyDescriptors)) {
            presentableInfo = await this.presentableService.fillPresentableVersionProperty([presentableInfo], isLoadCustomPropertyDescriptors, isLoadCustomPropertyDescriptors).then(lodash_1.first);
        }
        if (presentableInfo && isLoadPolicyInfo) {
            presentableInfo = await this.presentableService.fillPresentablePolicyInfo([presentableInfo], isTranslate).then(lodash_1.first);
        }
        if (presentableInfo && isLoadResourceDetailInfo) {
            presentableInfo = await this.presentableService.fillPresentableResourceInfo([presentableInfo]).then(lodash_1.first);
        }
        if (presentableInfo && isLoadResourceVersionInfo) {
            presentableInfo = await this.presentableService.fillPresentableResourceVersionInfo([presentableInfo]).then(lodash_1.first);
        }
        ctx.success(presentableInfo);
    }
    async show() {
        const { ctx } = this;
        const presentableId = ctx.checkParams('presentableId').isPresentableId().value;
        const isLoadPolicyInfo = ctx.checkQuery('isLoadPolicyInfo').optional().toInt().in([0, 1]).value;
        const isTranslate = ctx.checkQuery('isTranslate').optional().toBoolean().default(false).value;
        const isLoadVersionProperty = ctx.checkQuery('isLoadVersionProperty').optional().toInt().default(0).in([0, 1]).value;
        const isLoadCustomPropertyDescriptors = ctx.checkQuery('isLoadCustomPropertyDescriptors').optional().toInt().default(0).in([0, 1]).value;
        const isLoadResourceDetailInfo = ctx.checkQuery('isLoadResourceDetailInfo').optional().toInt().default(0).in([0, 1]).value;
        const isLoadResourceVersionInfo = ctx.checkQuery('isLoadResourceVersionInfo').optional().toInt().default(0).in([0, 1]).value;
        const projection = ctx.checkQuery('projection').optional().toSplitArray().default([]).value;
        ctx.validateParams();
        let presentableInfo = await this.presentableService.findById(presentableId, projection.join(' '));
        if (presentableInfo && (isLoadVersionProperty || isLoadCustomPropertyDescriptors)) {
            presentableInfo = await this.presentableService.fillPresentableVersionProperty([presentableInfo], isLoadCustomPropertyDescriptors, isLoadCustomPropertyDescriptors).then(lodash_1.first);
        }
        if (presentableInfo && isLoadPolicyInfo) {
            presentableInfo = await this.presentableService.fillPresentablePolicyInfo([presentableInfo], isTranslate).then(lodash_1.first);
        }
        if (presentableInfo && isLoadResourceDetailInfo) {
            presentableInfo = await this.presentableService.fillPresentableResourceInfo([presentableInfo]).then(lodash_1.first);
        }
        if (presentableInfo && isLoadResourceVersionInfo) {
            presentableInfo = await this.presentableService.fillPresentableResourceVersionInfo([presentableInfo]).then(lodash_1.first);
        }
        ctx.success(presentableInfo);
    }
    async dependencyTree() {
        const { ctx } = this;
        const presentableId = ctx.checkParams('presentableId').isPresentableId().value;
        const maxDeep = ctx.checkQuery('maxDeep').optional().toInt().default(100).lt(101).value;
        // 不传则默认从根节点开始,否则从指定的树节点ID开始往下构建依赖树
        const nid = ctx.checkQuery('nid').optional().type('string').value;
        const isContainRootNode = ctx.checkQuery('isContainRootNode').optional().default(true).toBoolean().value;
        const version = ctx.checkQuery('version').optional().is(semver.valid, ctx.gettext('params-format-validate-failed', 'version')).value;
        ctx.validateParams();
        const condition = { presentableId };
        if ((0, lodash_1.isString)(version)) {
            condition.version = version;
        }
        else {
            await this.presentableService.findById(presentableId, 'version').then(data => condition.version = data?.version ?? '');
        }
        const presentableVersionInfo = await this.presentableVersionService.findOne(condition, 'dependencyTree');
        if (!presentableVersionInfo) {
            throw new egg_freelog_base_1.ArgumentError(ctx.gettext('params-validate-failed', 'presentableId or version'));
        }
        const presentableDependencies = this.presentableVersionService.convertPresentableDependencyTree(presentableVersionInfo.dependencyTree, nid, isContainRootNode, maxDeep);
        ctx.success(presentableDependencies);
    }
    async authTree() {
        const { ctx } = this;
        const presentableId = ctx.checkParams('presentableId').isPresentableId().value;
        const version = ctx.checkQuery('version').optional().is(semver.valid, ctx.gettext('params-format-validate-failed', 'version')).value;
        ctx.validateParams();
        const presentableInfo = await this.presentableService.findById(presentableId);
        const condition = { presentableId };
        if ((0, lodash_1.isString)(version)) {
            condition.version = version;
        }
        else {
            condition.version = presentableInfo.version;
        }
        const presentableVersionInfo = await this.presentableVersionService.findOne(condition, 'authTree');
        if (!presentableVersionInfo) {
            throw new egg_freelog_base_1.ArgumentError(ctx.gettext('params-validate-failed', 'version'));
        }
        const presentableAuthTree = await this.presentableVersionService.convertPresentableAuthTreeWithContracts(presentableInfo, presentableVersionInfo.authTree);
        ctx.success(presentableAuthTree);
    }
    async relationTree() {
        const { ctx } = this;
        const presentableId = ctx.checkParams('presentableId').isPresentableId().value;
        const version = ctx.checkQuery('version').optional().is(semver.valid, ctx.gettext('params-format-validate-failed', 'version')).value;
        ctx.validateParams();
        const presentableInfo = await this.presentableService.findById(presentableId);
        if (!presentableInfo) {
            throw new egg_freelog_base_1.ArgumentError(this.ctx.gettext('params-validate-failed'));
        }
        const condition = { presentableId };
        if ((0, lodash_1.isString)(version)) {
            condition.version = version;
        }
        else {
            condition.version = presentableInfo.version;
        }
        const presentableVersionInfo = await this.presentableVersionService.findOne(condition, 'version dependencyTree authTree');
        if (!presentableVersionInfo) {
            throw new egg_freelog_base_1.ArgumentError(ctx.gettext('params-validate-failed', 'version'));
        }
        await this.presentableVersionService.getRelationTree(presentableInfo, presentableVersionInfo).then(ctx.success);
    }
    async contractAppliedPresentables() {
        const { ctx } = this;
        const nodeId = ctx.checkParams('nodeId').exist().isInt().gt(0).value;
        const contractIds = ctx.checkQuery('contractIds').exist().isSplitMongoObjectId().toSplitArray().len(1, 300).value;
        ctx.validateParams();
        await this.presentableService.contractAppliedPresentable(nodeId, contractIds).then(ctx.success);
    }
    // 策略格式校验
    _policySchemaValidate(policies, mode) {
        const policyValidateResult = this.presentablePolicyValidator.validate(policies || [], mode);
        if (!(0, lodash_1.isEmpty)(policyValidateResult.errors)) {
            throw new egg_freelog_base_1.ArgumentError(this.ctx.gettext('params-format-validate-failed', 'policies'), {
                errors: policyValidateResult.errors
            });
        }
    }
    // 解决上抛资源格式校验
    _resolveResourcesSchemaValidate(resolveResources) {
        const resolveResourcesValidateResult = this.resolveResourcesValidator.validate(resolveResources || []);
        if (!(0, lodash_1.isEmpty)(resolveResourcesValidateResult.errors)) {
            throw new egg_freelog_base_1.ArgumentError(this.ctx.gettext('params-format-validate-failed', 'resolveResources'), {
                errors: resolveResourcesValidateResult.errors
            });
        }
    }
};
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", Object)
], PresentableController.prototype, "ctx", void 0);
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", Object)
], PresentableController.prototype, "nodeCommonChecker", void 0);
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", Object)
], PresentableController.prototype, "presentableCommonChecker", void 0);
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", Object)
], PresentableController.prototype, "nodeService", void 0);
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", Object)
], PresentableController.prototype, "outsideApiService", void 0);
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", Object)
], PresentableController.prototype, "presentableService", void 0);
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", Object)
], PresentableController.prototype, "resolveResourcesValidator", void 0);
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", Object)
], PresentableController.prototype, "presentablePolicyValidator", void 0);
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", Object)
], PresentableController.prototype, "presentableRewritePropertyValidator", void 0);
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", Object)
], PresentableController.prototype, "presentableVersionService", void 0);
__decorate([
    (0, midway_1.get)('/'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], PresentableController.prototype, "index", null);
__decorate([
    (0, midway_1.get)('/search'),
    (0, egg_freelog_base_1.visitorIdentityValidator)(egg_freelog_base_1.IdentityTypeEnum.InternalClient | egg_freelog_base_1.IdentityTypeEnum.LoginUser),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], PresentableController.prototype, "indexForAdmin", null);
__decorate([
    (0, midway_1.get)('/list'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], PresentableController.prototype, "list", null);
__decorate([
    (0, midway_1.post)('/'),
    (0, egg_freelog_base_1.visitorIdentityValidator)(egg_freelog_base_1.IdentityTypeEnum.LoginUser),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], PresentableController.prototype, "createPresentable", null);
__decorate([
    (0, midway_1.put)('/:presentableId'),
    (0, egg_freelog_base_1.visitorIdentityValidator)(egg_freelog_base_1.IdentityTypeEnum.LoginUser),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], PresentableController.prototype, "updatePresentable", null);
__decorate([
    (0, midway_1.put)('/:presentableId/onlineStatus'),
    (0, egg_freelog_base_1.visitorIdentityValidator)(egg_freelog_base_1.IdentityTypeEnum.LoginUser),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], PresentableController.prototype, "updatePresentableOnlineStatus", null);
__decorate([
    (0, midway_1.put)('/:presentableId/version'),
    (0, egg_freelog_base_1.visitorIdentityValidator)(egg_freelog_base_1.IdentityTypeEnum.LoginUser),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], PresentableController.prototype, "updatePresentableVersion", null);
__decorate([
    (0, midway_1.put)('/:presentableId/rewriteProperty'),
    (0, egg_freelog_base_1.visitorIdentityValidator)(egg_freelog_base_1.IdentityTypeEnum.LoginUser),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], PresentableController.prototype, "updatePresentableRewriteProperty", null);
__decorate([
    (0, midway_1.get)('/detail'),
    (0, egg_freelog_base_1.visitorIdentityValidator)(egg_freelog_base_1.IdentityTypeEnum.LoginUser),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], PresentableController.prototype, "presentableDetail", null);
__decorate([
    (0, midway_1.get)('/:presentableId'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], PresentableController.prototype, "show", null);
__decorate([
    (0, midway_1.get)('/:presentableId/dependencyTree'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], PresentableController.prototype, "dependencyTree", null);
__decorate([
    (0, midway_1.get)('/:presentableId/authTree'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], PresentableController.prototype, "authTree", null);
__decorate([
    (0, midway_1.get)('/:presentableId/relationTree'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], PresentableController.prototype, "relationTree", null);
__decorate([
    (0, egg_freelog_base_1.visitorIdentityValidator)(egg_freelog_base_1.IdentityTypeEnum.LoginUser),
    (0, midway_1.get)('/:nodeId/contractAppliedPresentable'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], PresentableController.prototype, "contractAppliedPresentables", null);
PresentableController = __decorate([
    (0, midway_1.provide)(),
    (0, midway_1.controller)('/v2/presentables')
], PresentableController);
exports.PresentableController = PresentableController;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlc2VudGFibGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvYXBwL2NvbnRyb2xsZXIvcHJlc2VudGFibGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0FBQUEseUNBQWdDO0FBQ2hDLGlDQUFpQztBQUNqQyxxQ0FBdUQ7QUFDdkQsbUNBQW1FO0FBQ25FLG1DQUErRTtBQUkvRSx1REFFMEI7QUFJMUIsSUFBYSxxQkFBcUIsR0FBbEMsTUFBYSxxQkFBcUI7SUFHOUIsR0FBRyxDQUFpQjtJQUVwQixpQkFBaUIsQ0FBQztJQUVsQix3QkFBd0IsQ0FBQztJQUV6QixXQUFXLENBQWU7SUFFMUIsaUJBQWlCLENBQXFCO0lBRXRDLGtCQUFrQixDQUFzQjtJQUV4Qyx5QkFBeUIsQ0FBc0I7SUFFL0MsMEJBQTBCLENBQXNCO0lBRWhELG1DQUFtQyxDQUFzQjtJQUV6RCx5QkFBeUIsQ0FBNkI7SUFHdEQsS0FBSyxDQUFDLEtBQUs7UUFFUCxNQUFNLEVBQUMsR0FBRyxFQUFDLEdBQUcsSUFBSSxDQUFDO1FBQ25CLE1BQU0sSUFBSSxHQUFHLEdBQUcsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUMsS0FBSyxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7UUFDOUUsTUFBTSxLQUFLLEdBQUcsR0FBRyxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUM7UUFDekYsTUFBTSxJQUFJLEdBQUcsR0FBRyxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxZQUFZLEVBQUUs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