/**
 * Created by yuliang on 2017/10/17.
 */

'use strict'

const Promise = require('bluebird')
const Controller = require('egg').Controller;

module.exports = class NodePageBuildController extends Controller {

    /**
     * 节点获取自己的pb列表
     * @param ctx
     * @returns {Promise.<void>}
     */
    async index(ctx) {

        const nodeId = ctx.checkQuery('nodeId').isInt().gt(0).value

        ctx.validate()

        await ctx.dal.nodePageBuildProvider.getNodePageBuildList({nodeId}).whereIn('status', [1, 2])
            .then(ctx.success).catch(ctx.error)
    }


    /**
     * 更新node-page-build
     * @returns {Promise.<void>}
     */
    async update(ctx) {

        const id = ctx.checkParams('id').toInt().gt(0).value
        const status = ctx.checkBody('status').exist().isInt().in([1, 2]).value
        const nodeId = ctx.checkBody('nodeId').isInt().gt(0).value

        ctx.validate()

        const nodePageBuild = await ctx.dal.nodePageBuildProvider.getNodePageBuild({
            id, nodeId,
            userId: ctx.request.userId
        }).catch(ctx.error)

        if (!nodePageBuild) {
            ctx.error({msg: "未找到有效的nodePageBuild"})
        }

        //如果是显示状态,则其他的全部设置为隐藏
        await ctx.dal.nodePageBuildProvider.updateNodePageBuildStatus(nodeId, id, status).then(data => {
            ctx.success(true)
        })
    }
}