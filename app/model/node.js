'use strict'

const lodash = require('lodash')

module.exports = app => {

    const mongoose = app.mongoose;

    const toObjectOptions = {
        transform(doc, ret, options) {
            return lodash.omit(ret, ['_id'])
        }
    }

    const NodeSchema = new mongoose.Schema({
        nodeId: {type: Number, unique: true, required: true},
        nodeName: {type: String, unique: true, required: true},
        nodeDomain: {type: String, unique: true, required: true},
        pageBuildId: {type: String, unique: true, required: false, default: ''},
        ownerUserId: {type: Number, required: true},
        status: {type: Number, default: 0, required: true}, //状态 节点状态(0:未发布 1:已发布 2:系统冻结)
    }, {
        versionKey: false,
        timestamps: {createdAt: 'createDate', updatedAt: 'updateDate'},
        toJSON: toObjectOptions,
        toObject: toObjectOptions
    })

    return mongoose.model('node', NodeSchema)
}