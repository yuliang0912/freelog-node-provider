import {omit} from 'lodash';
import {scope, provide} from 'midway';
import {MongooseModelBase, IMongooseModelBase} from './mongoose-model-base';

@scope('Singleton')
@provide('model.NodeTestRuleInfo')
export class NodeTestRuleInfo extends MongooseModelBase implements IMongooseModelBase {

    buildMongooseModel() {

        const TestRuleInfo = new this.mongoose.Schema({
            id: {type: String, required: true},
            text: {type: String, required: true},
            ruleInfo: {type: this.mongoose.Schema.Types.Mixed, default: {}, required: true},
            matchErrors: {type: [String], required: false, default: []},
            effectiveMatchCount: {type: Number, required: false, default: 0}
        }, {_id: false, minimize: false})

        const NodeTestRuleSchema = new this.mongoose.Schema({
            nodeId: {type: Number, required: true}, //节点ID
            userId: {type: Number, required: true}, //节点用户ID
            ruleText: {type: String, required: false, default: ''},
            themeId: {type: String, required: false, default: ''}, //节点用户ID
            testRules: {
                type: [TestRuleInfo], required: true
            },
            status: {type: Number, default: 0}
        }, {
            minimize: false,
            versionKey: false,
            toJSON: NodeTestRuleInfo.toObjectOptions,
            toObject: NodeTestRuleInfo.toObjectOptions,
            timestamps: {createdAt: 'createDate', updatedAt: 'updateDate'}
        })

        NodeTestRuleSchema.index({nodeId: 1}, {unique: true});

        return this.mongoose.model('node-test-rules', TestRuleInfo);
    }

    static get toObjectOptions() {
        return {
            transform(doc, ret) {
                return omit(ret, ['_id', 'id']);
            }
        };
    }
}
