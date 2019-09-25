'use strict'

const lodash = require('lodash')
const semver = require('semver')
const Controller = require('egg').Controller
const {LoginUser, UnLoginUser, InternalClient} = require('egg-freelog-base/app/enum/identity-type')

module.exports = class TestNodeController extends Controller {

    constructor({app}) {
        super(...arguments)
        this.nodeProvider = app.dal.nodeProvider
        this.nodeTestRuleProvider = app.dal.nodeTestRuleProvider
        this.nodeTestResourceProvider = app.dal.nodeTestResourceProvider
        this.nodeTestResourceDependencyTreeProvider = app.dal.nodeTestResourceDependencyTreeProvider
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

        const nodeId = ctx.checkBody('nodeId').exist().toInt().gt(0).value
        const testRuleText = ctx.checkBody('testRuleText').exist().type('string').isBase64().decodeBase64().value
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
        const keywords = ctx.checkQuery('keywords').optional().type('string').len(1, 100).value
        const resourceType = ctx.checkQuery('resourceType').optional().isResourceType().value
        const isOnline = ctx.checkQuery('isOnline').optional().toInt().default(2).in([0, 1, 2]).value
        const pageSize = ctx.checkQuery("pageSize").optional().default(10).gt(0).lt(101).toInt().value
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
            nodeTestResources = await this.nodeTestResourceProvider.findPageList(condition, page, pageSize, projection.join(' '), {createDate: -1})
        }
        ctx.success({page, pageSize, totalItem, dataList: nodeTestResources})
    }

    /**
     * 测试资源依赖树
     * @param ctx
     * @returns {Promise<void>}
     */
    async testResourceDetail(ctx) {

        const testResourceId = ctx.checkParams('testResourceId').exist().isMongoObjectId().value
        ctx.validateParams().validateVisitorIdentity(InternalClient | LoginUser)

        await this.nodeTestResourceProvider.findById(testResourceId).then(ctx.success)
    }

    /**
     * 搜索测试资源的依赖树
     * @param ctx
     * @returns {Promise<void>}
     */
    async searchTestResource(ctx) {

        const page = ctx.checkQuery("page").optional().default(1).toInt().gt(0).value
        const pageSize = ctx.checkQuery("pageSize").optional().default(10).gt(0).lt(101).toInt().value
        const nodeId = ctx.checkParams('nodeId').exist().toInt().gt(0).value
        const dependentEntityName = ctx.checkQuery('dependentEntityName').exist().type('string').value

        ctx.validateParams().validateVisitorIdentity(InternalClient | LoginUser)

        const condition = {
            nodeId, 'dependencyTree.name': new RegExp(dependentEntityName, 'i')
        }

        var nodeTestResources = []
        const totalItem = await this.nodeTestResourceDependencyTreeProvider.count(condition)
        if (totalItem > (page - 1) * pageSize) {
            nodeTestResources = await this.nodeTestResourceDependencyTreeProvider.findPageList(condition, page, pageSize, 'testResourceId testResourceName', {createDate: -1})
        }
        ctx.success({page, pageSize, totalItem, dataList: nodeTestResources})
    }

    /**
     * 搜索测试资源依赖树
     * @param ctx
     * @returns {Promise<void>}
     */
    async searchTestResourceDependencyTree(ctx) {

    }

    /**
     * 查看测试资源依赖树
     * @param ctx
     * @returns {Promise<void>}
     */
    async testResourceDependencyTree(ctx) {

        const testResourceId = ctx.checkParams('testResourceId').exist().isMongoObjectId().value
        ctx.validateParams().validateVisitorIdentity(InternalClient | LoginUser)

        await this.nodeTestResourceDependencyTreeProvider.findById(testResourceId).then(ctx.success)
    }

    /**
     * 过滤测试资源依赖树
     * @returns {Promise<void>}
     */
    async filterTestResourceDependencyTree(ctx) {

        const testResourceId = ctx.checkParams('testResourceId').exist().isMongoObjectId().value
        const dependentEntityName = ctx.checkQuery('dependentEntityName').exist().type('string').value
        const dependentEntityVersionRange = ctx.checkQuery('dependentEntityVersionRange').optional().toVersionRange().value
        ctx.validateParams().validateVisitorIdentity(InternalClient | LoginUser)

        const testResourceDependencyTree = await this.nodeTestResourceDependencyTreeProvider.findById(testResourceId)
        if (!testResourceDependencyTree) {
            return ctx.success(null)
        }

        const {dependencyTree} = testResourceDependencyTree.toObject()
        const dependentEntityType = dependentEntityVersionRange === undefined ? 'mock' : 'release'

        const filteredDependencyTree = ctx.service.testRuleService.filterTestResourceDependency(dependencyTree, dependentEntityName, dependentEntityType, dependentEntityVersionRange)
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
}