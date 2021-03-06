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
        releaseId: {type: String, required: true},
        releaseName: {type: String, required: true},
        version: {type: String, required: true},
        releaseSchemeId: {type: String, required: true},
        parentReleaseSchemeId: {type: String, required: false},
        deep: {type: Number, required: true},
    }, {_id: false})

    const PresentableAuthTreeSchema = new mongoose.Schema({
        nodeId: {type: Number, required: true},
        presentableId: {type: String, unique: true, default: ''},
        version: {type: String, required: true},
        masterReleaseId: {type: String, required: true},
        authTree: {type: [AuthTreeSchema], default: []},
        status: {type: Number, default: 0, required: true} //状态 0:初始态
    }, {
        versionKey: false,
        toJSON: toObjectOptions,
        toObject: toObjectOptions,
        timestamps: {createdAt: 'createDate', updatedAt: 'updateDate'}
    })

    PresentableAuthTreeSchema.index({presentableId: 1}, {unique: true});

    return mongoose.model('presentable-auth-trees', PresentableAuthTreeSchema)
}