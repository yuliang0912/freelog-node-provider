import {omit} from 'lodash';
import {scope, provide, plugin} from 'midway';
import {MongooseModelBase} from 'egg-freelog-base/database/mongoose-model-base';

@scope('Singleton')
@provide('model.NodeTestRuleInfo')
export class TestRuleInfo extends MongooseModelBase {

    constructor(@plugin('mongoose') mongoose) {
        super(mongoose);
    }

    buildMongooseModel() {

        const TestRuleInfo = new this.mongoose.Schema({
            id: {type: String, required: true},
            ruleInfo: {type: this.mongoose.Schema.Types.Mixed, default: {}, required: true},
            matchErrors: {type: [String], required: true, default: []},
            efficientInfos: {type: [], required: true, default: []}
        }, {_id: false, minimize: false})

        const NodeTestRuleSchema = new this.mongoose.Schema({
            nodeId: {type: Number, required: true}, //节点ID
            userId: {type: Number, required: true}, //节点用户ID
            ruleText: {type: String, required: false, default: ''},
            themeId: {type: String, required: false, default: ''}, //节点主题ID
            testRules: {
                type: [TestRuleInfo], required: false
            },
            status: {type: Number, default: 0}
        }, {
            minimize: false,
            versionKey: false,
            toJSON: TestRuleInfo.toObjectOptions,
            toObject: TestRuleInfo.toObjectOptions,
            timestamps: {createdAt: 'createDate', updatedAt: 'updateDate'}
        })

        NodeTestRuleSchema.index({nodeId: 1}, {unique: true});

        return this.mongoose.model('node-test-rules', NodeTestRuleSchema);
    }

    static get toObjectOptions() {
        return {
            transform(doc, ret) {
                return omit(ret, ['_id', 'id']);
            }
        };
    }
}
