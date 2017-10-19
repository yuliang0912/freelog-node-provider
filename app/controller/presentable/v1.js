/**
 * Created by yuliang on 2017/8/15.
 * presentable 面向用户消费策略相关API
 */

'use strict'

module.exports = app => {
    return class PresentableController extends app.Controller {

        /**
         * 展示节点所有的消费方案
         * @param ctx
         * @returns {Promise.<void>}
         */
        async index(ctx) {
            let nodeId = ctx.checkQuery("nodeId").exist().isInt().toInt().value
            let contractIds = ctx.checkQuery('contractIds').default('').value
            let resourceType = ctx.checkQuery('resourceType').default('').value

            if (contractIds !== '') {
                if (!/^[0-9a-f]{24}(,[0-9a-f]{24})*$/.test(contractIds)) {
                    ctx.errors.push({contractIds: 'contractIds格式错误'})
                }
            }

            ctx.validate()

            let condition = {nodeId, status: 0}
            if (contractIds) {
                condition.contractId = {
                    $in: contractIds.split(',')
                }
            }
            if (resourceType) {
                condition['tagInfo.resourceInfo.resourceType'] = resourceType
            }

            await ctx.service.presentableService.getPresentableList(condition)
                .bind(ctx).map(buildReturnPresentable).then(ctx.success).catch(ctx.error)
        }

        /**
         * 展示消费策略
         * @param ctx
         * @returns {Promise.<void>}
         */
        async show(ctx) {
            let presentableId = ctx.checkParams("id").isMongoObjectId().value

            await ctx.validate().service.presentableService.getPresentable({
                _id: presentableId,
                status: 0
            }).bind(ctx).then(ctx.success).catch(ctx.error)
        }

        /**
         * 创建节点消费方案
         * @param ctx
         * @returns {Promise.<void>}
         */
        async create(ctx) {
            let name = ctx.checkBody('name').notBlank().len(2, 50).type('string').value
            let nodeId = ctx.checkBody('nodeId').isInt().gt(0).value
            let contractId = ctx.checkBody('contractId').notEmpty().value
            let languageType = ctx.checkBody('languageType').default('freelog_policy_lang').in(['freelog_policy_lang']).value
            let policyText = ctx.checkBody('policyText').exist().isBase64().decodeBase64().value
            let userDefinedTags = ctx.checkBody('userDefinedTags').default('').value

            if (userDefinedTags.length > 200) {
                ctx.errors.push({userDefinedTags: '自定义tag长度不能超过200字符'})
            }

            ctx.allowContentType({type: 'json'}).validate()

            await ctx.service.presentableService.getPresentable({nodeId, contractId}).then(presentable => {
                presentable && ctx.error({msg: "同一个合同只能创建一次presentable"})
            })

            let contractInfo = await ctx.curlIntranetApi(`${ctx.app.config.gatewayUrl}/api/v1/contracts/${contractId}`)

            if (!contractInfo || contractInfo.partyTwo !== nodeId || contractInfo.contractType !== 2) {
                ctx.error({msg: 'contract信息错误'})
            }

            let resourceInfo = await ctx.curlIntranetApi(`${ctx.app.config.gatewayUrl}/api/v1/resources/${contractInfo.resourceId}`)

            if (!resourceInfo) {
                ctx.error({msg: 'contract信息错误,未能索引到contract的资源'})
            }

            let presentable = {
                name, nodeId,
                resourceId: contractInfo.targetId,
                policyText, languageType,
                contractId,
                userId: ctx.request.userId,
                tagInfo: {
                    resourceInfo: {
                        resourceId: resourceInfo.resourceId,
                        resourceName: resourceInfo.resourceName,
                        resourceType: resourceInfo.resourceType,
                        mimeType: resourceInfo.mimeType
                    },
                    userDefined: []
                }
            }

            if (userDefinedTags.length > 0) {
                presentable.tagInfo.userDefined = userDefinedTags.split(',')
            }

            await ctx.service.presentableService.createPresentable(presentable)
                .bind(ctx).then(ctx.success).catch(ctx.error)
        }

        /**
         * 删除节点消费方案
         * @param ctx
         * @returns {Promise.<void>}
         */
        async destroy(ctx) {

            let presentableId = ctx.checkParams("id").exist().isMongoObjectId().value

            await ctx.validate().service.presentableService.updatePresentable({status: 1}, {_id: presentableId}).bind(ctx)
                .then(data => ctx.success(data ? data.ok > 0 : false)).catch(ctx.error)
        }

        /**
         * 根据合同ID批量获取presentables
         * @returns {Promise.<void>}
         */
        async getPresentablesByContractIds(ctx) {

            let nodeId = ctx.checkBody("nodeId").toInt().gt(0).value
            //match(/^[0-9a-f]{24}(,[0-9a-f]{24})*$/)
            let contractIds = ctx.checkBody('contractIds').exist().notEmpty().value

            ctx.allowContentType({type: 'json'}).validate()

            await ctx.service.presentableService.getPresentablesByContractIds(nodeId, contractIds).bind(ctx)
                .then(ctx.success).catch(ctx.error)
        }
    }
}

const buildReturnPresentable = (data) => {
    if (data) {
        data = data.toObject()
        Reflect.deleteProperty(data, 'languageType')
        Reflect.deleteProperty(data, 'policyText')
    }
    return data
}