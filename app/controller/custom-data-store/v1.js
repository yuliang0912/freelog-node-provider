'use strict'

const Controller = require('egg').Controller;

module.exports = class CustomDataStoreController extends Controller {

    constructor({app}) {
        super(...arguments)
        this.customStoreProvider = app.dal.customStoreProvider
    }

    /**
     * 创建自定义存储数据
     * @param ctx
     * @returns {Promise<void>}
     */
    async create(ctx) {

        const nodeId = ctx.checkBody('nodeId').isInt().gt(0).value
        const key = ctx.checkBody('key').exist().match(/^node_\d{5,9}_[a-z0-9_-|]{6,50}$/).value
        const value = ctx.checkBody('value').exist().value
        ctx.allowContentType({type: 'json'}).validate(false)

        if (!key.startsWith(`node_${nodeId}_`)) {
            ctx.error({msg: '参数key命名规则错误'})
        }

        await this.customStoreProvider.count({key}).then(count => {
            count && ctx.error({msg: '当前key已经存在,不能重复创建', data: {key}})
        })

        await this.customStoreProvider.createCustomStore({
            key, value, nodeId, userId: ctx.request.userId || 0
        }).then(ctx.success).catch(ctx.error)
    }

    /**
     * 根据key获取自定义储存数据
     * @param ctx
     * @returns {Promise<void>}
     */
    async show(ctx) {

        const key = ctx.checkParams('id').match(/^[a-z0-9_-|]{6,50}$/).value
        ctx.validate(false)

        await this.customStoreProvider.findOne({key}).then(ctx.success).catch(ctx.error)
    }

    /**
     * 更新自定义储存数据
     * @param ctx
     * @returns {Promise<void>}
     */
    async update(ctx) {

        const key = ctx.checkParams('id').match(/^[a-z0-9_-|]{6,50}$/).value
        const value = ctx.checkBody('value').exist().isObject().value
        ctx.allowContentType({type: 'json'}).validate()

        await this.customStoreProvider.count({key}).then(count => {
            !count && ctx.error({msg: '当前key不存在,不能执行更新操作', data: {key}})
        })

        await this.customStoreProvider.update({key}, {value})
            .then(data => ctx.success(true)).catch(ctx.error)
    }

    /**
     * 创建或更新
     * @param ctx
     * @returns {Promise<void>}
     */
    async createOrUpdate(ctx) {

        const nodeId = ctx.checkBody('nodeId').isInt().gt(0).value
        const key = ctx.checkBody('key').exist().match(/^[a-z0-9_-|]{6,50}$/).value
        const value = ctx.checkBody('value').exist().isObject().value
        const userId = ctx.request.userId || 0
        ctx.allowContentType({type: 'json'}).validate()

        if (!key.startsWith(`node_${nodeId}_`)) {
            ctx.error({msg: '参数key命名规则错误'})
        }

        await this.customStoreProvider.findOneAndUpdate({key}, {value}).then(oldInfo => {
            return oldInfo ? this.customStoreProvider.findOne({key}) : this.customStoreProvider.create({
                key, value, nodeId, userId
            })
        }).then(ctx.success).catch(ctx.error)
    }
}