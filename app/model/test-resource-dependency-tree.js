'use strict'

const lodash = require('lodash')

module.exports = app => {

    const mongoose = app.mongoose;

    const toObjectOptions = {
        transform(doc, ret, options) {
            return lodash.omit(ret, ['_id'])
        }
    }

    const DependencyTreeSchema = new mongoose.Schema({
        id: {type: String, required: true},
        name: {type: String, required: true},
        type: {type: String, required: true},
        deep: {type: Number, required: true},
        version: {type: String, required: false},
        releaseSchemeId: {type: String, required: false},
        resourceId: {type: String, required: false},
        parentId: {type: String, required: false},
        parentVersion: {type: String, required: false},
        replaced: {},
    }, {_id: false})

    const TestResourceDependencyTreeSchema = new mongoose.Schema({
        testResourceId: {type: String, required: true, unique: true},
        testResourceName: {type: String, required: true},
        nodeId: {type: Number, required: true},
        masterEntityId: {type: String, required: true},
        dependencyTree: {type: [DependencyTreeSchema], default: []},
        status: {type: Number, default: 0, required: true} //状态 0:初始态
    }, {
        versionKey: false,
        toJSON: toObjectOptions,
        toObject: toObjectOptions,
        timestamps: {createdAt: 'createDate', updatedAt: 'updateDate'}
    })

    DependencyTreeSchema.index({name: 1})

    return mongoose.model('test-resource-dependency-trees', TestResourceDependencyTreeSchema)
}