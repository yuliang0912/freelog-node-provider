'use strict'

module.exports = app => {
    const mongoose = app.mongoose;

    const toObjectOptions = {
        transform(doc, ret, options) {
            return {
                key: ret.key,
                value: ret.value,
                userId: ret.userId,
                nodeId: ret.nodeId,
                createDate: ret.createDate,
                updateDate: ret.updateDate
            }
        }
    }

    const CustomDataStoreSchema = new mongoose.Schema({
        key: {type: String, unique: true, required: true},
        value: {type: {}}, //自定义存储值
        nodeId: {type: Number, required: true}, //节点ID
        userId: {type: Number, required: true}, //创建者ID
        status: {type: Number, default: 0, required: true} //状态
    }, {
        versionKey: false,
        timestamps: {createdAt: 'createDate', updatedAt: 'updateDate'},
        toJSON: toObjectOptions,
        toObject: toObjectOptions
    })

    CustomDataStoreSchema.index({key: 1});

    return mongoose.model('custom-store', CustomDataStoreSchema)
}