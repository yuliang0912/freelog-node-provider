'use strict'

const Controller = require('egg').Controller;

module.exports = class PolicyTemplateController extends Controller {

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

        var templateList = []
        const condition = {templateType, isShare, status: 0, userId: ctx.request.userId}

        if (isShare === 1) {
            Reflect.deleteProperty(condition, 'userId')
        }

        let totalItem = await ctx.dal.policyTemplate.count(condition)

        if (totalItem > (page - 1) * pageSize) { //避免不必要的分页查询
            templateList = await ctx.dal.policyTemplate.findPageList(condition, page, pageSize)
        }

        ctx.success({page, pageSize, totalItem, dataList: templateList})
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
        ctx.allowContentType({type: 'json'}).validate()

        await ctx.dal.policyTemplate.create({
            name, template, templateType,
            isShare: 0,
            userId: ctx.request.userId
        }).then(ctx.success).catch(ctx.error)
    }

    /**
     * 查看详情
     * @param ctx
     * @returns {Promise<void>}
     */
    async show(ctx) {

        const id = ctx.checkParams("id").isMongoObjectId("id格式错误").value
        ctx.validate()

        await ctx.dal.policyTemplate.findById(id).then(ctx.success).catch(ctx.error)
    }

    /**
     * 更新模板
     * @param ctx
     * @returns {Promise<void>}
     */
    async update(ctx) {

        const id = ctx.checkParams("id").isMongoObjectId("id格式错误").value
        const name = ctx.checkBody('name').optional().trim().len(3, 40).value
        const template = ctx.checkBody('template').optional().isBase64().decodeBase64().len(1, 3000).value
        ctx.allowContentType({type: 'json'}).validate()

        if (name === undefined && template === undefined) {
            ctx.error({msg: '参数name和template最少需要一个'})
        }

        const policyTemplate = await ctx.dal.policyTemplate.findById(id)
        if (!policyTemplate || policyTemplate.userId != ctx.request.userId) {
            ctx.error({msg: '参数id错误或者与当前用户不匹配'})
        }

        const model = {}
        if (name !== undefined) {
            model.name = policyTemplate.name = name
        }
        if (template !== undefined) {
            model.template = policyTemplate.template = template
        }

        await ctx.dal.policyTemplate.update({_id: id}, model)
            .then(() => ctx.success(policyTemplate)).catch(ctx.error)
    }
}