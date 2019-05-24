/**
 * Created by yuliang on 2017/10/16.
 * node相关api
 */

'use strict'

const Controller = require('egg').Controller;
const {ArgumentError, ApplicationError} = require('egg-freelog-base/error')

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
        ctx.validate()

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

        const nodeId = ctx.checkParams('id').isInt().gt(0).value

        ctx.validate(false)

        await this.nodeProvider.findOne({nodeId}).then(ctx.success)
    }

    /**
     * 创建节点
     */
    async create(ctx) {

        const nodeName = ctx.checkBody('nodeName').exist().type('string').trim().len(4, 20).value
        const nodeDomain = ctx.checkBody('nodeDomain').exist().type('string').isNodeDomain().toLowercase().value
        ctx.validate()

        const {ret, msg} = ctx.helper.checkNodeDomain(nodeDomain)
        if (!ret) {
            throw new ArgumentError(msg)
        }
        const nodeList = await this.nodeProvider.find({$or: [{nodeName}, {nodeDomain}]})
        if (nodeList.some(x => x.nodeName === nodeName)) {
            throw new ApplicationError(ctx.gettext('节点名已经存在'), {nodeName})
        }
        if (nodeList.some(x => x.nodeDomain === nodeDomain)) {
            throw new ApplicationError(ctx.gettext('节点域名已经存在'), {nodeDomain})
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
        ctx.validate()

        await this.nodeProvider.findOne({nodeId}).tap(model => ctx.entityNullValueAndUserAuthorizationCheck(model, {
            msg: ctx.gettext('节点信息未找到或者与身份信息不匹配'),
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
        ctx.validate()

        await this.nodeProvider.find({nodeId: {$in: nodeIds}}, projection.join(' ')).then(ctx.success)
    }

    /**
     * 节点详情
     * @param ctx
     * @returns {Promise<void>}
     */
    async detail(ctx) {

        const nodeDomain = ctx.checkQuery('nodeDomain').optional().isNodeDomain().toLowercase().value
        const nodeName = ctx.checkQuery('nodeName').optional().notBlank().type('string').trim().len(4, 20).value
        ctx.validate(false)

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