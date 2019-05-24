'use strict'

const Controller = require('egg').Controller;
const {ArgumentError} = require('egg-freelog-base/error')

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

        const nodeId = ctx.checkBody('nodeId').exist().isInt().gt(0).value
        const key = ctx.checkBody('key').exist().match(/^node_\d{5,9}_[a-z0-9_-|]{6,50}$/).value
        const value = ctx.checkBody('value').exist().value
        ctx.validate(false)

        if (!key.startsWith(`node_${nodeId}_`)) {
            throw new ArgumentError(ctx.gettext('params-format-validate-failed', 'key'))
        }

        await this.customStoreProvider.count({key}).then(count => {
            if (!count) {
                return
            }
            throw new ArgumentError(ctx.gettext('custom-store-key-has-already-existed'))
        })

        await this.customStoreProvider.create({
            key, value, nodeId, userId: ctx.request.userId || 0
        }).then(ctx.success)
    }

    /**
     * 根据key获取自定义储存数据
     * @param ctx
     * @returns {Promise<void>}
     */
    async show(ctx) {

        const key = ctx.checkParams('id').match(/^[a-z0-9_-|]{6,50}$/).value
        ctx.validate(false)

        await this.customStoreProvider.findOne({key}).then(ctx.success)
    }

    /**
     * 更新自定义储存数据
     * @param ctx
     * @returns {Promise<void>}
     */
    async update(ctx) {

        const key = ctx.checkParams('id').match(/^[a-z0-9_-|]{6,50}$/).value
        const value = ctx.checkBody('value').exist().isObject().value
        ctx.validate()

        const storeInfo = await this.customStoreProvider.findOne({key}).tap(model => ctx.entityNullObjectCheck(model))

        await storeInfo.updateOne({value}).then(data => ctx.success(data.ok))
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
            throw new ArgumentError(ctx.gettext('params-format-validate-failed', 'key'))
        }

        await this.customStoreProvider.findOneAndUpdate({key}, {value}, {new: true}).then(model => {
            return model || this.customStoreProvider.create({key, value, nodeId, userId})
        }).then(ctx.success)
    }
}