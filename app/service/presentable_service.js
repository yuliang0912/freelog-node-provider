/**
 * Created by yuliang on 2017/8/15.
 */

const mongoModels = require('../models/index')
const yaml = require('js-yaml')

module.exports = app => {
    return class PresentableService extends app.Service {

        /**
         * 创建presentable
         * @param model
         * @returns {Promise}
         */
        createPresentable(model) {

            if (!this.app.type.object(model)) {
                return Promise.reject(new Error("model must be object"))
            }

            model.policy = this.ctx.helper.policyParse(model.policyText, model.languageType)
            model.serialNumber = mongoModels.ObjectId

            return mongoModels.presentable.create(model)
        }

        /**
         * 更新消费策略
         * @param model
         * @param condition
         * @returns {Promise}
         */
        updatePresentable(model, condition) {

            if (!this.app.type.object(model)) {
                return Promise.reject(new Error("model must be object"))
            }

            if (!this.app.type.object(condition)) {
                return Promise.reject(new Error("condition must be object"))
            }

            if (model.languageType === 'yaml' && model.policyText) {
                model.policy = yaml.safeLoad(model.policyText)
                model.policy = this.ctx.helper.policySegmentIdGenerator(model.policy)
                model.serialNumber = mongoModels.ObjectId
            }

            return mongoModels.presentable.update(condition, model).exec()
        }


        /**
         * 查找单个消费策略
         * @param condtion
         * @returns {Promise}
         */
        getPresentable(condition) {

            if (!this.app.type.object(condition)) {
                return Promise.reject(new Error("condition must be object"))
            }

            return mongoModels.presentable.findOne(condition).exec()
        }

        /**
         * 查找多个消费策略
         * @param condtion
         * @returns {Promise}
         */
        getPresentableList(condition) {

            if (!this.app.type.object(condition)) {
                return Promise.reject(new Error("condition must be object"))
            }

            let projection = '_id createDate name resourceId contractId nodeId userId serialNumber status tagInfo'

            return mongoModels.presentable.find(condition, projection).exec()
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

            return mongoModels.presentable.find({nodeId, contractId: {$in: contractIds}}, projection).exec()
        }
    }
}