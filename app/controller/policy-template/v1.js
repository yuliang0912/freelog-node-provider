'use strict'

const Controller = require('egg').Controller;
const {ArgumentError} = require('egg-freelog-base/error')

module.exports = class PolicyTemplateController extends Controller {

    constructor({app}) {
        super(...arguments)
        this.policyTemplateProvider = app.dal.policyTemplateProvider
    }

    /**
     * 查询列表
     * @param ctx
     * @returns {Promise<void>}
     */
    async index(ctx) {

        const page = ctx.checkQuery("page").default(1).gt(0).toInt().value
        const pageSize = ctx.checkQuery("pageSize").default(10).gt(0).lt(101).toInt().value
        const templateType = ctx.checkQuery("templateType").exist().toInt().in([1, 2]).value
        const isShare = ctx.checkQuery('isShare').default(0).toInt().in([0, 1]).value
        ctx.validate()

        const condition = {templateType, isShare, status: 0}
        if (!isShare) {
            condition.userId = ctx.request.userId
        }

        var dataList = []
        const totalItem = await this.policyTemplateProvider.count(condition)
        if (totalItem > (page - 1) * pageSize) { //避免不必要的分页查询
            dataList = await this.policyTemplateProvider.findPageList(condition, page, pageSize)
        }

        ctx.success({page, pageSize, totalItem, dataList})
    }

    /**
     * 创建模板
     * @param ctx
     * @returns {Promise<void>}
     */
    async create(ctx) {

        const name = ctx.checkBody('name').exist().trim().len(3, 40).value
        const template = ctx.checkBody('template').exist().isBase64().decodeBase64().len(1, 3000).value
        const templateType = ctx.checkBody('templateType').toInt().in([1, 2]).value
        const isShare = ctx.checkBody('isShare').optional().toInt().in([0, 1]).default(0).value
        ctx.validate()

        await this.policyTemplateProvider.create({
            name, template, templateType, isShare,
            userId: ctx.request.userId
        }).then(ctx.success)
    }

    /**
     * 查看详情
     * @param ctx
     * @returns {Promise<void>}
     */
    async show(ctx) {

        const id = ctx.checkParams("id").isMongoObjectId().value
        ctx.validate()

        await this.policyTemplateProvider.findById(id).then(ctx.success)
    }

    /**
     * 更新模板
     * @param ctx
     * @returns {Promise<void>}
     */
    async update(ctx) {

        const id = ctx.checkParams("id").isMongoObjectId().value
        const name = ctx.checkBody('name').optional().trim().len(3, 40).value
        const template = ctx.checkBody('template').optional().isBase64().decodeBase64().len(1, 3000).value
        ctx.validate()

        if (name === undefined && template === undefined) {
            throw new ArgumentError(ctx.gettext('params-required-validate-failed'))
        }

        const policyTemplate = await this.policyTemplateProvider.findById(id).then(model => ctx.entityNullValueAndUserAuthorizationCheck(model, {
            msg: ctx.gettext('params-validate-failed', 'id')
        }))

        const model = {}
        if (name !== undefined) {
            model.name = policyTemplate.name = name
        }
        if (template !== undefined) {
            model.template = policyTemplate.template = template
        }

        await policyTemplate.updateOne(model).then(() => ctx.success(policyTemplate))
    }
}