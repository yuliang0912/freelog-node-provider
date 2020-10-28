import * as semver from 'semver';
import {isString, isUndefined, isNumber, isEmpty, first} from 'lodash';
import {controller, inject, get, post, put, provide} from 'midway';
import {visitorIdentity} from '../../extend/vistorIdentityDecorator';
import {LoginUser, InternalClient, ArgumentError} from 'egg-freelog-base';
import {
    IJsonSchemaValidate, INodeService,
    IOutsideApiService, IPresentableService, IPresentableVersionService
} from '../../interface';
import {PresentableOnlineStatusEnum} from "../../enum";

@provide()
@controller('/v2/presentables')
export class PresentableController {

    @inject()
    ctx;
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
    @visitorIdentity(InternalClient | LoginUser)
    async presentablePageList(ctx) {

        const nodeId = ctx.checkQuery('nodeId').exist().toInt().value;
        const resourceType = ctx.checkQuery('resourceType').optional().isResourceType().value;
        const omitResourceType = ctx.checkQuery('omitResourceType').optional().isResourceType().value;
        const tags = ctx.checkQuery('tags').optional().toSplitArray().len(1, 20).value;
        const onlineStatus = ctx.checkQuery('onlineStatus').optional().toInt().default(1).value;
        const page = ctx.checkQuery('page').optional().default(1).toInt().gt(0).value;
        const pageSize = ctx.checkQuery('pageSize').optional().default(10).gt(0).lt(101).toInt().value;
        const keywords = ctx.checkQuery('keywords').optional().type('string').len(1, 100).value;
        const isLoadPolicyInfo = ctx.checkQuery('isLoadPolicyInfo').optional().toInt().default(0).in([0, 1]).value;
        const isLoadVersionProperty = ctx.checkQuery("isLoadVersionProperty").optional().toInt().default(0).in([0, 1]).value;
        const projection = ctx.checkQuery('projection').optional().toSplitArray().default([]).value;
        ctx.validateParams();

        const condition: any = {nodeId};
        if (isString(resourceType)) { //resourceType 与 omitResourceType互斥
            condition['resourceInfo.resourceType'] = resourceType;
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
            condition.$or = [{presentableName: searchExp}, {presentableTitle: searchExp}, {'resourceInfo.resourceName': searchExp}];
        }

        const pageResult = await this.presentableService.findPageList(condition, page, pageSize, projection, {createDate: -1});
        if (isLoadPolicyInfo) {
            pageResult.dataList = await this.presentableService.fillPresentablePolicyInfo(pageResult.dataList);
        }
        if (isLoadVersionProperty) {
            pageResult.dataList = await this.presentableService.fillPresentableVersionProperty(pageResult.dataList, false, false);
        }
        return ctx.success(pageResult);

        // 以下代码已过期,目前只有展品切换版本时需要考虑所有版本列表,此操作可以通过调用资源接口获取到可选版本集
        // const isLoadingResourceInfo = ctx.checkQuery("isLoadingResourceInfo").optional().toInt().in([0, 1]).default(0).value;
        // if (!pageResult.dataList.length || !isLoadingResourceInfo) {
        //     return ctx.success(pageResult);
        // }
        // const allResourceIds = chain(pageResult.dataList).map(x => x.resourceInfo.resourceId).uniq().value();
        // const resourceVersionsMap = await this.outsideApiService.getResourceListByIds(allResourceIds, {projection: 'resourceId,resourceVersions'})
        //     .then(dataList => new Map(dataList.map(x => [x.resourceId, x.resourceVersions])));
        //
        // pageResult.dataList = pageResult.dataList.map(presentableInfo => {
        //     const model = (<any>presentableInfo).toObject();
        //     const resourceVersions = resourceVersionsMap.get(model.resourceInfo.resourceId) ?? [];
        //     model.resourceInfo.versions = resourceVersions.map(x => x.version);
        //     return model;
        // });
        //
        // ctx.success(pageResult);
    }

