'use strict'

const lodash = require('lodash')

module.exports = app => {

    const mongoose = app.mongoose;

    const toObjectOptions = {
        transform(doc, ret, options) {
            return lodash.omit(ret, ['_id'])
        }
    }

    const AuthTreeSchema = new mongoose.Schema({
        id: {type: String, required: true},
        name: {type: String, required: true},
        type: {type: String, required: true},
        deep: {type: Number, required: true},
        version: {type: String, required: false},
        parentId: {type: String, required: false},
        parentVersion: {type: String, required: false},
        userId: {type: Number, required: false}, //发行才有此值
        releaseSchemeId: {type: String, required: false}, //如果是发行,才有此值
        resourceId: {type: String, required: false},
    }, {_id: false})

    const TestResourceAuthTreeSchema = new mongoose.Schema({
        testResourceId: {type: String, required: true, unique: true},
        testResourceName: {type: String, required: true},
        nodeId: {type: Number, required: true},
        authTree: {type: [AuthTreeSchema], default: []},
        status: {type: Number, default: 0, required: true} //状态 0:初始态
    }, {
        versionKey: false,
        toJSON: toObjectOptions,
        toObject: toObjectOptions,
        timestamps: {createdAt: 'createDate', updatedAt: 'updateDate'}
    })

    TestResourceAuthTreeSchema.index({testResourceId: 1})

    return mongoose.model('test-resource-auth-trees', TestResourceAuthTreeSchema)
}