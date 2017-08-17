/**
 * Created by yuliang on 2017/8/15.
 */

'use strict'

const mongoose = require('mongoose')

const PresentableSchema = new mongoose.Schema({
    name: {type: String, required: true},
    viewingPolicy: {  //预览策略
        user: {type: Array, required: true},
        license: {type: String, required: true},
        payMent: {type: String, required: true}
    }, //预览策略段
    viewingPolicyDescription: {type: String, default: []}, //引用策略描述语言原文
    nodeId: {type: Number, required: true}, //节点ID
    userId: {type: Number, required: true}, //创建者ID
    contractId: {type: String, required: true}, //合同ID
    resourceId: {type: String, required: true}, //资源ID
    expireDate: {type: Date, required: true},
    status: {type: Number, default: 0, required: true} //状态
}, {versionKey: false, timestamps: {createdAt: 'createDate', updatedAt: 'updateDate'}})

module.exports = mongoose.model('presentable', PresentableSchema)