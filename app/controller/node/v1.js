/**
 * Created by yuliang on 2017/10/16.
 * node相关api
 */

'use strict'

const Controller = require('egg').Controller;

module.exports = class NodeController extends Controller {

    constructor({app}) {
        super(...arguments)
        this.nodeProvider = app.dal.nodeProvider
    }

    /**
     * 节点列表
     */
    async index(ctx) {

        const page = ctx.checkQuery("page").default(1).gt(0).toInt().value
        const pageSize = ctx.checkQuery("pageSize").default(10).gt(0).lt(101).toInt().value
        const status = ctx.checkQuery("status").default(0).in([0, 1, 2]).toInt().value
        const ownerUserId = ctx.checkQuery("ownerUserId").exist().gt(1).toInt().value

        ctx.validate(false)

        const condition = {status}
        if (ownerUserId > 0) {
            condition.ownerUserId = ownerUserId
        }

        var nodeList = []
        const totalItem = await this.nodeProvider.count(condition)

        if (totalItem > (page - 1) * pageSize) { //避免不必要的分页查询
            nodeList = await this.nodeProvider.getNodeList(condition, page, pageSize)
        }

        ctx.success({page, pageSize, totalItem, dataList: nodeList})
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

        const nodeName = ctx.checkBody('nodeName').notBlank().type('string').trim().len(4, 20).toLowercase().value
        const nodeDomain = ctx.checkBody('nodeDomain').isNodeDomain().toLowercase().value

        const checkResult = ctx.helper.nodeDomain.checkNodeDomain(nodeDomain)
        if (checkResult !== true) {
            ctx.errors.push({nodeDomain: checkResult})
        }

        ctx.allowContentType({type: 'json'}).validate()

        const checkNodeNameTask = this.nodeProvider.findOne({nodeName})
        const checkNodeDomainTask = this.nodeProvider.findOne({nodeDomain})

        await Promise.all([checkNodeNameTask, checkNodeDomainTask]).then(([nodeNameResult, nodeDomainResult]) => {
            if (nodeNameResult) {
                ctx.errors.push({nodeName: '节点名已经存在'})
            }
            if (nodeDomainResult) {
                ctx.errors.push({nodeDomain: '节点域名已经存在'})
            }
            ctx.validate()
        })

        const nodeModel = {
            nodeName, nodeDomain, ownerUserId: ctx.request.userId
        }

        await this.nodeProvider.createNode(nodeModel).then(ctx.success)
    }

    /**
     * 更新节点信息
     */
    async update(ctx) {

        const nodeId = ctx.checkParams('id').toInt().gt(0).value
        const status = ctx.checkBody('status').in([0, 1]).value
        ctx.validate()

        const nodeInfo = await this.nodeProvider.findOne({nodeId})
        if (!nodeInfo || nodeInfo.ownerUserId !== ctx.request.userId) {
            ctx.error({msg: '节点信息未找到或者与身份信息不匹配'})
        }

        nodeInfo.status = status
        await nodeInfo.updateOne({status})

        ctx.success(nodeInfo)
    }

    /**
     * 获取节点列表
     */
    async list(ctx) {

        const nodeIds = ctx.checkQuery('nodeIds').match(/^[0-9]{5,9}(,[0-9]{5,9})*$/, 'nodeIds格式错误').toSplitArray().len(1, 100).value

        ctx.validate()

        await this.nodeProvider.find({nodeId: {$in: nodeIds}}).then(ctx.success).catch(ctx.error)
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
            ctx.error({msg: '缺少必要参数'})
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