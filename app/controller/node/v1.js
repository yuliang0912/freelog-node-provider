/**
 * Created by yuliang on 2017/10/16.
 * node相关api
 */

'use strict'

const Controller = require('egg').Controller;
const {ArgumentError, ApplicationError} = require('egg-freelog-base/error')
const {LoginUser, InternalClient} = require('egg-freelog-base/app/enum/identity-type')

module.exports = class NodeController extends Controller {

    constructor({app}) {
        super(...arguments)
        this.nodeProvider = app.dal.nodeProvider
    }

    /**
     * 节点列表
     */
    async index(ctx) {

        const page = ctx.checkQuery("page").optional().default(1).gt(0).toInt().value
        const pageSize = ctx.checkQuery("pageSize").optional().default(10).gt(0).lt(101).toInt().value
        const status = ctx.checkQuery("status").optional().default(0).in([0, 1, 2]).toInt().value
        const projection = ctx.checkQuery('projection').optional().toSplitArray().default([]).value
        const isSelf = ctx.checkQuery("isSelf").optional().default(1).in([0, 1]).toInt().value
        ctx.validateParams().validateVisitorIdentity(InternalClient | LoginUser)

        const condition = {status}
        if (isSelf) {
            condition.ownerUserId = ctx.request.userId
        }

        var dataList = []
        const totalItem = await this.nodeProvider.count(condition)
        if (totalItem > (page - 1) * pageSize) {
            dataList = await this.nodeProvider.findPageList(condition, page, pageSize, projection.join(' '), {createDate: -1})
        }

        ctx.success({page, pageSize, totalItem, dataList})
    }

    /**
     * 查看节点详情
     */
    async show(ctx) {

        const nodeId = ctx.checkParams('id').toInt().gt(0).value

        ctx.validateParams().validateVisitorIdentity(InternalClient | LoginUser)

        await this.nodeProvider.findOne({nodeId}).then(ctx.success)
    }

    /**
     * 创建节点
     */
    async create(ctx) {

        const nodeName = ctx.checkBody('nodeName').exist().type('string').isNodeName().value
        const nodeDomain = ctx.checkBody('nodeDomain').exist().type('string').isNodeDomain().toLowercase().value
        ctx.validateParams().validateVisitorIdentity(LoginUser)

        const {ret, msg} = ctx.helper.checkNodeDomain(nodeDomain)
        if (!ret) {
            throw new ArgumentError(msg)
        }

        await this.nodeProvider.count({ownerUserId: ctx.request.userId}).then(nodeCount => {
            if (nodeCount < 5) {
                return
            }
            throw new ApplicationError(ctx.gettext('user-node-count-limit-error'), {nodeCount})
        })
        const nodeList = await this.nodeProvider.find({$or: [{nodeName}, {nodeDomain}]})
        if (nodeList.some(x => x.nodeName === nodeName)) {
            throw new ApplicationError(ctx.gettext('node-name-has-already-existed'), {nodeName})
        }
        if (nodeList.some(x => x.nodeDomain === nodeDomain)) {
            throw new ApplicationError(ctx.gettext('node-domain-has-already-existed'), {nodeDomain})
        }

        const nodeInfo = {
            nodeName, nodeDomain, ownerUserId: ctx.request.userId
        }

        await this.nodeProvider.createNode(nodeInfo).then(ctx.success)
    }

    /**
     * 更新节点信息
     */
    async update(ctx) {

        const nodeId = ctx.checkParams('id').toInt().gt(0).value
        const status = ctx.checkBody('status').exist().toInt().in([0, 1]).value
        ctx.validateParams().validateVisitorIdentity(LoginUser)

        await this.nodeProvider.findOne({nodeId}).tap(model => ctx.entityNullValueAndUserAuthorizationCheck(model, {
            msg: ctx.gettext('params-validate-failed', 'nodeId'),
            property: 'ownerUserId'
        }))

        await this.nodeProvider.findOneAndUpdate({nodeId}, {status}, {new: true}).then(ctx.success)
    }

    /**
     * 获取节点列表
     */
    async list(ctx) {

        const nodeIds = ctx.checkQuery('nodeIds').exist().match(/^[0-9]{5,9}(,[0-9]{5,9})*$/).toSplitArray().len(1, 100).value
        const projection = ctx.checkQuery('projection').optional().toSplitArray().default([]).value
        ctx.validateParams().validateVisitorIdentity(InternalClient | LoginUser)

        await this.nodeProvider.find({nodeId: {$in: nodeIds}}, projection.join(' ')).then(ctx.success)
    }

    /**
     * 节点详情
     * @param ctx
     * @returns {Promise<void>}
     */
    async detail(ctx) {

        const nodeDomain = ctx.checkQuery('nodeDomain').optional().isNodeDomain().toLowercase().value
        const nodeName = ctx.checkQuery('nodeName').optional().isNodeName().value

        ctx.validateParams().validateVisitorIdentity(InternalClient | LoginUser)

        if (nodeDomain === undefined && nodeName === undefined) {
            throw new ArgumentError(ctx.gettext('params-required-validate-failed'))
        }

        const condition = {}
        if (nodeDomain) {
            condition.nodeDomain = nodeDomain
        }
        if (nodeName) {
            condition.nodeName = nodeName
        }

        await this.nodeProvider.findOne(condition).then(ctx.success)
    }
}