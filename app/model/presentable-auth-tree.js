/**
 * Created by yuliang on 2017/8/15.
 */

'use strict'

module.exports = app => {

    const mongoose = app.mongoose;

    const AuthTreeSchema = new mongoose.Schema({
        resourceId: {type: String, required: true},
        contractId: {type: String, required: true},
        authSchemeId: {type: String, required: true},
        deep: {type: Number, required: true},
        parentAuthSchemeId: {type: String, required: false},
    }, {_id: false})

    const PresentableAuthTreeSchema = new mongoose.Schema({
        nodeId: {type: Number, required: true},
        presentableId: {type: String, unique: true, default: ''},
        masterResourceId: {type: String, required: true},
        authTree: {type: [AuthTreeSchema], default: []},
        status: {type: Number, default: 0, required: true} //状态 0:初始态
    }, {
        versionKey: false,
        timestamps: {createdAt: 'createDate', updatedAt: 'updateDate'}
    })

    PresentableAuthTreeSchema.index({presentableId: 1}, {unique: true});

    return mongoose.model('presentable-auth-tree', PresentableAuthTreeSchema)
}