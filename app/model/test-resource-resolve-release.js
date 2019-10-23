'use strict'

const lodash = require('lodash')

module.exports = app => {

    const mongoose = app.mongoose;

    const toObjectOptions = {
        transform(doc, ret, options) {
            return lodash.omit(ret, ['_id'])
        }
    }

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

    const TestResourceResolveReleaseSchema = new mongoose.Schema({
        nodeId: {type: Number, required: true}, //节点ID
        testResourceId: {type: String, required: true, unique: true},
        testResourceName: {type: String, required: true},
        resolveReleases: {type: [ResolveReleaseSchema], default: [], required: false},
        resolveReleaseSignStatus: {type: Number, default: 0, required: true}, // 1:已全部签约  2:未全部签约
        status: {type: Number, default: 0, required: true}
    }, {
        versionKey: false,
        timestamps: {createdAt: 'createDate', updatedAt: 'updateDate'},
        toJSON: toObjectOptions,
        toObject: toObjectOptions
    })

    TestResourceResolveReleaseSchema.index({testResourceId: 1, nodeId: 1});

    return mongoose.model('test-resource-resolve-release', TestResourceResolveReleaseSchema)
}