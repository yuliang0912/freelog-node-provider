/**
 * Created by yuliang on 2017/8/15.
 */

'use strict'

const lodash = require('lodash')

module.exports = app => {

    // const mongoose = app.mongoose;
    //
    // const toObjectOptions = {
    //     transform(doc, ret, options) {
    //         return Object.assign({presentableId: doc.id}, lodash.omit(ret, ['_id']))
    //     }
    // }
    //
    // const BaseReleaseInfo = new mongoose.Schema({
    //     releaseId: {type: String, required: true},
    //     releaseName: {type: String, required: true},
    //     version: {type: String, required: true},
    //     resourceType: {type: String, required: true}
    // }, {_id: false})
    //
    //
    // const PresentableSchema = new mongoose.Schema({
    //     name: {type: String, default: ''},
    //     nodeId: {type: Number, required: true}, //节点ID
    //     userId: {type: Number, required: true}, //创建者ID
    //     originInfo: {
    //         id: {type: String, required: true},
    //         name: {type: String, required: true},
    //         type: {type: String, required: true}, // release.mock,presentable,resource
    //     },
    //     resolveReleases: {type: [ResolveReleaseSchema], required: true}, //声明解决的发行资源,
    //     userDefinedTags: {type: [String], default: []},//用户自定义tags
    //     intro: {type: String, default: ''},//presentable简介
    //     isOnline: {type: Number, default: 0, required: true}, //是否上线 0:否 1:是
    //     contractStatus: {type: Number, default: 0, required: true}, //合同状态 0:签约中 1:签约成功 2:签约失败 11:全部激活 12:未全部激活
    //     status: {type: Number, default: 0, required: true}, //状态 0:初始态 1:节点侧合约授权失败 2:发行侧合约授权失败 4:节点侧合约授权通过 8:发行侧合约授权通过
    // }, {
    //     versionKey: false,
    //     timestamps: {createdAt: 'createDate', updatedAt: 'updateDate'},
    //     toJSON: toObjectOptions,
    //     toObject: toObjectOptions
    // })
    //
    // PresentableSchema.virtual('presentableId').get(function () {
    //     return this.id
    // })
    //
    // PresentableSchema.index({userId: 1, nodeId: 1});
    // PresentableSchema.index({nodeId: 1, 'releaseInfo.releaseId': 1}, {unique: true});
    //
    // return mongoose.model('presentables', PresentableSchema)
}