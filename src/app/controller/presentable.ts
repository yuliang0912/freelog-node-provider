import * as semver from 'semver';
import {isString, chain, isUndefined, isEmpty} from 'lodash';
import {controller, inject, get, post, put, provide} from 'midway';
import {visitorIdentity} from '../../extend/vistorIdentityDecorator';
import {LoginUser, InternalClient, ArgumentError} from 'egg-freelog-base';
import {
    IJsonSchemaValidate, INodeService,
    IOutsideApiService, IPresentableService, IPresentableVersionService
} from '../../interface';

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
    presentableVersionService: IPresentableVersionService;
    @inject()
    resolveResourcesValidator: IJsonSchemaValidate;
    @inject()
    presentablePolicyValidator: IJsonSchemaValidate;

    @get('/')
    @visitorIdentity(InternalClient | LoginUser)
    async index(ctx) {
        const nodeId = ctx.checkQuery('nodeId').exist().toInt().value;
        const resourceType = ctx.checkQuery('resourceType').optional().isResourceType().value;
        const omitResourceType = ctx.checkQuery('omitResourceType').optional().isResourceType().value;
        const tags = ctx.checkQuery('tags').optional().toSplitArray().len(1, 20).value;
        const onlineStatus = ctx.checkQuery('onlineStatus').optional().toInt().default(1).value;
        const page = ctx.checkQuery('page').optional().default(1).toInt().gt(0).value;
        const pageSize = ctx.checkQuery('pageSize').optional().default(10).gt(0).lt(101).toInt().value;
        const keywords = ctx.checkQuery('keywords').optional().type('string').len(1, 100).value;
        const isLoadingResourceInfo = ctx.checkQuery("isLoadingResourceInfo").optional().toInt().in([0, 1]).default(0).value;
        const projection: string[] = ctx.checkQuery('projection').optional().toSplitArray().default([]).value;
        ctx.validateParams();

        const condition: any = {nodeId};
        if (resourceType) { //resourceType 与 omitResourceType互斥
            condition['resourceInfo.resourceType'] = resourceType;
        } else if (omitResourceType) {
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
        const pageResult = await this.presentableService.findPageList(condition, page, pageSize, projection, {createDate: -1})

        if (!pageResult.dataList.length || !isLoadingResourceInfo) {
            return ctx.success(pageResult);
        }

        const allResourceIds = chain(pageResult.dataList).map(x => x.resourceInfo.resourceId).uniq().value();
        const resourceVersionsMap = await ctx.curlIntranetApi(`${ctx.webApi.resourceInfoV2}/list?resourceIds=${allResourceIds}&projection=resourceVersions`)
            .then(dataList => new Map(dataList.map(x => [x.resourceId, x.resourceVersions])));

        pageResult.dataList = pageResult.dataList.map(presentableInfo => {
            const model = presentableInfo.toObject();
            const resourceVersions = resourceVersionsMap.get(model.resourceInfo.resourceId);
            model.resourceInfo.versions = resourceVersions.map(x => x.version);
            return model
        });

        ctx.success(pageResult);
    }

    @post('/')
    @visitorIdentity(LoginUser)
    async create(ctx) {

        const nodeId = ctx.checkBody('nodeId').exist().toInt().gt(0).value;
        const resourceId = ctx.checkBody('resourceId').isResourceId().value;
        const resolveResources = ctx.checkBody('resolveResources').exist().isArray().value;
        const policies = ctx.checkBody('policies').optional().default([]).isArray().value;
        const tags = ctx.checkBody('tags').optional().isArray().len(0, 20).value;
        const presentableName = ctx.checkBody('presentableName').exist().type('string').isPresentableName().value;
        const version = ctx.checkBody('version').exist().is(semver.valid, ctx.gettext('params-format-validate-failed', 'version')).value;
        ctx.validateParams();

        this._policySchemaValidate(policies);
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

    /**
     * 更新presentable
     * @param ctx
     * @returns {Promise<void>}
     */
    @put('/:presentableId')
    @visitorIdentity(LoginUser)
    async update(ctx) {

        const presentableId = ctx.checkParams("presentableId").exist().isPresentableId().value;
        const presentableTitle = ctx.checkBody('presentableTitle').optional().type('string').value;
        const tags = ctx.checkBody('tags').optional().isArray().value;
        const resolveResources = ctx.checkBody('resolveResources').optional().isArray().value;
        const updatePolicies = ctx.checkBody('updatePolicies').optional().isArray().len(1).value;
        const addPolicies = ctx.checkBody('addPolicies').optional().isArray().len(1).value;
        ctx.validateParams();

        if ([updatePolicies, addPolicies, presentableTitle, tags, resolveResources].every(isUndefined)) {
            throw new ArgumentError(ctx.gettext('params-required-validate-failed'));
        }

        this._policySchemaValidate(addPolicies);
        this._policySchemaValidate(updatePolicies);
        this._resolveResourcesSchemaValidate(resolveResources);

        const presentableInfo = await this.presentableService.findById(presentableId);
        ctx.entityNullValueAndUserAuthorizationCheck(presentableInfo, {
            msg: ctx.gettext('params-validate-failed', 'presentableId')
        });

        await this.presentableService.updatePresentable(presentableInfo, {
            addPolicies, updatePolicies, presentableTitle, resolveResources, tags
        }).then(ctx.success);
    }


    @get('/detail')
    @visitorIdentity(LoginUser)
    async detail(ctx) {

        const nodeId = ctx.checkQuery('nodeId').exist().isInt().gt(0).value;
        const resourceId = ctx.checkQuery('resourceId').optional().isResourceId().value;
        const resourceName = ctx.checkQuery('resourceName').optional().isFullResourceName().value;
        const presentableName = ctx.checkQuery('presentableName').optional().isPresentableName().value;
        const projection: string[] = ctx.checkQuery('projection').optional().toSplitArray().default([]).value;
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

        await this.presentableService.findOne(condition, projection.join(' ')).then(ctx.success);
    }

    /**
     * 展示presentable详情
     * @param ctx
     * @returns {Promise.<void>}
     */
    @get('/:presentableId')
    @visitorIdentity(InternalClient | LoginUser)
    async show(ctx) {

        const presentableId = ctx.checkParams("presentableId").isPresentableId().value;
        const isLoadingVersionProperty = ctx.checkQuery("isLoadingVersionProperty").optional().default(0).in([0, 1]).value;
        const projection: string[] = ctx.checkQuery('projection').optional().toSplitArray().default([]).value;

        ctx.validateParams();

        let presentableInfo: any = await this.presentableService.findById(presentableId, projection.join(' '));
        if (presentableInfo && isLoadingVersionProperty) {
            presentableInfo = presentableInfo.toObject();
            await this.presentableVersionService.findById(presentableId, presentableInfo.version, 'versionProperty').then(data => {
                presentableInfo.versionProperty = data?.versionProperty ?? {};
            });
        }
        ctx.success(presentableInfo);
    }

    /**
     * 展品依赖树
     * @param ctx
     */
    @get('/:presentableId/dependencyTree')
    async dependencyTree(ctx) {

        const presentableId = ctx.checkParams("presentableId").isPresentableId().value;
        const maxDeep = ctx.checkQuery('maxDeep').optional().toInt().default(100).lt(101).value;
        //不传则默认从根节点开始,否则从指定的树节点ID开始往下构建依赖树
        const entityNid = ctx.checkQuery('entityNid').optional().len(12, 12).default(presentableId.substr(0, 12)).value;
        const isContainRootNode = ctx.checkQuery('isContainRootNode').optional().default(true).toBoolean().value;
        const version = ctx.checkQuery('version').optional().is(semver.valid, ctx.gettext('params-format-validate-failed', 'version')).value;
        ctx.validateParams();

        const condition: any = {presentableId};
        if (isString(version)) {
            condition.version = version;
        } else {
            await this.presentableService.findById(presentableId, 'version').then(data => condition.version = data.version);
        }
        const presentableVersionInfo = await this.presentableVersionService.findOne(condition, 'dependencyTree');
        if (!presentableVersionInfo) {
            throw new ArgumentError(ctx.gettext('params-validate-failed', 'version'));
        }

        const presentableDependencies = this.presentableVersionService.buildPresentableDependencyTree(presentableVersionInfo.dependencyTree, entityNid, isContainRootNode, maxDeep);

        ctx.success(presentableDependencies);
    }


    /**
     * 策略格式校验
     * @param policies
     * @private
     */
    _policySchemaValidate(policies) {
        const policyValidateResult = this.presentablePolicyValidator.validate(policies || []);
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