    /**
     * 获取presentable列表
     * @param ctx
     * @returns {Promise<void>}
     */
    @get('/list')
    @visitorIdentity(InternalClient | LoginUser)
    async list(ctx) {

        const userId = ctx.checkQuery('userId').optional().toInt().gt(0).value;
        const nodeId = ctx.checkQuery('nodeId').optional().toInt().gt(0).value;
        const presentableIds = ctx.checkQuery('presentableIds').optional().isSplitMongoObjectId().toSplitArray().len(1, 100).value;
        const resourceIds = ctx.checkQuery('resourceIds').optional().isSplitMongoObjectId().toSplitArray().len(1, 100).value;
        const resourceNames = ctx.checkQuery('resourceNames').optional().toSplitArray().len(1, 100).value;
        const isLoadPolicyInfo = ctx.checkQuery('isLoadPolicyInfo').optional().toInt().in([0, 1]).value;
        const isLoadVersionProperty = ctx.checkQuery("isLoadVersionProperty").optional().toInt().default(0).in([0, 1]).value;
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

        if (!resourceIds && !presentableIds && !resourceNames) {
            throw new ArgumentError(ctx.gettext('params-required-validate-failed', 'presentableIds,resourceIds,resourceNames'))
        }

        let presentableList = await this.presentableService.find(condition, projection.join(' '));
        if (isLoadPolicyInfo) {
            presentableList = await this.presentableService.fillPresentablePolicyInfo(presentableList)
        }
        if (isLoadVersionProperty) {
            presentableList = await this.presentableService.fillPresentableVersionProperty(presentableList, false, false);
        }
        ctx.success(presentableList);
    }

