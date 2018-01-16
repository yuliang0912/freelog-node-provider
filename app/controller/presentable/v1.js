/**
 * Created by yuliang on 2017/8/15.
 * presentable 面向用户消费策略相关API
 */

'use strict'

const lodash = require('lodash')

module.exports = app => {

    const dataProvider = app.dataProvider

    return class PresentableController extends app.Controller {

        /**
         * 展示节点所有的消费方案
         * @param ctx
         * @returns {Promise.<void>}
         */
        async index(ctx) {

            let nodeId = ctx.checkQuery("nodeId").exist().isInt().toInt().value
            let contractIds = ctx.checkQuery('contractIds').optional().isSplitMongoObjectId().toSplitArray().value
            let resourceType = ctx.checkQuery('resourceType').optional().isResourceType().value
            let tags = ctx.checkQuery('tags').optional().len(1).toSplitArray().value

            ctx.validate()

            let condition = {nodeId, status: 0}
            if (contractIds) {
                condition.contractId = {$in: contractIds}
            }
            if (resourceType) {
                condition['tagInfo.resourceInfo.resourceType'] = resourceType
            }
            if (tags) {
                condition['tagInfo.userDefined'] = {$in: tags}
            }

            await dataProvider.presentableProvider.getPresentableList(condition)
                .bind(ctx).map(buildReturnPresentable).then(ctx.success).catch(ctx.error)
        }

        /**
         * 展示消费策略
         * @param ctx
         * @returns {Promise.<void>}
         */
        async show(ctx) {
            let presentableId = ctx.checkParams("id").isMongoObjectId().value

            ctx.validate()

            await dataProvider.presentableProvider.getPresentable({
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

            await dataProvider.presentableProvider.getPresentable({nodeId, contractId}).then(presentable => {
                presentable && ctx.error({msg: "同一个合同只能创建一次presentable"})
            })

            let contractInfo = await ctx.curlIntranetApi(`${this.config.gatewayUrl}/api/v1/contracts/${contractId}`)

            if (!contractInfo || contractInfo.partyTwo !== nodeId || contractInfo.contractType !== 2) {
                ctx.error({msg: 'contract信息错误'})
            }

            let resourceInfo = await ctx.curlIntranetApi(`${this.config.gatewayUrl}/api/v1/resources/${contractInfo.resourceId}`)

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

            await dataProvider.presentableProvider.createPresentable(presentable).bind(ctx).then(data => {
                app.emit(app.event.presentableEvent.createPresentableEvent, data.toObject())
                ctx.success(data)
            }).catch(ctx.error)
        }

        /**
         * 更新presentable
         * @param ctx
         * @returns {Promise<void>}
         */
        async update(ctx) {

            let presentableId = ctx.checkParams("id").exist().isMongoObjectId().value
            let name = ctx.checkBody('name').optional().notBlank().len(2, 50).type('string').value
            let policyText = ctx.checkBody('policyText').optional().isBase64().decodeBase64().value
            let userDefinedTags = ctx.checkBody('userDefinedTags').optional().type('string').value

            ctx.allowContentType({type: 'json'}).validate()

            let presentableInfo = await dataProvider.presentableProvider.getPresentable({_id: presentableId})

            if (!presentableInfo || presentableInfo.userId !== ctx.request.userId) {
                ctx.error({msg: '参数presentableId错误或者没有操作权限'})
            }

            let model = {}
            if (policyText) {
                model.policyText = policyText
                model.languageType = presentableInfo.languageType
            }
            if (name) {
                model.name = name
            }
            if (userDefinedTags) {
                model['tagInfo.userDefined'] = userDefinedTags.split(',')
            }

            if (!Object.keys(model).length) {
                ctx.error({msg: '没有需要修改的数据'})
            }

            await dataProvider.presentableProvider.updatePresentable(model, {_id: presentableId}).then(data => {
                return dataProvider.presentableProvider.getPresentable({_id: presentableId})
            }).bind(ctx).then(ctx.success).catch(ctx.error)
        }

        /**
         * 删除节点消费方案
         * @param ctx
         * @returns {Promise.<void>}
         */
        async destroy(ctx) {

            let presentableId = ctx.checkParams("id").exist().isMongoObjectId().value

            ctx.validate()

            await dataProvider.presentableProvider.updatePresentable({status: 1}, {_id: presentableId}).bind(ctx)
                .then(data => ctx.success(data ? data.ok > 0 : false)).catch(ctx.error)
        }


        /**
         * 创建pb的presentable(同时创建pb中的widgets的presentable)
         * @param ctx
         * @returns {Promise.<void>}
         */
        async createPageBuildPresentable(ctx) {

            /**
             * 暂时去掉这个接口,允许pb中的widget不创建presentable也可以使用.
             * 在实际渲染PB的时候再去查看是否创建presentable
             */

            ctx.error({msg: '此接口暂时不提供'})

            let nodeId = ctx.checkBody('nodeId').isInt().gt(0).value
            let languageType = ctx.checkBody('languageType').default('freelog_policy_lang').in(['freelog_policy_lang']).value
            let presentableList = ctx.checkBody('presentables').exist().isArray().len(2, 999).value

            ctx.allowContentType({type: 'json'}).validate().validatePresentableList(presentableList)

            let presentableIds = []
            let contractIds = [...new Set(presentableList.map(item => item.contractId))]

            let existPresentableTask = dataProvider.presentableProvider.getPresentablesByContractIds(nodeId, contractIds)
            let contractInfoTask = ctx.curlIntranetApi(`${this.config.gatewayUrl}/api/v1/contracts/contractRecords?contractIds=${contractIds.toString()}`)

            await Promise.all([existPresentableTask, contractInfoTask]).then(([presentables, contractInfos]) => {

                contractInfos = contractInfos.filter(t => t.partyTwo === nodeId && t.contractType === ctx.app.contractType.ResourceToNode)

                if (contractInfos.length !== contractIds.length) {
                    let errorContractIds = presentableList.filter(item => !contractInfos.some(t => t.contractId === item.contractId))
                        .map(item => item.contractId)
                    return Promise.reject(`contractId:[${errorContractIds.toString()}]有误,请检查合同ID`)
                }

                presentableList.forEach(item => {
                    item.presentableInfo = presentables.find(x => x.contractId === item.contractId)
                    item.contractInfo = contractInfos.find(x => x.contractId === item.contractId)
                    if (item.presentableInfo) {
                        item.presentableInfo = item.presentableInfo.toObject()
                    }
                })

                presentableIds = presentables.map(x => x.toObject().presentableId)

            }).catch(err => ctx.error(err))

            let resourceIds = [...new Set(presentableList.map(item => item.contractInfo.resourceId))]

            let errors = []
            if (resourceIds.length) {
                let resourceInfos = await ctx.curlIntranetApi(`${this.config.gatewayUrl}/api/v1/resources/list?resourceIds=${resourceIds.toString()}`)

                if (resourceInfos.length !== resourceIds.length) {
                    ctx.error({msg: '资源数据获取失败'})
                }

                presentableList.forEach(item => {
                    item.resourceInfo = resourceInfos.find(x => x.resourceId === item.contractInfo.resourceId)

                    //模拟测试数据
                    // if (item.resourceInfo.resourceId === '85101f76c87a6b8c7f187fda8e5f885666b8e86f') {
                    //     item.resourceInfo.resourceType = 'widget'
                    // } else {
                    //     item.resourceInfo.resourceType = 'page_build'
                    // }

                    if (item.resourceInfo.resourceType !== ctx.app.resourceType.WIDGET &&
                        item.resourceInfo.resourceType !== ctx.app.resourceType.PAGE_BUILD) {
                        errors.push(new Error(`合同(${item.contractId})对应的资源类型错误`))
                    }
                })
            }
            if (errors.length) {
                ctx.error({msg: '数据校验失败', data: errors.map(t => t.message)})
            }

            let pageBuildPresentables = presentableList.filter(item => item.resourceInfo.resourceType === ctx.app.resourceType.PAGE_BUILD)
            if (pageBuildPresentables.length !== 1) {
                ctx.error({msg: 'presentables中有且只有一个page_build类型的资源合同'})
            }

            let pageBuildPresentable = pageBuildPresentables[0]
            if (pageBuildPresentable.presentableInfo) {
                ctx.error({msg: '同一个page_build类型的合同只能创建一次presentable'})
            }

            let awaitCreateWidgetPresentables = presentableList.filter(item => !item.presentableInfo).map(item => {
                let model = {
                    nodeId,
                    name: item.name,
                    resourceId: item.resourceInfo.resourceId,
                    policyText: new Buffer(item.policyText, 'base64').toString(),
                    languageType: languageType,
                    contractId: item.contractId,
                    userId: ctx.request.userId,
                    tagInfo: {
                        resourceInfo: {
                            resourceId: item.resourceInfo.resourceId,
                            resourceName: item.resourceInfo.resourceName,
                            resourceType: item.resourceInfo.resourceType,
                            mimeType: item.resourceInfo.mimeType
                        },
                        userDefined: []
                    }
                }
                if (item.resourceInfo.resourceType === ctx.app.resourceType.PAGE_BUILD) {
                    model.tagInfo.widgetPresentables = presentableIds
                }
                return model
            })

            await dataProvider.presentableProvider.createPageBuildPresentable(awaitCreateWidgetPresentables).bind(ctx).then(dataList => {
                ctx.success(dataList.find(t => t.contractId === pageBuildPresentable.contractId))
            }).catch(ctx.error)
        }

        /**
         * pb关联widget
         * @param ctx
         * @returns {Promise<void>}
         */
        async pageBuildAssociateWidget(ctx) {

            let pbPresentableId = ctx.checkBody('pbPresentableId').isMongoObjectId().value
            let increaseContractIds = ctx.checkBody('increaseContractIds').optional().isArray().len(0, 100).value
            let removeContractIds = ctx.checkBody('removeContractIds').optional().isArray().len(0, 100).value
            ctx.allowContentType({type: 'json'}).validate()

            if (!increaseContractIds && !removeContractIds) {
                ctx.error({msg: 'increaseContractIds与removeContractIds最少需要传入一个参数'})
            }

            let presentableInfo = await dataProvider.presentableProvider.getPresentable({
                _id: pbPresentableId,
                userId: ctx.request.userId
            })

            if (!presentableInfo) {
                ctx.error({msg: 'presentableId错误.'})
            }

            if (presentableInfo.tagInfo.resourceInfo.resourceType !== ctx.app.resourceType.PAGE_BUILD) {
                ctx.error({msg: 'presentable的资源类型错误'})
            }

            if (increaseContractIds && increaseContractIds.length) {
                let contractInfos = await ctx.curlIntranetApi(`${this.config.gatewayUrl}/api/v1/contracts/list?contractIds=${increaseContractIds.toString()}`)
                if (contractInfos.length !== increaseContractIds.length) {
                    ctx.error({msg: '参数increaseContractIds信息错误'})
                }

                let resourceInfo = await ctx.curlIntranetApi(`${this.config.gatewayUrl}/api/v1/resources/${presentableInfo.resourceId}`)
                if (contractInfos.some(x => !resourceInfo.systemMeta.widgets.some(t => t.resourceId === x.resourceId))) {
                    ctx.error({msg: '参数increaseContractIds信息与pbPresentableId信息校验失败'})
                }

                increaseContractIds = contractInfos.map(item => {
                    return {
                        resourceId: item.resourceId,
                        contractId: item.resourceId
                    }
                })
            }

            let widgetRelation = await dataProvider.pagebuildWidgetRelationProvider.getWidgetRelation({presentableId: pbPresentableId}).then(data => {
                return data ? data : {
                    presentableId: pbPresentableId,
                    resourceId: presentableInfo.resourceId,
                    contractId: presentableInfo.contractId,
                    relevanceContractIds: [],
                    status: 0
                }
            })

            //合并需要新增的
            if (increaseContractIds) {
                widgetRelation.relevanceContractIds = widgetRelation.relevanceContractIds.concat(increaseContractIds)
            }
            //删除需要移除的
            if (removeContractIds) {
                widgetRelation.relevanceContractIds = widgetRelation.relevanceContractIds.filter(x => !removeContractIds.some(y => y === x.contractId))
            }

            let contractGroup = lodash.groupBy(widgetRelation.relevanceContractIds, 'resourceId')
            let errorContract = Object.keys(contractGroup).filter(item => contractGroup[item].length > 1)
            if (errorContract.length) {
                ctx.error({msg: '同一个资源只能关联一个合同,请检查参数', data: errorContract})
            }

            await dataProvider.pagebuildWidgetRelationProvider.createOrUpdate(widgetRelation).bind(ctx)
                .then(ctx.success).catch(ctx.error)
        }


        /**
         * 获取pb-presentable的插件合同
         * @param ctx
         * @returns {Promise<void>}
         */
        async pageBuildAssociateWidgetContract(ctx) {

            let presentableId = ctx.checkQuery('presentableId').isMongoObjectId().value
            ctx.validate()

            let presentableInfo = await dataProvider.presentableProvider.getPresentable({_id: presentableId})

            if (!presentableInfo || presentableInfo.tagInfo.resourceInfo.resourceType !== ctx.app.resourceType.PAGE_BUILD) {
                ctx.error({msg: 'presentableId错误或者presentable的资源类型错误.'})
            }

            let resourceInfo = await ctx.curlIntranetApi(`${this.config.gatewayUrl}/api/v1/resources/${presentableInfo.resourceId}`)
            let relevanceContractIds = await dataProvider.pagebuildWidgetRelationProvider.getWidgetRelation({presentableId}).then(data => {
                return data ? data.relevanceContractIds : []
            })

            let result = resourceInfo.systemMeta.widgets.map(item => {
                let relevanceContract = relevanceContractIds.find(x => x.resourceId === item.resourceId)
                return {
                    resourceId: item.resourceId,
                    resourceName: item.resourceName,
                    contractId: relevanceContract ? relevanceContract.contractId : ''
                }
            })

            ctx.success({presentableInfo, resourceInfo, widgets: result})
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