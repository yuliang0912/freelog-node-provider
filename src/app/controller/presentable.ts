import {isURL} from 'validator';
import * as semver from 'semver';
import {PresentableOnlineStatusEnum} from '../../enum';
import {controller, inject, get, post, put, provide} from 'midway';
import {isString, isUndefined, isNumber, isEmpty, first, isDate} from 'lodash';
import {
    INodeService, IOutsideApiService, IPresentableService, IPresentableVersionService, NodeInfo
} from '../../interface';
import {
    IdentityTypeEnum, visitorIdentityValidator, ArgumentError, FreelogContext, IJsonSchemaValidate
} from 'egg-freelog-base';

@provide()
@controller('/v2/presentables')
export class PresentableController {

    @inject()
    ctx: FreelogContext;
    @inject()
    nodeCommonChecker;
    @inject()
    presentableCommonChecker;
    @inject()
    nodeService: INodeService;
    @inject()
    outsideApiService: IOutsideApiService;
    @inject()
    presentableService: IPresentableService;
    @inject()
    resolveResourcesValidator: IJsonSchemaValidate;
    @inject()
    presentablePolicyValidator: IJsonSchemaValidate;
    @inject()
    presentableRewritePropertyValidator: IJsonSchemaValidate;
    @inject()
    presentableVersionService: IPresentableVersionService;

