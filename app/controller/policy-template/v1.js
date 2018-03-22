'use strict'

const Controller = require('egg').Controller;

module.exports = class PolicyTemplateController extends Controller {

    /**
     * 查询列表
     * @param ctx
     * @returns {Promise<void>}
     */
    async index(ctx) {

        let page = ctx.checkQuery("page").default(1).gt(0).toInt().value
        let pageSize = ctx.checkQuery("pageSize").default(10).gt(0).lt(101).toInt().value
        let templateType = ctx.checkQuery("templateType").exist().toInt().in([1, 2]).value
        let isShare = ctx.checkQuery('isShare').optional().toInt().in([0, 1]).value
        ctx.validate()

        let templateList = []
        let condition = {templateType, status: 0}
        if (isShare !== undefined) {
            condition.isShare = isShare
        }
        if (isShare !== 1) {
            condition.userId = ctx.request.userId
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

        let name = ctx.checkBody('name').exist().trim().len(3, 40).value
        let template = ctx.checkBody('template').exist().isBase64().decodeBase64().len(1, 3000).value
        let templateType = ctx.checkBody('templateType').toInt().in([1, 2]).value
        ctx.allowContentType({type: 'json'}).validate()

        await ctx.dal.policyTemplate.create({
            name, template, templateType,
            isShare: 0,
            userId: ctx.request.userId
        }).bind(ctx).then(ctx.success).catch(ctx.error)
    }

    /**
     * 查看详情
     * @param ctx
     * @returns {Promise<void>}
     */
    async show(ctx) {

        let id = ctx.checkParams("id").isMongoObjectId("id格式错误").value
        ctx.validate()

        await ctx.dal.policyTemplate.findById(id).bind(ctx).then(ctx.success).catch(ctx.error)
    }

    /**
     * 更新模板
     * @param ctx
     * @returns {Promise<void>}
     */
    async update(ctx) {

        let id = ctx.checkParams("id").isMongoObjectId("id格式错误").value
        let name = ctx.checkBody('name').optional().trim().len(3, 40).value
        let template = ctx.checkBody('template').optional().isBase64().decodeBase64().len(1, 3000).value
        ctx.allowContentType({type: 'json'}).validate()

        if (name === undefined && template === undefined) {
            ctx.error({msg: '参数name和template最少需要一个'})
        }

        let policyTemplate = await ctx.dal.policyTemplate.findById(id)
        if (!policyTemplate || policyTemplate.userId != ctx.request.userId) {
            ctx.error({msg: '参数id错误或者与当前用户不匹配'})
        }

        let model = {}
        if (name !== undefined) {
            model.name = policyTemplate.name = name
        }
        if (template !== undefined) {
            model.template = policyTemplate.template = template
        }

        await ctx.dal.policyTemplate.update({_id: id}, model)
            .bind(ctx).then(() => ctx.success(policyTemplate)).catch(ctx.error)
    }
}