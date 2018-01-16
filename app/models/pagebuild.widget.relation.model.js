/**
 * Created by yuliang on 2017/8/15.
 */

'use strict'

const mongoose = require('mongoose')

const PageBuildWidgetRelationSchema = new mongoose.Schema({
    presentableId: {type: String, required: true},
    resourceId: {type: String, required: true}, //PB资源ID
    contractId: {type: String, required: true}, //PB资源的合同ID
    relevanceContractIds: {type: Array, default: []}, //PB-presentable关联的widget合同
    status: {type: Number, default: 0, required: true} //状态
}, {
    versionKey: false,
    timestamps: {createdAt: 'createDate', updatedAt: 'updateDate'},
})

PageBuildWidgetRelationSchema.index({presentableId: 1});

module.exports = mongoose.model('pagebuild-widget-relations', PageBuildWidgetRelationSchema)