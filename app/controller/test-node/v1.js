'use strict'

const lodash = require('lodash')
const semver = require('semver')
const Controller = require('egg').Controller
const {ArgumentError} = require('egg-freelog-base/error')
const {LoginUser, UnLoginUser, InternalClient} = require('egg-freelog-base/app/enum/identity-type')
const PresentableResolveReleaseValidator = require('../../extend/json-schema/presentable-resolve-release-validator')

module.exports = class TestNodeController extends Controller {

    constructor({app}) {
        super(...arguments)
        this.nodeProvider = app.dal.nodeProvider
        this.nodeTestRuleProvider = app.dal.nodeTestRuleProvider
        this.nodeTestResourceProvider = app.dal.nodeTestResourceProvider
        this.testResourceAuthTreeProvider = app.dal.testResourceAuthTreeProvider
        this.testResourceDependencyTreeProvider = app.dal.testResourceDependencyTreeProvider
    }

    /**
     * 展示测试节点规则信息
     * @param ctx
     * @returns {Promise<void>}
     */
    async show(ctx) {

        const nodeId = ctx.checkParams('id').isInt().gt(0).value
        ctx.validateParams().validateVisitorIdentity(UnLoginUser | InternalClient | LoginUser)

        await this.nodeTestRuleProvider.findOne({nodeId}).then(ctx.success)
    }

    /**
     * 保存节点测试规则(自动匹配结果)
     * @param ctx
     * @returns {Promise<void>}
     */
    async create(ctx) {

        var nodeId = ctx.checkBody('nodeId').exist().toInt().gt(0).value
        var testRuleText = ctx.checkBody('testRuleText').exist().type('string').value
        if (testRuleText !== "") {
            testRuleText = ctx.checkBody('testRuleText').isBase64().decodeBase64().value
        }
        // ctx.request.userId = 50018
        // ctx.request.identityInfo.userInfo = {userId: 50018, username: 'gu'}
        ctx.validateParams().validateVisitorIdentity(UnLoginUser | InternalClient | LoginUser)

        await this._validateNodeIdentity(ctx, nodeId)
        await ctx.service.testRuleService.matchAndSaveNodeTestRule(nodeId, testRuleText).then(ctx.success)
    }

    /**
     * 追加测试规则(自动保存结果)
     * @param ctx
     * @returns {Promise<void>}
     */
    async additionalTestRule(ctx) {

        const nodeId = ctx.checkParams('nodeId').exist().toInt().gt(0).value
        const testRuleText = ctx.checkBody('testRuleText').exist().type('string').isBase64().decodeBase64().value
        ctx.validateParams().validateVisitorIdentity(UnLoginUser | InternalClient | LoginUser)

        await this._validateNodeIdentity(ctx, nodeId)
        const nodeTestRule = await this.nodeTestRuleProvider.findOne({nodeId}, 'ruleText')
        const currentRuleText = nodeTestRule ? nodeTestRule.ruleText + ` ${testRuleText}` : testRuleText

        await ctx.service.testRuleService.matchAndSaveNodeTestRule(nodeId, currentRuleText).then(ctx.success)
    }

    /**
     * 匹配测试资源
     * @param ctx
     * @returns {Promise<void>}
     */
    async matchTestResources(ctx) {

        const nodeId = ctx.checkParams('nodeId').exist().toInt().gt(0).value
        ctx.validateParams().validateVisitorIdentity(UnLoginUser | InternalClient | LoginUser)

        await this._validateNodeIdentity(ctx, nodeId)
        const nodeTestRule = await this.nodeTestRuleProvider.findOne({nodeId}, 'ruleText')
        const ruleText = nodeTestRule ? nodeTestRule.ruleText : ''

        await ctx.service.testRuleService.matchAndSaveNodeTestRule(nodeId, ruleText).then(ctx.success)
    }

    /**
     * 分页获取匹配的测试资源
     * @param ctx
     * @returns {Promise<void>}
     */
    async testResources(ctx) {

        const nodeId = ctx.checkParams('nodeId').exist().toInt().gt(0).value
        const page = ctx.checkQuery("page").optional().default(1).toInt().gt(0).value
        const pageSize = ctx.checkQuery("pageSize").optional().default(10).gt(0).lt(101).toInt().value
        const keywords = ctx.checkQuery('keywords').optional().type('string').len(1, 100).value
        const tags = ctx.checkQuery('tags').optional().toSplitArray().len(1, 20).value
        const resourceType = ctx.checkQuery('resourceType').optional().isResourceType().value
        const isOnline = ctx.checkQuery('isOnline').optional().toInt().default(2).in([0, 1, 2]).value
        const projection = ctx.checkQuery('projection').optional().toSplitArray().default([]).value
        const omitResourceType = ctx.checkQuery('omitResourceType').optional().isResourceType().value
        ctx.validateParams().validateVisitorIdentity(InternalClient | LoginUser)

        await this._validateNodeIdentity(ctx, nodeId)

        var condition = {nodeId}
        if (resourceType) { //resourceType 与 omitResourceType互斥
            condition.resourceType = resourceType
        }
        else if (omitResourceType) {
            condition.resourceType = {$ne: omitResourceType}
        }
        if (tags) {
            condition['differenceInfo.userDefinedTagInfo.tags'] = {$in: tags}
        }
        if (isOnline === 1 || isOnline === 0) {
            condition['differenceInfo.onlineStatusInfo.isOnline'] = isOnline
        }
        if (lodash.isString(keywords)) {
            let searchExp = {$regex: keywords, $options: 'i'}
            condition.$or = [{testResourceName: searchExp}, {'originInfo.name': searchExp}]
        }

        var nodeTestResources = []
        const totalItem = await this.nodeTestResourceProvider.count(condition)
        if (totalItem > (page - 1) * pageSize) {
            nodeTestResources = await this.nodeTestResourceProvider.findPageList(condition, page, pageSize, projection.join(' '))
        }
        ctx.success({page, pageSize, totalItem, dataList: nodeTestResources})
    }

    /**
     * 测试资源依赖树
     * @param ctx
     * @returns {Promise<void>}
     */
    async testResourceDetail(ctx) {

        const testResourceId = ctx.checkParams('testResourceId').exist().isMd5().value
        ctx.validateParams().validateVisitorIdentity(InternalClient | LoginUser)

        await this.nodeTestResourceProvider.findOne({testResourceId}).then(ctx.success)
    }

    /**
     * 搜索测试资源的依赖树
     * @param ctx
     * @returns {Promise<void>}
     */
    async searchTestResource(ctx) {

        const nodeId = ctx.checkParams('nodeId').exist().toInt().gt(0).value
        const dependentEntityId = ctx.checkQuery('dependentEntityId').exist().isMongoObjectId().value
        const dependentEntityVersionRange = ctx.checkQuery('dependentEntityVersionRange').optional().toVersionRange().value
        ctx.validateParams().validateVisitorIdentity(InternalClient | LoginUser)

        const condition = {
            nodeId, 'dependencyTree.id': dependentEntityId
        }

        var testResourceDependencyTrees = await this.testResourceDependencyTreeProvider.find(condition)

        if (dependentEntityVersionRange && dependentEntityVersionRange !== "*") {
            testResourceDependencyTrees = testResourceDependencyTrees.filter(item => {
                return item.dependencyTree.some(x => x.id === dependentEntityId && semver.satisfies(dependentEntityVersionRange, x.version))
            })
        }

        ctx.success(testResourceDependencyTrees.map(x => lodash.pick(x, ['testResourceId', 'testResourceName'])))
    }

    /**
     * 搜索测试资源依赖树
     * @param ctx
     * @returns {Promise<void>}
     */
    async searchTestResourceDependencyTree(ctx) {

        const nodeId = ctx.checkParams('nodeId').exist().toInt().gt(0).value
        const keywords = ctx.checkQuery('keywords').exist().type('string').value

        ctx.validateParams().validateVisitorIdentity(InternalClient | LoginUser)

        let searchRegexp = new RegExp(keywords, 'i')
        const condition = {
            nodeId, 'dependencyTree.name': searchRegexp
        }

        const nodeTestResources = await this.testResourceDependencyTreeProvider.find(condition, 'dependencyTree.name dependencyTree.id dependencyTree.type dependencyTree.version')

        const searchResults = []
        lodash.chain(nodeTestResources).map(x => x.dependencyTree).flattenDeep().filter(x => searchRegexp.test(x.name)).groupBy(x => x.id).forIn((values) => {
            let model = lodash.pick(values[0], ['id', 'name', 'type'])
            model.versions = lodash.uniq(values.map(x => x.version))
            searchResults.push(model)
        }).value()

        ctx.success(searchResults)
    }

    /**
     * 查看测试资源依赖树
     * @param ctx
     * @returns {Promise<void>}
     */
    async testResourceDependencyTree(ctx) {

        const testResourceId = ctx.checkParams('testResourceId').exist().isMd5().value
        ctx.validateParams().validateVisitorIdentity(InternalClient | LoginUser)

        await this.testResourceDependencyTreeProvider.findOne({testResourceId}).then(ctx.success)
    }

    /**
     * 获取presentable依赖树中指定发行的依赖项
     * @param ctx
     * @returns {Promise<void>}
     */
    async testResourceSubDependReleases(ctx) {

        var testResourceId = ctx.checkParams('testResourceId').exist().isMd5().value
        var subEntityId = ctx.checkQuery('subEntityId').optional().isMongoObjectId().value
        var subReleaseVersion = ctx.checkQuery('subEntityVersion').optional().is(semver.valid, ctx.gettext('params-format-validate-failed', 'subEntityVersion')).value
        ctx.validateParams().validateVisitorIdentity(LoginUser | InternalClient)

        const {masterEntityId, dependencyTree} = await this.testResourceDependencyTreeProvider.findOne({testResourceId})

        var subEntityChain = lodash.chain(dependencyTree).filter(x => x.id === (subEntityId || masterEntityId))
        if (subReleaseVersion) {
            subEntityChain.filter(x => x.version === subReleaseVersion)
        }
        if (!subEntityId) {
            subEntityChain.filter(x => x.deep === 1)
        }

        const subEntityInfo = subEntityChain.first().value()
        if (!subEntityInfo) {
            return ctx.success([])
        }

        const dependencies = dependencyTree.filter(x => x.deep === subEntityInfo.deep + 1 && x.parentId === subEntityInfo.id && x.parentVersion === subEntityInfo.version)

        ctx.success(dependencies)
    }

    /**
     * 测试资源授权树
     * @param ctx
     * @returns {Promise<void>}
     */
    async testResourceAuthTree(ctx) {

        const testResourceId = ctx.checkParams('testResourceId').exist().isMd5().value
        ctx.validateParams().validateVisitorIdentity(InternalClient | LoginUser)

        await this.testResourceAuthTreeProvider.findOne({testResourceId}).then(ctx.success)
    }

    /**
     * 测试资源签约
     * @param ctx
     * @returns {Promise<void>}
     */
    async updateTestResource(ctx) {

        const testResourceId = ctx.checkParams('testResourceId').exist().isMd5().value
        const resolveReleases = ctx.checkBody('resolveReleases').exist().isArray().value
        ctx.validateParams().validateVisitorIdentity(LoginUser)

        this._validateResolveReleasesParamFormat(resolveReleases)

        const testResourceInfo = await this.nodeTestResourceProvider.findOne({testResourceId}).tap(model => ctx.entityNullValueAndUserAuthorizationCheck(model, {
            msg: ctx.gettext('params-validate-failed', 'testResourceId')
        }))

        await ctx.service.testRuleService.setTestResourceResolveRelease(testResourceInfo, resolveReleases).then(ctx.success)

    }

    /**
     * 过滤测试资源依赖树
     * @returns {Promise<void>}
     */
    async filterTestResourceDependencyTree(ctx) {

        const testResourceId = ctx.checkParams('testResourceId').exist().isMd5().value
        const dependentEntityId = ctx.checkQuery('dependentEntityId').exist().isMongoObjectId().value
        const dependentEntityVersionRange = ctx.checkQuery('dependentEntityVersionRange').optional().toVersionRange().value
        ctx.validateParams().validateVisitorIdentity(InternalClient | LoginUser)

        const testResourceDependencyTree = await this.testResourceDependencyTreeProvider.findOne({testResourceId})

        if (!testResourceDependencyTree) {
            return ctx.success(null)
        }

        const {dependencyTree} = testResourceDependencyTree.toObject()
        const filteredDependencyTree = ctx.service.testRuleService.filterTestResourceDependency(dependencyTree, dependentEntityId, dependentEntityVersionRange)
        ctx.success(filteredDependencyTree)
    }

    /**
     * 校验节点身份
     * @param ctx
     * @param nodeId
     * @returns {Promise<void>}
     * @private
     */
    async _validateNodeIdentity(ctx, nodeId) {
        return this.nodeProvider.findOne({nodeId}).tap(model => ctx.entityNullValueAndUserAuthorizationCheck(model, {
            msg: ctx.gettext('params-validate-failed', 'nodeId'),
            property: 'ownerUserId'
        }))
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