    @post('/')
    @visitorIdentity(LoginUser)
    async createPresentable(ctx) {

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
            throw new ArgumentError(ctx.gettext('params-validate-failed', 'version'), {version})
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
    @visitorIdentity(LoginUser)
    async updatePresentable(ctx) {

        const presentableId = ctx.checkParams("presentableId").exist().isPresentableId().value;
        const presentableTitle = ctx.checkBody('presentableTitle').optional().type('string').value;
        const tags = ctx.checkBody('tags').optional().isArray().value;
        const resolveResources = ctx.checkBody('resolveResources').optional().isArray().value;
        const updatePolicies = ctx.checkBody('updatePolicies').optional().isArray().len(1).value;
        const addPolicies = ctx.checkBody('addPolicies').optional().isArray().len(1).value;
        const coverImages = ctx.checkBody('coverImages').optional().isArray().len(0, 10).value;
        ctx.validateParams();

        if ([updatePolicies, addPolicies, presentableTitle, tags, resolveResources].every(isUndefined)) {
            throw new ArgumentError(ctx.gettext('params-required-validate-failed'));
        }
        if (!isEmpty(coverImages) && coverImages.some(x => !ctx.app.validator.isURL(x.toString(), {protocols: ['https']}))) {
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
    @visitorIdentity(LoginUser)
    async updatePresentableOnlineStatus(ctx) {

        const presentableId = ctx.checkParams("presentableId").exist().isPresentableId().value;
        const onlineStatus = ctx.checkBody("onlineStatus").exist().toInt().in([PresentableOnlineStatusEnum.Offline, PresentableOnlineStatusEnum.Online]).value;
        ctx.validateParams();

        const presentableInfo = await this.presentableService.findById(presentableId);
        ctx.entityNullValueAndUserAuthorizationCheck(presentableInfo, {
            msg: ctx.gettext('params-validate-failed', 'presentableId')
        });

        await this.presentableService.updateOnlineStatus(presentableInfo, onlineStatus).then(ctx.success);
    }

    @put('/:presentableId/version')
    @visitorIdentity(LoginUser)
    async updatePresentableVersion(ctx) {

        const presentableId = ctx.checkParams("presentableId").exist().isPresentableId().value;
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
    @visitorIdentity(LoginUser)
    async updatePresentableRewriteProperty(ctx) {

        const presentableId = ctx.checkParams("presentableId").exist().isPresentableId().value;
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
    @visitorIdentity(LoginUser)
    async presentableDetail(ctx) {

        const nodeId = ctx.checkQuery('nodeId').exist().isInt().gt(0).value;
        const resourceId = ctx.checkQuery('resourceId').optional().isResourceId().value;
        const resourceName = ctx.checkQuery('resourceName').optional().isFullResourceName().value;
        const presentableName = ctx.checkQuery('presentableName').optional().isPresentableName().value;
        const projection = ctx.checkQuery('projection').optional().toSplitArray().default([]).value;
        const isLoadPolicyInfo = ctx.checkQuery('isLoadPolicyInfo').optional().toInt().in([0, 1]).value;
        const isLoadVersionProperty = ctx.checkQuery("isLoadVersionProperty").optional().toInt().default(0).in([0, 1]).value;
        const isLoadCustomPropertyDescriptors = ctx.checkQuery("isLoadCustomPropertyDescriptors").optional().toInt().default(0).in([0, 1]).value;
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

        let presentableInfo: any = await this.presentableService.findOne(condition, projection.join(' ')).then(ctx.success);
        if (presentableInfo && (isLoadVersionProperty || isLoadCustomPropertyDescriptors)) {
            presentableInfo = await this.presentableService.fillPresentableVersionProperty([presentableInfo], isLoadCustomPropertyDescriptors, isLoadCustomPropertyDescriptors).then(first);
        }
        if (presentableInfo && isLoadPolicyInfo) {
            presentableInfo = await this.presentableService.fillPresentablePolicyInfo([presentableInfo]).then(first);
        }
        ctx.success(presentableInfo);
    }

    @get('/:presentableId')
    @visitorIdentity(InternalClient | LoginUser)
    async show(ctx) {

        const presentableId = ctx.checkParams("presentableId").isPresentableId().value;
        const isLoadPolicyInfo = ctx.checkQuery('isLoadPolicyInfo').optional().toInt().in([0, 1]).value;
        const isLoadVersionProperty = ctx.checkQuery("isLoadVersionProperty").optional().toInt().default(0).in([0, 1]).value;
        const isLoadCustomPropertyDescriptors = ctx.checkQuery("isLoadCustomPropertyDescriptors").optional().toInt().default(0).in([0, 1]).value;
        const projection = ctx.checkQuery('projection').optional().toSplitArray().default([]).value;
        ctx.validateParams();

        let presentableInfo: any = await this.presentableService.findById(presentableId, projection.join(' '));
        if (presentableInfo && (isLoadVersionProperty || isLoadCustomPropertyDescriptors)) {
            presentableInfo = await this.presentableService.fillPresentableVersionProperty([presentableInfo], isLoadCustomPropertyDescriptors, isLoadCustomPropertyDescriptors).then(first);
        }
        if (presentableInfo && isLoadPolicyInfo) {
            presentableInfo = await this.presentableService.fillPresentablePolicyInfo([presentableInfo]).then(first);
        }
        ctx.success(presentableInfo);
    }

    @get('/:presentableId/dependencyTree')
    async dependencyTree(ctx) {

        const presentableId = ctx.checkParams("presentableId").isPresentableId().value;
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
    async authTree(ctx) {

        const presentableId = ctx.checkParams("presentableId").isPresentableId().value;
        const maxDeep = ctx.checkQuery('maxDeep').optional().toInt().default(100).lt(101).value;
        // 不传则默认从根节点开始,否则从指定的树节点ID开始往下构建依赖树
        const nid = ctx.checkQuery('nid').optional().type('string').value;
        // 与依赖树不同的是presentable授权树没有根节点(节点签约的,不能作为根),所以此参数一般是配合nid一起使用才有正确的效果
        const isContainRootNode = ctx.checkQuery('isContainRootNode').optional().default(true).toBoolean().value;
        const version = ctx.checkQuery('version').optional().is(semver.valid, ctx.gettext('params-format-validate-failed', 'version')).value;
        ctx.validateParams();

        const condition: any = {presentableId};
        if (isString(version)) {
            condition.version = version;
        } else {
            await this.presentableService.findById(presentableId, 'version').then(data => condition.version = data.version);
        }
        const presentableVersionInfo = await this.presentableVersionService.findOne(condition, 'authTree');
        if (!presentableVersionInfo) {
            throw new ArgumentError(ctx.gettext('params-validate-failed', 'version'));
        }

        const presentableAuthTree = this.presentableVersionService.convertPresentableAuthTree(presentableVersionInfo.authTree, nid, isContainRootNode, maxDeep);

        ctx.success(presentableAuthTree);
    }

    /**
     * 策略格式校验
     * @param policies
     * @private
     */
    _policySchemaValidate(policies, mode: 'addPolicy' | 'updatePolicy') {
        const policyValidateResult = this.presentablePolicyValidator.validate(policies || [], mode);
        if (!isEmpty(policyValidateResult.errors)) {
            throw new ArgumentError(this.ctx.gettext('params-format-validate-failed', 'policies'), {
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
        if (!isEmpty(resolveResourcesValidateResult.errors)) {
            throw new ArgumentError(this.ctx.gettext('params-format-validate-failed', 'resolveResources'), {
                errors: resolveResourcesValidateResult.errors
            });
        }
    }
}