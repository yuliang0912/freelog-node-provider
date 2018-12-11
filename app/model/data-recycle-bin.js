/**
 * Created by yuliang on 2017/8/15.
 */

'use strict'

module.exports = app => {

    const mongoose = app.mongoose;

    const DataRecycleBinSchema = new mongoose.Schema({
        primaryKey: {type: String, required: true},
        dataType: {type: String, required: true},
        data: {},
        status: {type: Number, default: 0, required: true}
    }, {
        versionKey: false,
        timestamps: {createdAt: 'createDate', updatedAt: 'updateDate'}
    })

    DataRecycleBinSchema.index({primaryKey: 1, dataType: 1}, {unique: true});

    return mongoose.model('data-recycle-bin', DataRecycleBinSchema)
}