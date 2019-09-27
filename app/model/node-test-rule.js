'use strict'

const lodash = require('lodash')

module.exports = app => {

    const mongoose = app.mongoose;

    const toObjectOptions = {
        transform(doc, ret, options) {
            return lodash.omit(ret, ['_id'])
        }
    }

    const TestRuleInfo = new mongoose.Schema({
        id: {type: String, required: true},
        text: {type: String, required: true},
        ruleInfo: {},
        matchErrors: {type: [String], required: false, default: []},
        effectiveMatchCount: {type: Number, required: false, default: 0}
    }, {_id: false})

    const NodeTestRuleSchema = new mongoose.Schema({
        nodeId: {type: Number, required: true}, //节点ID
        userId: {type: Number, required: true}, //节点用户ID
        ruleText: {type: String, required: false, default: ''},
        testRules: {
            type: [TestRuleInfo], required: true
        },
        status: {type: Number, default: 0}
    }, {
        versionKey: false,
        toJSON: toObjectOptions,
        toObject: toObjectOptions,
        timestamps: {createdAt: 'createDate', updatedAt: 'updateDate'}
    })

    NodeTestRuleSchema.index({nodeId: 1}, {unique: true});

    return mongoose.model('node-test-rules', NodeTestRuleSchema)
}