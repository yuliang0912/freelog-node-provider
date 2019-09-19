'use strict'

const lodash = require('lodash')

module.exports = app => {

    const mongoose = app.mongoose;

    const toObjectOptions = {
        transform(doc, ret, options) {
            return Object.assign({testResourceId: doc.id}, lodash.omit(ret, ['_id']))
        }
    }

    const DependencyTreeSchema = new mongoose.Schema({
        id: {type: String, required: true},
        name: {type: String, required: true},
        type: {type: String, required: true},
        deep: {type: String, required: true},
        version: {type: String, required: false},
        parentId: {type: String, required: false},
        parentVersion: {type: String, required: false},
    }, {_id: false})

    const TestResourceDependencyTreeSchema = new mongoose.Schema({
        testResourceName: {type: String, required: true},
        nodeId: {type: Number, required: true},
        dependencyTree: {type: [DependencyTreeSchema], default: []},
        status: {type: Number, default: 0, required: true} //状态 0:初始态
    }, {
        versionKey: false,
        toJSON: toObjectOptions,
        toObject: toObjectOptions,
        timestamps: {createdAt: 'createDate', updatedAt: 'updateDate'}
    })

    DependencyTreeSchema.index({name: 1})

    TestResourceDependencyTreeSchema.virtual("testResourceId").get(function () {
        return this.id
    })

    return mongoose.model('test-resource-dependency-trees', TestResourceDependencyTreeSchema)
}