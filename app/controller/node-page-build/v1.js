/**
 * Created by yuliang on 2017/10/17.
 */

const Promise = require('bluebird')

'use strict'

module.exports = app => {

    const dataProvider = app.dataProvider

    return class NodePageBuildController extends app.Controller {

        /**
         * 节点获取自己的pb列表
         * @param ctx
         * @returns {Promise.<void>}
         */
        async index(ctx) {
            let nodeId = ctx.checkQuery('nodeId').isInt().gt(0).value

            ctx.validate()

            await dataProvider.nodePageBuildProvider.getNodePageBuildList({nodeId}).whereIn('status', [1, 2])
                .bind(ctx).then(ctx.success).catch(ctx.error)
        }

        /**
         * 节点添加pb文件
         * @param ctx
         * @returns {Promise.<void>}
         */
        async create(ctx) {
            let nodeId = ctx.checkBody('nodeId').isInt().gt(0).value
            let presentableId = ctx.checkBody('presentableId').exist().isMongoObjectId().value
            let status = ctx.checkBody('status').exist().isInt().in([1, 2]).value

            ctx.allowContentType({type: 'json'}).validate()

            let model = {
                nodeId, presentableId, status, userId: ctx.request.userId
            }
            let nodeInfoTask = dataProvider.nodeProvider.getNodeInfo({nodeId, ownerUserId: ctx.request.userId})
            let nodePageBuildTask = dataProvider.nodePageBuildProvider.getNodePageBuild({nodeId, presentableId})
            let presentableTask = dataProvider.presentableProvider.getPresentable({_id: presentableId})

            await Promise.all([nodeInfoTask, nodePageBuildTask, presentableTask]).spread((nodeInfo, pageBuild, presentable) => {
                if (nodeInfo) {
                    ctx.errors.push({nodeId: '当前用户没有创建节点pb权限'})
                }
                if (pageBuild) {
                    ctx.errors.push({presentableId: '当前pb已经存在,不能重复添加'})
                }
                if (!presentable) {
                    ctx.errors.push({presentableId: 'presentableId错误'})
                } else if (presentable.tagInfo.resourceInfo.resourceType !== ctx.app.resourceType.PAGE_BUILD) {
                    ctx.errors.push({presentableId: 'presentable的资源类型必须是pageBuild'})
                } else {
                    model.resourceId = presentable.resourceId
                    model.presentableName = presentable.name
                }
                ctx.validate()
            })

            await dataProvider.nodePageBuildProvider.createNodePageBuild(model).then(data => {
                Reflect.set(model, 'id', data[0])
                return model
            }).bind(ctx).then(ctx.success).catch(ctx.error)

            if (model.status === 1) {
                dataProvider.nodePageBuildProvider.updateNodePageBuildStatus(nodeId, model.id, model.status).catch(console.error)
            }
        }
    }
}