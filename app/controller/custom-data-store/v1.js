'use strict'

const Controller = require('egg').Controller;

module.exports = class CustomDataStoreController extends Controller {

    /**
     * 创建自定义存储数据
     * @param ctx
     * @returns {Promise<void>}
     */
    async create(ctx) {
        let nodeId = ctx.checkBody('nodeId').isInt().gt(0).value
        let key = ctx.checkBody('key').exist().match(/^node_\d{5,9}_[a-z0-9_-|]{6,50}$/).value
        let value = ctx.checkBody('value').exist().value
        ctx.allowContentType({type: 'json'}).validate(false)

        if (!key.startsWith(`node_${nodeId}_`)) {
            ctx.error({msg: '参数key命名规则错误'})
        }

        await ctx.dal.customStoreProvider.count({key}).then(count => {
            count && ctx.error({msg: '当前key已经存在,不能重复创建', data: {key}})
        })

        await ctx.dal.customStoreProvider.createCustomStore({
            key, value, nodeId, userId: ctx.request.userId || 0
        }).bind(ctx).then(ctx.success).catch(ctx.error)
    }

    /**
     * 根据key获取自定义储存数据
     * @param ctx
     * @returns {Promise<void>}
     */
    async show(ctx) {
        let key = ctx.checkParams('id').match(/^[a-z0-9_-|]{6,50}$/).value
        ctx.validate()

        await ctx.dal.customStoreProvider.findOne({key})
            .bind(ctx).then(ctx.success).catch(ctx.error)
    }

    /**
     * 更新自定义储存数据
     * @param ctx
     * @returns {Promise<void>}
     */
    async update(ctx) {
        let key = ctx.checkParams('id').match(/^[a-z0-9_-|]{6,50}$/).value
        let value = ctx.checkBody('value').exist().isObject().value
        ctx.allowContentType({type: 'json'}).validate()

        await ctx.dal.customStoreProvider.count({key}).then(count => {
            !count && ctx.error({msg: '当前key不存在,不能执行更新操作', data: {key}})
        })

        await ctx.dal.customStoreProvider.update({key}, {value})
            .then(data => ctx.success(true)).catch(err => ctx.error(err))
    }
}