    @get('/')
    async index() {

        const {ctx} = this;
        const skip = ctx.checkQuery('skip').optional().toInt().default(0).ge(0).value;
        const limit = ctx.checkQuery('limit').optional().toInt().default(10).gt(0).lt(101).value;
        const sort = ctx.checkQuery('sort').optional().toSortObject().value;
        const nodeId = ctx.checkQuery('nodeId').exist().toInt().value;
        const resourceTypes = ctx.checkQuery('resourceType').optional().toSplitArray().value;
        const omitResourceType = ctx.checkQuery('omitResourceType').optional().isResourceType().value;
        const tags = ctx.checkQuery('tags').optional().toSplitArray().len(1, 20).value;
        const onlineStatus = ctx.checkQuery('onlineStatus').optional().toInt().default(1).value;
        const keywords = ctx.checkQuery('keywords').ignoreParamWhenEmpty().type('string').len(1, 100).value;
        const isLoadPolicyInfo = ctx.checkQuery('isLoadPolicyInfo').optional().toInt().default(0).in([0, 1]).value;
        const isTranslate = ctx.checkQuery('isTranslate').optional().toBoolean().default(false).value;
        const isLoadVersionProperty = ctx.checkQuery('isLoadVersionProperty').optional().toInt().default(0).in([0, 1]).value;
        const projection = ctx.checkQuery('projection').optional().toSplitArray().default([]).value;
        ctx.validateParams();

        const condition: any = {nodeId};
        if (resourceTypes?.length) { // resourceType 与 omitResourceType 互斥
            condition['resourceInfo.resourceType'] = {$in: resourceTypes};
        } else if (isString(omitResourceType)) {
            condition['resourceInfo.resourceType'] = {$ne: omitResourceType};
        }
        if (tags) {
            condition.tags = {$in: tags};
        }
        if (onlineStatus === 0 || onlineStatus === 1) {
            condition.onlineStatus = onlineStatus;
        }
        if (isString(keywords)) {
            const searchExp = {$regex: keywords, $options: 'i'};
            condition.$or = [{presentableName: searchExp}, {presentableTitle: searchExp}];
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

    @get('/search')
    @visitorIdentityValidator(IdentityTypeEnum.InternalClient | IdentityTypeEnum.LoginUser)
    async indexForAdmin() {

        const {ctx} = this;
        const skip = ctx.checkQuery('skip').ignoreParamWhenEmpty().toInt().default(0).ge(0).value;
        const limit = ctx.checkQuery('limit').ignoreParamWhenEmpty().toInt().default(10).gt(0).lt(101).value;
        const sort = ctx.checkQuery('sort').ignoreParamWhenEmpty().toSortObject().value;
        const nodeId = ctx.checkQuery('nodeId').ignoreParamWhenEmpty().toInt().gt(0).value;
        const resourceType = ctx.checkQuery('resourceType').optional().isResourceType().value;
        const tags = ctx.checkQuery('tags').ignoreParamWhenEmpty().toSplitArray().value;
        const keywords = ctx.checkQuery('keywords').ignoreParamWhenEmpty().type('string').len(1, 100).value;
        const startCreatedDate = ctx.checkQuery('startCreatedDate').ignoreParamWhenEmpty().toDate().value;
        const endCreatedDate = ctx.checkQuery('endCreatedDate').ignoreParamWhenEmpty().toDate().value;
        ctx.validateParams().validateOfficialAuditAccount();

        const condition: any = {};
        if (isString(resourceType)) {
            condition['resourceInfo.resourceType'] = resourceType;
        }
        if (tags) {
            condition.tags = {$in: tags};
        }
        if (isDate(startCreatedDate) && isDate(endCreatedDate)) {
            condition.createDate = {$gte: startCreatedDate, $lte: endCreatedDate};
        } else if (isDate(startCreatedDate)) {
            condition.createDate = {$gte: startCreatedDate};
        } else if (isDate(endCreatedDate)) {
            condition.createDate = {$lte: endCreatedDate};
        }
        if (nodeId) {
            condition.nodeId = nodeId;
        }

        const pageResult = await this.presentableService.searchIntervalList(condition, keywords, {
            sort: sort ?? {createDate: -1}, limit, skip
        });

        if (!pageResult.dataList) {
            return ctx.success(pageResult);
        }
        pageResult.dataList = await this.presentableService.fillPresentablePolicyInfo(pageResult.dataList, true);
        pageResult.dataList.forEach(item => {
            item['nodeName'] = first<NodeInfo>(item.nodes)?.nodeName ?? '';
            item.presentableId = item._id;
            delete item.nodes;
            delete item._id;
        });
        ctx.success(pageResult);
    }

    @get('/list')
    async list() {

        const {ctx} = this;
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

        const condition: any = {};
        if (isNumber(userId)) {
            condition.userId = userId;
        }
        if (isNumber(nodeId)) {
            condition.nodeId = nodeId;
        }
        if (presentableIds) {
            condition._id = {$in: presentableIds};
        }
        if (resourceIds) {
            condition['resourceInfo.resourceId'] = {$in: resourceIds};
        }
        if (resourceNames) {
            condition['resourceInfo.resourceNames'] = {$in: resourceNames.map(decodeURIComponent)};
        }
        if (resolveResourceIds && nodeId) {
            condition['resolveResources.resourceId'] = {$in: resolveResourceIds};
        }
        if (!resourceIds && !presentableIds && !resourceNames && !resolveResourceIds) {
            throw new ArgumentError(ctx.gettext('params-required-validate-failed', 'presentableIds,resourceIds,resourceNames'));
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

    @post('/')
    @visitorIdentityValidator(IdentityTypeEnum.LoginUser)
    async createPresentable() {

        const {ctx} = this;
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
            throw new ArgumentError(ctx.gettext('params-validate-failed', 'resourceId'));
        }
        if (resourceInfo.status === 0) {
            throw new ArgumentError(ctx.gettext('be-sign-subject-offline'), {resourceId});
        }
        const subjectVersionInfo = resourceInfo.resourceVersions.find(x => x.version === version);
        if (!subjectVersionInfo) {
            throw new ArgumentError(ctx.gettext('params-validate-failed', 'version'), {version});
        }

        await this.presentableService.createPresentable({
            presentableName, resourceInfo, version,
            tags, policies, nodeInfo, resolveResources,
            versionId: subjectVersionInfo.versionId,
            presentableTitle: presentableName,
            coverImages: resourceInfo.coverImages,
        }).then(ctx.success);
    }

    @put('/:presentableId')
    @visitorIdentityValidator(IdentityTypeEnum.LoginUser)
    async updatePresentable() {

        const {ctx} = this;
        const presentableId = ctx.checkParams('presentableId').exist().isPresentableId().value;
        const presentableTitle = ctx.checkBody('presentableTitle').optional().type('string').value;
        const tags = ctx.checkBody('tags').optional().isArray().value;
        const resolveResources = ctx.checkBody('resolveResources').optional().isArray().value;
        const updatePolicies = ctx.checkBody('updatePolicies').optional().isArray().len(1).value;
        const addPolicies = ctx.checkBody('addPolicies').optional().isArray().len(1).value;
        const coverImages = ctx.checkBody('coverImages').optional().isArray().len(0, 10).value;
        ctx.validateParams();

        if ([updatePolicies, addPolicies, presentableTitle, tags, resolveResources, coverImages].every(isUndefined)) {
            throw new ArgumentError(ctx.gettext('params-required-validate-failed'));
        }
        if (!isEmpty(coverImages) && coverImages.some(x => !isURL(x.toString(), {protocols: ['https']}))) {
            throw new ArgumentError(ctx.gettext('params-format-validate-failed', 'coverImages'));
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

    @put('/:presentableId/onlineStatus')
    @visitorIdentityValidator(IdentityTypeEnum.LoginUser)
    async updatePresentableOnlineStatus() {

        const {ctx} = this;
        const presentableId = ctx.checkParams('presentableId').exist().isPresentableId().value;
        const onlineStatus = ctx.checkBody('onlineStatus').exist().toInt().in([PresentableOnlineStatusEnum.Offline, PresentableOnlineStatusEnum.Online]).value;
        ctx.validateParams();

        const presentableInfo = await this.presentableService.findById(presentableId);
        ctx.entityNullValueAndUserAuthorizationCheck(presentableInfo, {
            msg: ctx.gettext('params-validate-failed', 'presentableId')
        });

        await this.presentableService.updateOnlineStatus(presentableInfo, onlineStatus).then(ctx.success);
    }

    @put('/:presentableId/version')
    @visitorIdentityValidator(IdentityTypeEnum.LoginUser)
    async updatePresentableVersion() {

        const {ctx} = this;
        const presentableId = ctx.checkParams('presentableId').exist().isPresentableId().value;
        const version = ctx.checkBody('version').exist().is(semver.valid, ctx.gettext('params-format-validate-failed', 'version')).value;
        ctx.validateParams();

        const presentableInfo = await this.presentableService.findById(presentableId);
        ctx.entityNullValueAndUserAuthorizationCheck(presentableInfo, {
            msg: ctx.gettext('params-validate-failed', 'presentableId')
        });

        const resourceInfo = await this.outsideApiService.getResourceInfo(presentableInfo.resourceInfo.resourceId, {projection: 'resourceVersions'});
        const resourceVersionInfo = resourceInfo.resourceVersions.find(x => x.version === version);
        if (!resourceVersionInfo) {
            throw new ArgumentError(ctx.gettext('params-validate-failed', 'version'), {version});
        }

        await this.presentableService.updatePresentableVersion(presentableInfo, resourceVersionInfo.version, resourceVersionInfo.versionId).then(ctx.success);
    }

    @put('/:presentableId/rewriteProperty')
    @visitorIdentityValidator(IdentityTypeEnum.LoginUser)
    async updatePresentableRewriteProperty() {

        const {ctx} = this;
        const presentableId = ctx.checkParams('presentableId').exist().isPresentableId().value;
        const rewriteProperty = ctx.checkBody('rewriteProperty').exist().isArray().value;
        ctx.validateParams();

        const presentableInfo = await this.presentableService.findById(presentableId);
        ctx.entityNullValueAndUserAuthorizationCheck(presentableInfo, {
            msg: ctx.gettext('params-validate-failed', 'presentableId')
        });

        const rewritePropertyValidateResult = this.presentableRewritePropertyValidator.validate(rewriteProperty);
        if (!isEmpty(rewritePropertyValidateResult.errors)) {
            throw new ArgumentError(this.ctx.gettext('params-format-validate-failed', 'rewriteProperty'), {
                errors: rewritePropertyValidateResult.errors
            });
        }

        await this.presentableVersionService.updatePresentableRewriteProperty(presentableInfo, rewriteProperty).then(ctx.success);
    }

    @get('/detail')
    @visitorIdentityValidator(IdentityTypeEnum.LoginUser)
    async presentableDetail() {

        const {ctx} = this;
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

        if ([resourceId, resourceName, presentableName].every(isUndefined)) {
            throw new ArgumentError(ctx.gettext('params-required-validate-failed', 'resourceId,resourceName,presentableName'));
        }

        const condition: any = {nodeId};
        if (isString(resourceId)) {
            condition['resourceInfo.resourceId'] = resourceId;
        }
        if (isString(resourceName)) {
            condition['resourceInfo.resourceName'] = resourceName;
        }
        if (isString(presentableName)) {
            condition['presentableName'] = presentableName;
        }

        let presentableInfo: any = await this.presentableService.findOne(condition, projection.join(' '));
        if (presentableInfo && (isLoadVersionProperty || isLoadCustomPropertyDescriptors)) {
            presentableInfo = await this.presentableService.fillPresentableVersionProperty([presentableInfo], isLoadCustomPropertyDescriptors, isLoadCustomPropertyDescriptors).then(first);
        }
        if (presentableInfo && isLoadPolicyInfo) {
            presentableInfo = await this.presentableService.fillPresentablePolicyInfo([presentableInfo], isTranslate).then(first);
        }
        if (presentableInfo && isLoadResourceDetailInfo) {
            presentableInfo = await this.presentableService.fillPresentableResourceInfo([presentableInfo]).then(first);
        }
        if (presentableInfo && isLoadResourceVersionInfo) {
            presentableInfo = await this.presentableService.fillPresentableResourceVersionInfo([presentableInfo]).then(first);
        }
        ctx.success(presentableInfo);
    }

    @get('/admin/presentableStatistics')
    @visitorIdentityValidator(IdentityTypeEnum.LoginUser)
    async nodePresentableStatistics() {
        const {ctx} = this;
        let nodeIds = ctx.checkQuery('nodeIds').exist().isSplitNumber().toSplitArray().len(1, 100).value;
        ctx.validateParams().validateOfficialAuditAccount();

        nodeIds = nodeIds.map(x => parseInt(x));
        const nodeMap = await this.presentableService.nodePresentableStatistics(nodeIds).then(list => {
            return new Map(list.map(x => [x.nodeId, x.count]));
        });

        ctx.success(nodeIds.map(nodeId => {
            return {
                nodeId, count: nodeMap.get(nodeId) ?? 0
            };
        }));
    }

    @get('/:presentableId')
    async show() {

        const {ctx} = this;
        const presentableId = ctx.checkParams('presentableId').isPresentableId().value;
        const isLoadPolicyInfo = ctx.checkQuery('isLoadPolicyInfo').optional().toInt().in([0, 1]).value;
        const isTranslate = ctx.checkQuery('isTranslate').optional().toBoolean().default(false).value;
        const isLoadVersionProperty = ctx.checkQuery('isLoadVersionProperty').optional().toInt().default(0).in([0, 1]).value;
        const isLoadCustomPropertyDescriptors = ctx.checkQuery('isLoadCustomPropertyDescriptors').optional().toInt().default(0).in([0, 1]).value;
        const isLoadResourceDetailInfo = ctx.checkQuery('isLoadResourceDetailInfo').optional().toInt().default(0).in([0, 1]).value;
        const isLoadResourceVersionInfo = ctx.checkQuery('isLoadResourceVersionInfo').optional().toInt().default(0).in([0, 1]).value;
        const projection = ctx.checkQuery('projection').optional().toSplitArray().default([]).value;
        ctx.validateParams();

        let presentableInfo: any = await this.presentableService.findById(presentableId, projection.join(' '));
        if (presentableInfo && (isLoadVersionProperty || isLoadCustomPropertyDescriptors)) {
            presentableInfo = await this.presentableService.fillPresentableVersionProperty([presentableInfo], isLoadCustomPropertyDescriptors, isLoadCustomPropertyDescriptors).then(first);
        }
        if (presentableInfo && isLoadPolicyInfo) {
            presentableInfo = await this.presentableService.fillPresentablePolicyInfo([presentableInfo], isTranslate).then(first);
        }
        if (presentableInfo && isLoadResourceDetailInfo) {
            presentableInfo = await this.presentableService.fillPresentableResourceInfo([presentableInfo]).then(first);
        }
        if (presentableInfo && isLoadResourceVersionInfo) {
            presentableInfo = await this.presentableService.fillPresentableResourceVersionInfo([presentableInfo]).then(first);
        }
        ctx.success(presentableInfo);
    }

    @get('/:presentableId/dependencyTree')
    async dependencyTree() {

        const {ctx} = this;
        const presentableId = ctx.checkParams('presentableId').isPresentableId().value;
        const maxDeep = ctx.checkQuery('maxDeep').optional().toInt().default(100).lt(101).value;
        // 不传则默认从根节点开始,否则从指定的树节点ID开始往下构建依赖树
        const nid = ctx.checkQuery('nid').optional().type('string').value;
        const isContainRootNode = ctx.checkQuery('isContainRootNode').optional().default(true).toBoolean().value;
        const version = ctx.checkQuery('version').optional().is(semver.valid, ctx.gettext('params-format-validate-failed', 'version')).value;
        ctx.validateParams();

        const condition: any = {presentableId};
        if (isString(version)) {
            condition.version = version;
        } else {
            await this.presentableService.findById(presentableId, 'version').then(data => condition.version = data?.version ?? '');
        }
        const presentableVersionInfo = await this.presentableVersionService.findOne(condition, 'dependencyTree');
        if (!presentableVersionInfo) {
            throw new ArgumentError(ctx.gettext('params-validate-failed', 'presentableId or version'));
        }

        const presentableDependencies = this.presentableVersionService.convertPresentableDependencyTree(presentableVersionInfo.dependencyTree, nid, isContainRootNode, maxDeep);

        ctx.success(presentableDependencies);
    }

    @get('/:presentableId/authTree')
    async authTree() {

        const {ctx} = this;
        const presentableId = ctx.checkParams('presentableId').isPresentableId().value;
        const version = ctx.checkQuery('version').optional().is(semver.valid, ctx.gettext('params-format-validate-failed', 'version')).value;
        ctx.validateParams();

        const presentableInfo = await this.presentableService.findById(presentableId);
        const condition: any = {presentableId};
        if (isString(version)) {
            condition.version = version;
        } else {
            condition.version = presentableInfo.version;
        }
        const presentableVersionInfo = await this.presentableVersionService.findOne(condition, 'authTree');
        if (!presentableVersionInfo) {
            throw new ArgumentError(ctx.gettext('params-validate-failed', 'version'));
        }

        const presentableAuthTree = await this.presentableVersionService.convertPresentableAuthTreeWithContracts(presentableInfo, presentableVersionInfo.authTree);

        ctx.success(presentableAuthTree);
    }

    @get('/:presentableId/relationTree')
    async relationTree() {

        const {ctx} = this;
        const presentableId = ctx.checkParams('presentableId').isPresentableId().value;
        const version = ctx.checkQuery('version').optional().is(semver.valid, ctx.gettext('params-format-validate-failed', 'version')).value;
        ctx.validateParams();

        const presentableInfo = await this.presentableService.findById(presentableId);
        if (!presentableInfo) {
            throw new ArgumentError(this.ctx.gettext('params-validate-failed'));
        }
        const condition: any = {presentableId};
        if (isString(version)) {
            condition.version = version;
        } else {
            condition.version = presentableInfo.version;
        }
        const presentableVersionInfo = await this.presentableVersionService.findOne(condition, 'version dependencyTree authTree');
        if (!presentableVersionInfo) {
            throw new ArgumentError(ctx.gettext('params-validate-failed', 'version'));
        }

        await this.presentableVersionService.getRelationTree(presentableInfo, presentableVersionInfo).then(ctx.success);
    }

    @visitorIdentityValidator(IdentityTypeEnum.LoginUser)
    @get('/:nodeId/contractAppliedPresentable')
    async contractAppliedPresentables() {
        const {ctx} = this;
        const nodeId = ctx.checkParams('nodeId').exist().isInt().gt(0).value;
        const contractIds = ctx.checkQuery('contractIds').exist().isSplitMongoObjectId().toSplitArray().len(1, 300).value;
        ctx.validateParams();
        await this.presentableService.contractAppliedPresentable(nodeId, contractIds).then(ctx.success);
    }

    // 策略格式校验
    _policySchemaValidate(policies, mode: 'addPolicy' | 'updatePolicy') {
        const policyValidateResult = this.presentablePolicyValidator.validate(policies || [], mode);
        if (!isEmpty(policyValidateResult.errors)) {
            throw new ArgumentError(this.ctx.gettext('params-format-validate-failed', 'policies'), {
                errors: policyValidateResult.errors
            });
        }
    }

    // 解决上抛资源格式校验
    _resolveResourcesSchemaValidate(resolveResources) {
        const resolveResourcesValidateResult = this.resolveResourcesValidator.validate(resolveResources || []);
        if (!isEmpty(resolveResourcesValidateResult.errors)) {
            throw new ArgumentError(this.ctx.gettext('params-format-validate-failed', 'resolveResources'), {
                errors: resolveResourcesValidateResult.errors
            });
        }
    }
}
