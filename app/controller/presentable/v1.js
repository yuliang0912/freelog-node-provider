/**
 * Created by yuliang on 2019/5/5.
 * presentable 面向用户消费策略相关API
 */

'use strict'

const semver = require('semver')
const lodash = require('lodash')
const Controller = require('egg').Controller
const {ArgumentError, ApplicationError} = require('egg-freelog-base/error')
const PresentablePolicyValidator = require('../../extend/json-schema/presentable-policy-validator')
const PresentableResolveReleaseValidator = require('../../extend/json-schema/presentable-resolve-release-validator')
const {presentableVersionLockEvent} = require('../../enum/presentable-events')
const {LoginUser, InternalClient} = require('egg-freelog-base/app/enum/identity-type')

module.exports = class PresentableController extends Controller {

    constructor({app}) {
        super(...arguments)
        this.nodeProvider = app.dal.nodeProvider
        this.presentableProvider = app.dal.presentableProvider
        this.presentableAuthTreeProvider = app.dal.presentableAuthTreeProvider
        this.presentableDependencyTreeProvider = app.dal.presentableDependencyTreeProvider
    }

    /**
     * 展示节点所有的消费方案
     * @param ctx
     * @returns {Promise.<void>}
     */
    async index(ctx) {

        const nodeId = ctx.checkQuery("nodeId").exist().isInt().toInt().value
        const userId = ctx.checkQuery("userId").optional().isInt().gt(0).toInt().value
        const resourceType = ctx.checkQuery('resourceType').optional().isResourceType().value
        const omitResourceType = ctx.checkQuery('omitResourceType').optional().isResourceType().value
        const tags = ctx.checkQuery('tags').optional().toSplitArray().len(1, 20).value
        const isOnline = ctx.checkQuery('isOnline').optional().toInt().default(1).value
        const page = ctx.checkQuery("page").optional().default(1).toInt().gt(0).value
        const pageSize = ctx.checkQuery("pageSize").optional().default(10).gt(0).lt(101).toInt().value
        const order = ctx.checkQuery("order").optional().in(['isOnline']).value
        const asc = ctx.checkQuery("asc").optional().default(0).in([0, 1]).value
        const projection = ctx.checkQuery('projection').optional().toSplitArray().default([]).value
        const keywords = ctx.checkQuery('keywords').optional().type('string').len(1, 100).value
        const isLoadingResourceInfo = ctx.checkQuery("isLoadingResourceInfo").optional().default(0).in([0, 1]).value
        ctx.validateParams()

        const condition = {nodeId}
        if (resourceType) { //resourceType 与 omitResourceType互斥
            condition['releaseInfo.resourceType'] = resourceType
        }
        else if (omitResourceType) {
            condition['releaseInfo.resourceType'] = {$ne: omitResourceType}
        }
        if (tags) {
            condition.userDefinedTags = {$in: tags}
        }
        if (userId) {
            condition.userId = userId
        }
        if (isOnline === 0 || isOnline === 1) {
            condition.isOnline = isOnline
        }
        if (lodash.isString(keywords)) {
            let searchExp = {$regex: keywords, $options: 'i'}
            condition.$or = [{presentableName: searchExp}, {'releaseInfo.releaseName': searchExp}]
        }

        var presentableList = []
        const totalItem = await this.presentableProvider.count(condition)
        if (totalItem > (page - 1) * pageSize) {
            presentableList = await this.presentableProvider.findPageList(condition, page, pageSize, projection.join(' '), {createDate: -1})
        }
        if (!presentableList.length) {
            return ctx.success({page, pageSize, totalItem, dataList: presentableList})
        }

        const allReleaseIds = lodash.chain(presentableList).map(x => x.releaseInfo.releaseId).uniq().value()
        const releaseMap = await ctx.curlIntranetApi(`${ctx.webApi.releaseInfo}/list?releaseIds=${allReleaseIds}&projection=resourceVersions,previewImages`)
            .then(dataList => new Map(dataList.map(x => [x.releaseId, x])))

        const presentableMap = new Map(), resourceIds = []
        presentableList = presentableList.map(presentableInfo => {
            let model = presentableInfo.toObject()
            let {presentableId, releaseInfo} = model
            let {previewImages = [], resourceVersions = []} = releaseMap.get(releaseInfo.releaseId)
            let {resourceId} = resourceVersions.find(x => x.version === releaseInfo.version) || {}
            releaseInfo.previewImages = previewImages
            releaseInfo.versions = resourceVersions.map(x => x.version)
            if (resourceId) {
                presentableMap.set(presentableId, resourceId)
                resourceIds.push(resourceId)
            }
            return model
        })

        if (!isLoadingResourceInfo) {
            return ctx.success({page, pageSize, totalItem, dataList: presentableList})
        }

        const resourceMap = await ctx.curlIntranetApi(`${ctx.webApi.resourceInfo}/list?resourceIds=${resourceIds.toString()}`)
            .then(resources => new Map(resources.map(resourceInfo => [resourceInfo.resourceId, resourceInfo])))

        const resourceFiled = ['userId', 'userName', 'resourceName', 'resourceType', 'meta', 'previewImages', 'createDate', 'updateDate']

        presentableList.forEach(presentableInfo => {
            let resourceId = presentableMap.get(presentableInfo.presentableId)
            presentableInfo.resourceInfo = lodash.pick(resourceMap.get(resourceId), resourceFiled)
        })

        ctx.success({page, pageSize, totalItem, dataList: presentableList})
    }

    /**
     * 获取presentable列表
     * @param ctx
     * @returns {Promise<void>}
     */
    async list(ctx) {

        const userId = ctx.checkQuery('userId').optional().toInt().gt(0).value
        const nodeId = ctx.checkQuery('nodeId').optional().toInt().gt(0).value
        const presentableIds = ctx.checkQuery('presentableIds').optional().isSplitMongoObjectId().toSplitArray().len(1, 100).value
        const releaseIds = ctx.checkQuery('releaseIds').optional().isSplitMongoObjectId().toSplitArray().len(1, 100).value
        const releaseNames = ctx.checkQuery('releaseNames').optional().toSplitArray().len(1, 100).value
        const projection = ctx.checkQuery('projection').optional().toSplitArray().default([]).value
        ctx.validateParams()

        const condition = {}
        if (userId) {
            condition.userId = userId
        }
        if (nodeId) {
            condition.nodeId = nodeId
        }
        if (presentableIds) {
            condition._id = {$in: presentableIds}
        }
        if (releaseIds) {
            condition['releaseInfo.releaseId'] = {$in: releaseIds}
        }
        if (releaseNames) {
            condition['releaseInfo.releaseName'] = {$in: releaseNames}
        }

        if (!releaseIds && !presentableIds && !releaseNames) {
            throw new ArgumentError(ctx.gettext('params-required-validate-failed', 'presentableIds,releaseIds,releaseNames'))
        }

        await this.presentableProvider.find(condition, projection.join(' ')).then(ctx.success)
    }

    /**
     * 展示presentable详情
     * @param ctx
     * @returns {Promise.<void>}
     */
    async show(ctx) {

        const presentableId = ctx.checkParams("id").isPresentableId().value
        const isLoadingResourceInfo = ctx.checkQuery("isLoadingResourceInfo").optional().default(0).in([0, 1]).value
        ctx.validateParams()

        var presentableInfo = await this.presentableProvider.findById(presentableId)
        if (!presentableInfo) {
            return ctx.success(presentableInfo)
        }

        const {releaseId, version} = presentableInfo.releaseInfo || {}
        await ctx.curlIntranetApi(`${ctx.webApi.releaseInfo}/${releaseId}`).then(releaseInfo => {
            presentableInfo = presentableInfo.toObject()
            let {intro = '', previewImages = [], resourceVersions = []} = releaseInfo
            presentableInfo.releaseInfo.intro = intro
            presentableInfo.releaseInfo.previewImages = previewImages
            presentableInfo.releaseInfo.versions = resourceVersions.map(x => x.version)
        })

        if (isLoadingResourceInfo) {
            const resourceFiled = ['userId', 'userName', 'resourceName', 'resourceType', 'meta', 'previewImages', 'createDate', 'updateDate']
            await ctx.curlIntranetApi(`${ctx.webApi.releaseInfo}/${releaseId}/versions/${version}/resource`).then(resourceInfo => {
                presentableInfo.resourceInfo = lodash.pick(resourceInfo, resourceFiled)
            })
        }

        ctx.success(presentableInfo)
    }

    /**
     * 创建节点消费方案
     * @param ctx
     * @returns {Promise.<void>}
     */
    async create(ctx) {

        const nodeId = ctx.checkBody('nodeId').toInt().gt(0).value
        const releaseId = ctx.checkBody('releaseId').isReleaseId().value
        const resolveReleases = ctx.checkBody('resolveReleases').exist().isArray().value
        const policies = ctx.checkBody('policies').optional().default([]).isArray().value
        const userDefinedTags = ctx.checkBody('userDefinedTags').optional().isArray().len(0, 20).value
        const intro = ctx.checkBody('intro').optional().type('string').default('').len(0, 500).value
        const presentableName = ctx.checkBody('presentableName').optional().type('string').isPresentableName().value
        const version = ctx.checkBody('version').exist().is(semver.valid, ctx.gettext('params-format-validate-failed', 'version')).value
        ctx.validateParams().validateVisitorIdentity(LoginUser)

        this._validateResolveReleasesParamFormat(resolveReleases)
        const policiesValidateResult = new PresentablePolicyValidator().createReleasePoliciesValidate(policies)
        if (policiesValidateResult.errors.length) {
            throw new ArgumentError(ctx.gettext('params-format-validate-failed', 'policies'), {policiesValidateResult})
        }

        const nodeInfo = await this.nodeProvider.findOne({nodeId}).tap(model => ctx.entityNullValueAndUserAuthorizationCheck(model, {
            property: 'ownerUserId',
            msg: ctx.gettext('params-validate-failed', 'nodeId'),
        }))

        await this.presentableProvider.findOne({'releaseInfo.releaseId': releaseId, nodeId}, '_id').then(exist => {
            if (exist) {
                throw new ApplicationError(ctx.gettext('presentable-release-repetition-create-error'))
            }
        })

        const releaseInfo = await ctx.curlIntranetApi(`${ctx.webApi.releaseInfo}/${releaseId}`)
        if (!releaseInfo || releaseInfo.status === 0) {
            throw new ApplicationError(ctx.gettext('params-validate-failed', 'releaseId'), {releaseInfo})
        }
        if (!releaseInfo.resourceVersions.some(x => x.version === version)) {
            throw new ApplicationError(ctx.gettext('params-validate-failed', 'version'), {version})
        }

        const newPresentableName = await this._generatePresentableName(nodeId, presentableName)
        await ctx.service.presentableService.createPresentable({
            releaseInfo, resolveReleases, version, policies, nodeInfo, intro, userDefinedTags,
            presentableName: newPresentableName
        }).then(ctx.success)
    }

    /**
     * 更新presentable
     * @param ctx
     * @returns {Promise<void>}
     */
    async update(ctx) {

        const presentableId = ctx.checkParams("id").exist().isMongoObjectId().value
        const policyInfo = ctx.checkBody('policyInfo').optional().isObject().value
        const presentableName = ctx.checkBody('presentableName').optional().isPresentableName().value
        const userDefinedTags = ctx.checkBody('userDefinedTags').optional().isArray().value
        const resolveReleases = ctx.checkBody('resolveReleases').optional().isArray().value
        const intro = ctx.checkBody('intro').optional().type('string').len(0, 500).value
        ctx.validateParams().validateVisitorIdentity(LoginUser)

        if ([policyInfo, presentableName, userDefinedTags, resolveReleases, intro].every(x => x === undefined)) {
            throw new ArgumentError(ctx.gettext('params-required-validate-failed'))
        }
        if (resolveReleases) {
            this._validateResolveReleasesParamFormat(resolveReleases)
        }
        if (policyInfo) {
            const result = new PresentablePolicyValidator().updateReleasePoliciesValidate(policyInfo)
            if (result.errors.length) {
                throw new ArgumentError(ctx.gettext('params-format-validate-failed'), {error: result.errors})
            }
        }

        const presentableInfo = await this.presentableProvider.findById(presentableId).tap(model => ctx.entityNullValueAndUserAuthorizationCheck(model, {
            msg: ctx.gettext('params-validate-failed', 'presentableId')
        }))

        await ctx.service.presentableService.updatePresentable({
            presentableInfo, policyInfo, presentableName, userDefinedTags, resolveReleases, intro
        }).then(ctx.success)
    }

    /**
     * 通过发行查找节点的presentable
     * @returns {Promise<void>}
     */
    async detail(ctx) {

        const nodeId = ctx.checkQuery('nodeId').isInt().gt(0).value
        const releaseId = ctx.checkQuery('releaseId').optional().isReleaseId().value
        const releaseName = ctx.checkQuery('releaseName').optional().isFullReleaseName().value
        const presentableName = ctx.checkQuery('presentableName').optional().isPresentableName().value
        ctx.validateParams()

        if (!releaseId && !releaseName && !presentableName) {
            throw new ArgumentError(ctx.gettext('params-required-validate-failed', 'releaseId,releaseName,presentableName'))
        }

        const condition = {nodeId}
        if (releaseId) {
            condition['releaseInfo.releaseId'] = releaseId
        }
        if (releaseName) {
            condition['releaseInfo.releaseName'] = releaseName
        }
        if (presentableName) {
            condition['presentableName'] = presentableName
        }

        await this.presentableProvider.findOne(condition).then(ctx.success)
    }

    /**
     * 切换presentable上线状态(上线或下线)
     * @returns {Promise<void>}
     */
    async switchOnlineState(ctx) {

        const presentableId = ctx.checkParams("presentableId").exist().isPresentableId().value
        const onlineState = ctx.checkBody("onlineState").exist().toInt().in([0, 1]).value
        ctx.validateParams().validateVisitorIdentity(LoginUser)

        const presentableInfo = await this.presentableProvider.findById(presentableId).tap(model => ctx.entityNullValueAndUserAuthorizationCheck(model, {
            msg: ctx.gettext('params-validate-failed', 'presentableId')
        }))

        if (presentableInfo.isOnline === onlineState) {
            return ctx.success(true)
        }

        await ctx.service.presentableService.switchPresentableOnlineState(presentableInfo, onlineState).then(ctx.success)
    }

    /**
     * 切换presentable版本
     * @param ctx
     * @returns {Promise<void>}
     */
    async switchPresentableVersion(ctx) {

        const presentableId = ctx.checkParams("presentableId").exist().isPresentableId().value
        const version = ctx.checkBody('version').exist().is(semver.valid, ctx.gettext('params-format-validate-failed', 'version')).value
        ctx.validateParams().validateVisitorIdentity(LoginUser)

        const presentableInfo = await this.presentableProvider.findById(presentableId).tap(model => ctx.entityNullValueAndUserAuthorizationCheck(model, {
            msg: ctx.gettext('params-validate-failed', 'presentableId'),
        }))

        const releaseInfo = await ctx.curlIntranetApi(`${ctx.webApi.releaseInfo}/${presentableInfo.releaseInfo.releaseId}`)
        if (!releaseInfo.resourceVersions.some(x => x.version === version)) {
            throw new ApplicationError(ctx.gettext('params-validate-failed', 'version'), {version})
        }

        await presentableInfo.updateOne({'releaseInfo.version': version}).then(() => {
            presentableInfo.releaseInfo.version = version
            ctx.app.emit(presentableVersionLockEvent, presentableInfo)
        })

        ctx.success(true)
    }

    /**
     * presentable授权链基础信息(包含节点和发行所关联的合约以及层级关系)
     * @returns {Promise<void>}
     */
    async presentableAuthChainInfo(ctx) {

        const presentableId = ctx.checkParams("presentableId").exist().isMongoObjectId().value
        ctx.validateParams().validateVisitorIdentity(LoginUser | InternalClient)

        const presentableInfo = await this.presentableProvider.findById(presentableId).tap(model => ctx.entityNullObjectCheck(model, {
            msg: ctx.gettext('params-validate-failed', 'presentableId'),
            data: {presentableId}
        }))

        const presentableAuthTreeInfo = await this.presentableAuthTreeProvider.findOne({presentableId})
        const presentableBaseInfo = lodash.pick(presentableInfo, ['userId', 'presentableName', 'resolveReleases'])
        const presentableAuthTreeBaseInfo = lodash.pick(presentableAuthTreeInfo, ['presentableId', 'nodeId', 'masterReleaseId', 'version'])

        ctx.success(Object.assign(presentableBaseInfo, presentableAuthTreeBaseInfo, {
            schemeResolveReleases: presentableAuthTreeInfo.authTree
        }))
    }

    /**
     * presentable授权树
     * @param ctx
     * @returns {Promise<void>}
     */
    async presentableAuthTree(ctx) {

        const presentableId = ctx.checkParams("presentableId").exist().isMongoObjectId().value
        ctx.validateParams().validateVisitorIdentity(LoginUser | InternalClient)

        const presentableAuthTree = await this.presentableAuthTreeProvider.findOne({presentableId})

        if (!presentableAuthTree) {
            const presentableInfo = await this.presentableProvider.findById(presentableId)
            if (presentableInfo) { //如果生成失败,则获取的时候再次构建
                ctx.app.emit(presentableVersionLockEvent, presentableInfo)
            }
        }

        ctx.success(presentableAuthTree)
    }

    /**
     * presentable依赖树
     * @param ctx
     * @returns {Promise<void>}
     */
    async presentableDependencyTree(ctx) {

        var presentableId = ctx.checkParams("presentableId").exist().isMongoObjectId().value
        var maxDeep = ctx.checkQuery('maxDeep').optional().toInt().default(100).lt(101).value
        //不传则默认从根节点开始,否则从指定的树节点ID开始往下构建依赖树
        var entityNid = ctx.checkQuery('entityNid').optional().type('string').len(12, 12).default("").value
        var isContainRootNode = ctx.checkQuery('isContainRootNode').optional().default(true).toBoolean().value
        var version = ctx.checkQuery('version').optional().is(semver.valid, ctx.gettext('params-format-validate-failed', 'version')).value

        ctx.validateParams().validateVisitorIdentity(LoginUser | InternalClient)

        const condition = {presentableId}
        if (version) {
            condition.version = version
        } else {
            let presentableInfo = await this.presentableProvider.findById(presentableId, 'releaseInfo').tap(model => ctx.entityNullObjectCheck(model))
            condition.version = presentableInfo.releaseInfo.version
        }
        if (!entityNid) {
            entityNid = presentableId.substr(0, 12)
        }

        const dependencyTreeInfo = await this.presentableDependencyTreeProvider.findOne(condition)
        if (!dependencyTreeInfo) {
            return ctx.success([])
        }

        const {dependencyTree} = dependencyTreeInfo.toObject()
        const dependencies = ctx.service.presentableService.buildPresentableDependencyTree(dependencyTree, entityNid, isContainRootNode, maxDeep)

        ctx.success(dependencies)
    }

    /**
     * 检索presentable树节点
     * @param ctx
     * @returns {Promise<void>}
     */
    async searchPresentableDependency(ctx) {

        const nodeId = ctx.checkQuery('nodeId').toInt().gt(0).value
        const page = ctx.checkQuery("page").optional().default(1).gt(0).toInt().value
        const pageSize = ctx.checkQuery("pageSize").optional().default(10).gt(0).lt(101).toInt().value
        const releaseName = ctx.checkQuery("releaseName").exist().isFullReleaseName().value
        const versionRange = ctx.checkQuery('versionRange').optional().toVersionRange(ctx.gettext('params-format-validate-failed', 'versionRange')).value
        ctx.validateParams().validateVisitorIdentity(LoginUser | InternalClient)

        const releaseInfo = await ctx.curlIntranetApi(`${ctx.webApi.releaseInfo}/detail?releaseName=${releaseName}`)
        ctx.entityNullObjectCheck(releaseInfo, ctx.gettext('params-validate-failed', 'releaseName'))

        const {releaseId, resourceVersions} = releaseInfo
        const matchedVersions = (!versionRange ? resourceVersions : resourceVersions.filter(x => semver.satisfies(x.version, versionRange))).map(x => x.version)
        if (!matchedVersions.length) {
            throw new ArgumentError(ctx.gettext('params-validate-error', 'versionRange'))
        }

        const searchCondition = {
            nodeId, 'dependencyTree.releaseId': releaseId, 'dependencyTree.version': {$in: matchedVersions}
        }

        var matchedPresentables = []
        const totalItem = await this.presentableDependencyTreeProvider.count(searchCondition)
        if (totalItem > (page - 1) * pageSize) {
            matchedPresentables = await this.presentableDependencyTreeProvider.findPageList(searchCondition, page, pageSize, 'presentableId', {createDate: -1})
        }
        if (!matchedPresentables.length) {
            return ctx.success({page, pageSize, totalItem, dataList: []})
        }

        const presentables = await this.presentableProvider.find({_id: {$in: matchedPresentables.map(x => x.presentableId)}}, 'presentableName releaseInfo')

        const dataList = presentables.map(x => Object({
            presentableId: x.presentableId,
            presentableName: x.presentableName,
            version: x.releaseInfo.version
        }))

        ctx.success({page, pageSize, totalItem, dataList})
    }

    /**
     * 批量获取presentable授权树
     * @param ctx
     * @returns {Promise<void>}
     */
    async batchPresentableAuthTrees(ctx) {

        const presentableIds = ctx.checkQuery('presentableIds').exist().isSplitMongoObjectId().toSplitArray().len(1, 100).value
        ctx.validateParams().validateVisitorIdentity(LoginUser | InternalClient)

        const presentableAuthTrees = await this.presentableAuthTreeProvider.find({presentableId: {$in: presentableIds}})

        const losePresentableIds = lodash.differenceWith(presentableIds, presentableAuthTrees, (x, y) => x === y.presentableId)
        if (losePresentableIds.length) {
            this.presentableProvider.find({_id: {$in: losePresentableIds}}).then(list => {
                list.forEach(presentableInfo => {
                    ctx.app.emit(presentableVersionLockEvent, presentableInfo)
                })
            })
        }

        ctx.success(presentableAuthTrees)
    }

    /**
     * 重新构建presentable依赖树,授权树(开发使用)
     * @param ctx
     * @returns {Promise<void>}
     */
    async rebuildPresentableDependencyTree(ctx) {

        const nodeId = ctx.checkQuery('nodeId').optional().toInt().gt(0).value
        const presentableId = ctx.checkQuery('presentableId').optional().isPresentableId().value
        const ownerUserId = ctx.checkQuery('ownerUserId').optional().toInt().gt(0).value
        ctx.validateParams().validateVisitorIdentity(LoginUser)

        const condition = {}
        if (nodeId) {
            condition.nodeId = nodeId
        }
        if (presentableId) {
            condition['_id'] = presentableId
        }
        if (ownerUserId) {
            condition.ownerUserId = ownerUserId
        }

        await this.presentableProvider.find(condition).each(presentable => {
            ctx.app.emit(presentableVersionLockEvent, presentable)
        }).then(x => ctx.success(x.map(m => m.presentableId)))
    }

    /**
     * 修复数据
     * @param ctx
     * @returns {Promise<void>}
     */
    async rebuildPresentablePreviewImages(ctx) {

        const presentables = await this.presentableProvider.find({})

        presentables.forEach(presentable => {
            ctx.curlIntranetApi(`${ctx.webApi.releaseInfo}/${presentable.releaseInfo.releaseId}`).then(releaseInfo => {
                if (releaseInfo) {
                    let startIndex = presentable.presentableName.indexOf('/')
                    let model = {previewImages: releaseInfo.previewImages}
                    if (startIndex > -1) {
                        model.presentableName = presentable.presentableName.substr(startIndex + 1)
                    }
                    presentable.updateOne(model).then()
                }
            })
        })

        ctx.success(presentables.map(x => x.presentableId))
    }

    /**
     * 生成presentableName
     * @param nodeId
     * @param presentableName
     * @private
     */
    async _generatePresentableName(nodeId, releaseName) {

        const presentableNames = await this.presentableProvider.find({
            nodeId, presentableName: new RegExp(`^${releaseName.trim()}`, 'i')
        }, 'presentableName')

        if (!presentableNames.length || !presentableNames.some(x => x.presentableName.toUpperCase() === releaseName.toUpperCase())) {
            return releaseName
        }

        for (let i = 0; i < presentableNames.length; i++) {
            let newReleaseName = `${releaseName}(${i + 1})`
            if (presentableNames.some(x => x.presentableName.toUpperCase() === newReleaseName.toUpperCase())) {
                continue
            }
            return newReleaseName
        }
    }

    /**
     * 校验处理解决的发行数据格式
     * @param resolveReleases
     * @private
     */
    _validateResolveReleasesParamFormat(resolveReleases) {

        const {ctx} = this
        const resolveReleasesValidateResult = new PresentableResolveReleaseValidator().resolveReleasesValidate(resolveReleases)
        if (resolveReleasesValidateResult.errors.length) {
            throw new ArgumentError(ctx.gettext('params-format-validate-failed', 'resolveReleases'), {
                errors: resolveReleasesValidateResult.errors
            })
        }
    }
}