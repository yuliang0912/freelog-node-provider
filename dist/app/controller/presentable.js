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
    // @visitorIdentityValidator(IdentityTypeEnum.InternalClient | IdentityTypeEnum.LoginUser)
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
        if (resourceTypes?.length) { //resourceType 与 omitResourceType互斥
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
            condition.$or = [{ presentableName: searchExp }, { presentableTitle: searchExp }, { 'resourceInfo.resourceName': searchExp }];
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
    /**
     * 获取presentable列表
     * @returns {Promise<void>}
     */
    // @visitorIdentityValidator(IdentityTypeEnum.InternalClient | IdentityTypeEnum.LoginUser)
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
    /**
     * 策略格式校验
     * @param policies
     * @param mode
     */
    _policySchemaValidate(policies, mode) {
        const policyValidateResult = this.presentablePolicyValidator.validate(policies || [], mode);
        if (!(0, lodash_1.isEmpty)(policyValidateResult.errors)) {
            throw new egg_freelog_base_1.ArgumentError(this.ctx.gettext('params-format-validate-failed', 'policies'), {
                errors: policyValidateResult.errors
            });
        }
    }
    /**
     * 解决上抛资源格式校验
     * @param resolveResources
     */
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlc2VudGFibGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvYXBwL2NvbnRyb2xsZXIvcHJlc2VudGFibGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0FBQUEseUNBQWdDO0FBQ2hDLGlDQUFpQztBQUNqQyxxQ0FBdUQ7QUFDdkQsbUNBQW1FO0FBQ25FLG1DQUErRTtBQUkvRSx1REFFMEI7QUFJMUIsSUFBYSxxQkFBcUIsR0FBbEMsTUFBYSxxQkFBcUI7SUFHOUIsR0FBRyxDQUFpQjtJQUVwQixpQkFBaUIsQ0FBQztJQUVsQix3QkFBd0IsQ0FBQztJQUV6QixXQUFXLENBQWU7SUFFMUIsaUJBQWlCLENBQXFCO0lBRXRDLGtCQUFrQixDQUFzQjtJQUV4Qyx5QkFBeUIsQ0FBc0I7SUFFL0MsMEJBQTBCLENBQXNCO0lBRWhELG1DQUFtQyxDQUFzQjtJQUV6RCx5QkFBeUIsQ0FBNkI7SUFJdEQsQUFEQSwwRkFBMEY7SUFDMUYsS0FBSyxDQUFDLEtBQUs7UUFFUCxNQUFNLEVBQUMsR0FBRyxFQUFDLEdBQUcsSUFBSSxDQUFDO1FBQ25CLE1BQU0sSUFBSSxHQUFHLEdBQUcsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUMsS0FBSyxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7UUFDOUUsTUFBTSxLQUFLLEdBQUcsR0FBRyxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUM7UUFDekYsTUFBTSxJQUFJLEdBQUcsR0FBRyxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxRQUFRLEVB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