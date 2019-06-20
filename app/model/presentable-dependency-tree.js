'use strict'

module.exports = app => {

    const mongoose = app.mongoose;

    const DependencyTreeSchema = new mongoose.Schema({
        releaseId: {type: String, required: true},
        releaseName: {type: String, required: true},
        version: {type: String, required: true},
        versionRange: {type: String, required: true},
        resourceId: {type: String, required: true},
        releaseSchemeId: {type: String, required: true},
        deep: {type: Number, required: true},
        parentReleaseId: {type: String, required: false},
        parentReleaseVersion: {type: String, required: false},
    }, {_id: false})

    const PresentableVersionLockSchema = new mongoose.Schema({
        nodeId: {type: Number, required: true},
        presentableId: {type: String, default: ''},
        version: {type: String, required: true},
        masterReleaseId: {type: String, required: true},
        dependencyTree: {type: [DependencyTreeSchema], default: []},
        status: {type: Number, default: 0, required: true} //状态 0:初始态
    }, {
        versionKey: false,
        timestamps: {createdAt: 'createDate', updatedAt: 'updateDate'}
    })

    PresentableVersionLockSchema.index({presentableId: 1, version: 1}, {unique: true});

    return mongoose.model('presentable-dependency-trees', PresentableVersionLockSchema)
}