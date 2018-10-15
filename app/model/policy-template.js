'use strict'

const lodash = require('lodash')

module.exports = app => {
    const mongoose = app.mongoose;

    const toObjectOptions = {
        transform(doc, ret, options) {
            return Object.assign({id: doc.id}, lodash.omit(ret, ['_id']))
        }
    }

    const PolicyTemplateSchema = new mongoose.Schema({
        name: {type: String},
        userId: {type: Number, required: true}, //创建者ID
        template: {type: String, required: true},
        templateType: {type: Number, required: true},
        isShare: {type: Number, required: true},
        status: {type: Number, default: 0, required: true} //状态
    }, {
        versionKey: false,
        timestamps: {createdAt: 'createDate', updatedAt: 'updateDate'},
        toJSON: toObjectOptions,
        toObject: toObjectOptions
    })

    PolicyTemplateSchema.index({key: 1});

    return mongoose.model('policy-templates', PolicyTemplateSchema)
}