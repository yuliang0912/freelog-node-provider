/**
 * Created by yuliang on 2017/8/15.
 */

'use strict'

module.exports = app => {

    const mongoose = app.mongoose;

    const toObjectOptions = {
        transform(doc, ret, options) {
            return {
                presentableId: ret._id.toString(),
                presentableName: ret.presentableName,
                resourceId: ret.resourceId,
                userId: ret.userId,
                nodeId: ret.nodeId,
                nodeName: ret.nodeName,
                createDate: ret.createDate,
                updateDate: ret.updateDate,
                contracts: ret.contracts,
                policy: ret.policy,
                userDefinedTags: ret.userDefinedTags,
                resourceInfo: ret.resourceInfo,
                isOnline: ret.isOnline,
                status: ret.status
            }
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
        resourceInfo: {
            resourceType: {type: String, required: true},
            resourceName: {type: String, required: true},
        },
        contracts: {type: [AssociatedContractSchema], default: []},
        userDefinedTags: {type: [String], default: []},//用户自定义tags
        isOnline: {type: Number, default: 0, required: true}, //是否上线 0:否 1:是
        status: {type: Number, default: 0, required: true} //状态 0:初始态  1:合约已全部签订  2:策略已存在
    }, {
        versionKey: false,
        timestamps: {createdAt: 'createDate', updatedAt: 'updateDate'},
        toJSON: toObjectOptions,
        toObject: toObjectOptions
    })

    PresentableSchema.index({nodeId: 1, resourceId: 1});

    return mongoose.model('presentable', PresentableSchema)
}