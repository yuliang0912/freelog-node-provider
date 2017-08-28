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

            if (model.languageType === 'yaml') {
                model.viewingPolicy = yaml.safeLoad(model.viewingPolicyText)
            }

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

            if (model.viewingPolicyText) {
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

            return mongoModels.presentable.find(condition).exec()
        }
    }
}