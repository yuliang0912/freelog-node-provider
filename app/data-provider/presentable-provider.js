/**
 * Created by yuliang on 2017/10/31.
 */

'use strict'

const policyParse = require('../extend/helper/policy_parse_factory')
const MongoBaseOperation = require('egg-freelog-database/lib/database/mongo-base-operation')

module.exports = class PresentableProvider extends MongoBaseOperation {

    constructor(app) {
        super(app.model.Presentable)
        this.app = app
    }

    /**
     * 创建presentable
     * @param model
     * @returns {Promise}
     */
    createPresentable(model) {

        if (!super.type.object(model)) {
            return Promise.reject(new Error("model must be object"))
        }

        return super.findOneAndUpdate({
            resourceId: model.resourceId,
            nodeId: model.nodeId
        }, model).then(oldInfo => {
            return oldInfo ? super.findById(oldInfo._id) : super.create(model)
        })
    }

    /**
     * 更新消费策略
     * @param model
     * @param condition
     * @returns {Promise}
     */
    updatePresentable(model, condition) {

        if (!super.type.object(model)) {
            return Promise.reject(new Error("model must be object"))
        }

        if (model.policyText && model.languageType) {
            model.policy = policyParse.parse(model.policyText, model.languageType)
            model.serialNumber = this.app.mongoose.getNewObjectId()
        }

        return super.update(condition, model)
    }


    /**
     * 查找单个消费策略
     * @param condtion
     * @returns {Promise}
     */
    getPresentable(condition) {
        return super.findOne(condition)
    }

    /**
     * 查找单个消费策略
     * @param condtion
     * @returns {Promise}
     */
    getPresentableById(presentableId) {
        return super.findById(presentableId)
    }

    /**
     * 查找多个消费策略
     * @param condtion
     * @returns {Promise}
     */
    getPresentableList(condition) {

        //let projection = '_id presentableName userDefinedTags resourceId nodeId userId status createDate'

        return super.find(condition)
    }

    /**
     * 根据合同ID批量获取presentables
     */
    getPresentablesByContractIds(nodeId, contractIds) {

        if (!Array.isArray(contractIds)) {
            return Promise.reject(new Error("contractIds must be array"))
        }

        if (contractIds.length < 1) {
            return Promise.resolve([])
        }

        let projection = '_id createDate name resourceId contractId nodeId userId serialNumber status'

        return super.find({nodeId, contractId: {$in: contractIds}}, projection)
    }

    /**
     * 批量新增presentables
     * @param presentables
     */
    createPageBuildPresentable(presentables) {

        if (!Array.isArray(presentables)) {
            return Promise.reject(new Error("presentables must be array"))
        }

        if (!presentables.length) {
            return Promise.resolve([])
        }

        let pbPresentable = presentables.find(x => x.tagInfo.resourceInfo.resourceType === 'page_build')

        presentables.forEach(model => {
            model._id = this.app.mongoose.getNewObjectId()
            model.policy = policyParse.parse(model.policyText, model.languageType)
            model.serialNumber = this.app.mongoose.getNewObjectId()
            if (model.tagInfo.resourceInfo.resourceType === 'widget') {
                pbPresentable.widgetPresentables.push(model._id.toString())
            }
        })

        return super.insertMany(presentables)
    }
}