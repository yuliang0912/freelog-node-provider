/**
 * Created by yuliang on 2017/8/15.
 */

'use strict'

const mongoose = require('mongoose')

const toObjectOptions = {
    transform: function (doc, ret, options) {
        return {
            presentableId: ret._id,
            name: ret.name,
            resourceId: ret.resourceId,
            contractId: ret.contractId,
            userId: ret.userId,
            nodeId: ret.nodeId,
            serialNumber: ret.serialNumber,
            createDate: ret.createDate,
            updateDate: ret.updateDate,
            expireDate: ret.expireDate,
            viewingPolicy: ret.viewingPolicy,
            viewingPolicyText: ret.viewingPolicyText,
            languageType: ret.languageType,
            status: ret.status
        }
    }
}

const PresentableSchema = new mongoose.Schema({
    name: {type: String, required: true},
    viewingPolicy: {  //预览策略
        user: {type: Array, required: true},
        license: {type: String, required: true},
        payMent: {type: String, required: true}
    }, //预览策略段
    viewingPolicyText: {type: String, default: []}, //引用策略描述语言原文
    languageType: {type: String, required: true}, //描述语言类型,yaml或者其他
    nodeId: {type: Number, required: true}, //节点ID
    userId: {type: Number, required: true}, //创建者ID
    contractId: {type: String, required: true}, //合同ID
    resourceId: {type: String, required: true}, //资源ID
    serialNumber: {type: String, required: true}, //序列号,用于校验前端与后端是否一致
    expireDate: {type: Date, required: true},
    status: {type: Number, default: 0, required: true} //状态
}, {
    versionKey: false,
    timestamps: {createdAt: 'createDate', updatedAt: 'updateDate'},
    toJSON: toObjectOptions,
    toObject: toObjectOptions
})

PresentableSchema.index({nodeId: 1, userId: 1});

module.exports = mongoose.model('presentable', PresentableSchema)