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

    const BaseRuleInfo = new mongoose.Schema({
        id: {type: String, required: true},
        operation: {type: String, required: true},
    }, {_id: false})

    const OriginInfoSchema = new mongoose.Schema({
        id: {type: String, required: true},
        name: {type: String, required: true},
        type: {type: String, required: true},  // release,mock,presentable,resource
        version: {type: String, required: false, default: null},
        versions: {type: [String], required: false, default: []}
    }, {_id: false})

    const ResourceFileInfoSchema = new mongoose.Schema({
        id: {type: String, required: true},
        type: {type: String, required: true}
    }, {_id: false})

    const DifferenceInfoSchema = new mongoose.Schema({
        onlineStatusInfo: {
            isOnline: {type: Number, required: true},
            ruleId: {type: String, default: '', required: false},//没有规则,代表默认原始的上线状态
        },
        userDefinedTagInfo: {
            tags: {type: [String], required: true},
            ruleId: {type: String, required: false},
        }
    }, {_id: false})

    const TestResourceSchema = new mongoose.Schema({
        nodeId: {type: Number, required: true}, //节点ID
        userId: {type: Number, required: true}, //用户ID
        testResourceId: {type: String, required: true, unique: true},
        testResourceName: {type: String, required: true},
        previewImages: {type: [String], required: true},
        resourceType: {type: String, required: true}, //资源类型
        intro: {type: String, required: false, default: ''}, //测试资源简介
        originInfo: {type: OriginInfoSchema, required: true},
        resourceFileInfo: {type: ResourceFileInfoSchema, required: true},
        differenceInfo: {type: DifferenceInfoSchema, required: true},
        resolveReleases: {type: [ResolveReleaseSchema], default: [], required: false},
        resolveReleaseSignStatus: {type: Number, default: 0, required: true}, // 1:已全部签约  2:未全部签约
        rules: {type: [BaseRuleInfo], default: []}, //结果匹配所用到的所有规则ID
        status: {type: Number, default: 0, required: true}
    }, {
        versionKey: false,
        timestamps: {createdAt: 'createDate', updatedAt: 'updateDate'},
        toJSON: toObjectOptions,
        toObject: toObjectOptions
    })

    TestResourceSchema.index({userId: 1, nodeId: 1});

    return mongoose.model('node-test-resources', TestResourceSchema)
}