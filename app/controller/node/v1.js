/**
 * Created by yuliang on 2017/10/16.
 * node相关api
 */
'use strict'

const Controller = require('egg').Controller;

module.exports = class NodeController extends Controller {
    /**
     * 节点列表
     * @param ctx
     * @returns {Promise.<void>}
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
        const totalItem = await ctx.dal.nodeProvider.getCount(condition)

        if (totalItem > (page - 1) * pageSize) { //避免不必要的分页查询
            nodeList = await ctx.dal.nodeProvider.getNodeList(condition, page, pageSize)
        }

        ctx.success({page, pageSize, totalItem, dataList: nodeList})
    }

    /**
     * 查看节点详情
     * @param ctx
     * @returns {Promise.<void>}
     */
    async show(ctx) {

        const nodeId = ctx.checkParams('id').isInt().gt(0).value

        ctx.validate(false)

        await ctx.dal.nodeProvider.getNodeInfo({nodeId}).then(ctx.success)
    }

    /**
     * 创建节点
     * @param ctx
     * @returns {Promise.<void>}
     */
    async create(ctx) {

        const nodeName = ctx.checkBody('nodeName').notBlank().type('string').trim().len(4, 20).value
        const nodeDomain = ctx.checkBody('nodeDomain').isNodeDomain().value

        const checkResult = ctx.helper.nodeDomain.checkNodeDomain(nodeDomain)
        if (checkResult !== true) {
            ctx.errors.push({nodeDomain: checkResult})
        }

        ctx.allowContentType({type: 'json'}).validate()

        const checkNodeNameTask = ctx.dal.nodeProvider.getNodeInfo({nodeName})
        const checkNodeDomainTask = ctx.dal.nodeProvider.getNodeInfo({nodeDomain})

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
            nodeName, nodeDomain,
            ownerUserId: ctx.request.userId
        }

        await ctx.dal.nodeProvider.createNode(nodeModel).then(result => {
            if (result.length > 0) {
                return ctx.dal.nodeProvider.getNodeInfo({nodeId: result[0]})
            }
        }).then(ctx.success)
    }

    /**
     * 更新节点信息
     * @param ctx
     * @returns {Promise<void>}
     */
    async update(ctx) {

        const nodeId = ctx.checkParams('id').isInt().gt(0).value
        const status = ctx.checkBody('status').in([0, 1]).value
        ctx.validate()

        const nodeInfo = await ctx.dal.nodeProvider.getNodeInfo({nodeId})
        if (!nodeInfo || nodeInfo.ownerUserId !== ctx.request.userId) {
            ctx.error({msg: '节点信息未找到或者与身份信息不匹配'})
        }

        await ctx.dal.nodeProvider.update({status}, {nodeId}).then(isSuccess => {
            if (isSuccess) {
                nodeInfo.status = status
            }
            ctx.success(nodeInfo)
        })
    }


    /**
     * 获取节点列表
     * @param ctx
     * @returns {Promise<void>}
     */
    async list(ctx) {

        const nodeIds = ctx.checkQuery('nodeIds').match(/^[0-9]{5,9}(,[0-9]{5,9})*$/, 'nodeIds格式错误').toSplitArray().len(1, 100).value

        ctx.validate()

        await ctx.dal.nodeProvider.getNodeListByNodeIds(nodeIds).then(ctx.success).catch(ctx.error)
    }
}