/**
 * Created by yuliang on 2017/8/15.
 */

const mongoModels = require('../models/index')

module.exports = app => {
    return class PresentableService extends app.Service {

        /**
         * 创建presentable
         * @param model
         * @returns {*}
         */
        createPresentable(model) {

            if (!this.app.type.object(model)) {
                return Promise.reject(new Error("model must be object"))
            }

            return mongoModels.presentable.create(model).then()
        }

        /**
         * 更新消费策略
         * @param model
         * @param condition
         */
        updatePresentable(model, condition) {

            if (!this.app.type.object(model)) {
                return Promise.reject(new Error("model must be object"))
            }

            if (!this.app.type.object(condition)) {
                return Promise.reject(new Error("condition must be object"))
            }

            return mongoModels.presentable.update(condition, model)
        }


        /**
         * 查找单个消费策略
         * @param condtion
         * @returns {Query|*}
         */
        getPresentable(condition) {

            if (!this.app.type.object(condition)) {
                return Promise.reject(new Error("condition must be object"))
            }

            return mongoModels.presentable.findOne(condition)
        }

        /**
         * 查找单个消费策略
         * @param condtion
         * @returns {Query|*}
         */
        getPresentableList(condition) {

            if (!this.app.type.object(condition)) {
                return Promise.reject(new Error("condition must be object"))
            }

            return mongoModels.presentable.find(condition)
        }
    }
}