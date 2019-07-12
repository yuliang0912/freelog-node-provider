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

    //创建合同时,实时编译.
    const PolicySchema = new mongoose.Schema({
        policyId: {type: String, required: true},
        policyName: {type: String, required: true},
        policyText: {type: String, required: true},
        status: {type: Number, required: true}, // 0:不启用  1:启用
        authorizedObjects: [] //授权对象
    }, {_id: false})

    const BaseReleaseInfo = new mongoose.Schema({
        releaseId: {type: String, required: true},
        releaseName: {type: String, required: true},
        version: {type: String, required: true},
        resourceType: {type: String, required: true}
    }, {_id: false})

    const BaseContractInfo = new mongoose.Schema({
        policyId: {type: String, required: true},  //不确定是否需要在新建方案时就确定策略.因为此时不签约.担心后续签约时,策略不存在.然后需要重新新建方案.
        contractId: {type: String, default: '', required: false}, //方案解决所使用的合同ID
    }, {_id: false})

    //声明处理的依赖
    const ResolveReleaseSchema = new mongoose.Schema({
        releaseId: {type: String, required: true},
        releaseName: {type: String, required: true},
        contracts: [BaseContractInfo],
    }, {_id: false})

    const PresentableSchema = new mongoose.Schema({
        presentableName: {type: String, default: ''},
        policies: {type: [PolicySchema], default: []}, //引用策略段
        nodeId: {type: Number, required: true}, //节点ID
        userId: {type: Number, required: true}, //创建者ID
        releaseInfo: {type: BaseReleaseInfo, required: true},
        resolveReleases: {type: [ResolveReleaseSchema], required: true}, //声明解决的发行资源,
        userDefinedTags: {type: [String], default: []},//用户自定义tags
        intro: {type: String, default: ''},//presentable简介
        isOnline: {type: Number, default: 0, required: true}, //是否上线 0:否 1:是
        contractStatus: {type: Number, default: 0, required: true}, //合同状态 0:签约中 1:签约成功 2:签约失败 11:全部激活 12:未全部激活
        status: {type: Number, default: 0, required: true}, //状态 0:初始态 1:节点侧合约授权失败 2:发行侧合约授权失败 4:节点侧合约授权通过 8:发行侧合约授权通过
    }, {
        versionKey: false,
        timestamps: {createdAt: 'createDate', updatedAt: 'updateDate'},
        toJSON: toObjectOptions,
        toObject: toObjectOptions
    })

    PresentableSchema.virtual('presentableId').get(function () {
        return this.id
    })

    PresentableSchema.index({userId: 1, nodeId: 1});
    PresentableSchema.index({nodeId: 1, 'releaseInfo.releaseId': 1}, {unique: true});

    return mongoose.model('presentables', PresentableSchema)
}