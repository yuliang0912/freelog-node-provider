/**
 * Created by yuliang on 2017/8/15.
 */

'use strict'

const lodash = require('lodash')

module.exports = app => {

    const mongoose = app.mongoose;

    const toObjectOptions = {
        transform(doc, ret, options) {
            return Object.assign({presentableId: doc.id}, lodash.omit(ret, ['_id']))
        }
    }

    const AssociatedContractSchema = new mongoose.Schema({
        resourceId: {type: String, required: true},
        authSchemeId: {type: String, required: true},
        policySegmentId: {type: String, required: true},
        contractId: {type: String, required: true},
        status: {type: Number, required: true}
    }, {_id: false})

    const PresentableSchema = new mongoose.Schema({
        presentableName: {type: String, default: ''},
        policy: {type: Array, default: []}, //引用策略段
        nodeId: {type: Number, required: true}, //节点ID
        nodeName: {type: String, required: true},//节点名称
        userId: {type: Number, required: true}, //创建者ID
        resourceId: {type: String, required: true}, //资源ID
        masterContractId: {type: String, default: ''},//主合约ID
        resourceInfo: {
            resourceType: {type: String, required: true},
            resourceName: {type: String, required: true},
        },
        contracts: {type: [AssociatedContractSchema], default: []},
        userDefinedTags: {type: [String], default: []},//用户自定义tags
        presentableIntro: {type: String, default: ''},//presentable简介
        isOnline: {type: Number, default: 0, required: true}, //是否上线 0:否 1:是
        status: {type: Number, default: 0, required: true} //状态 0:初始态  1:合约已全部签订  2:策略已存在
    }, {
        versionKey: false,
        timestamps: {createdAt: 'createDate', updatedAt: 'updateDate'},
        toJSON: toObjectOptions,
        toObject: toObjectOptions
    })

    PresentableSchema.virtual('presentableId').get(function () {
        return this.id
    })

    //PresentableSchema.set("toObject", {getters: true})

    PresentableSchema.index({nodeId: 1, resourceId: 1}, {unique: true});

    return mongoose.model('presentable', PresentableSchema)
}