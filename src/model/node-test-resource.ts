import {omit} from 'lodash';
import {scope, provide} from 'midway';
import {MongooseModelBase, IMongooseModelBase} from './mongoose-model-base';

@scope('Singleton')
@provide('model.NodeTestResourceInfo')
export class NodeTestResourceInfo extends MongooseModelBase implements IMongooseModelBase {

    buildMongooseModel() {

        const BaseContractInfo = new this.mongoose.Schema({
            policyId: {type: String, required: true},  //不确定是否需要在新建方案时就确定策略.因为此时不签约.担心后续签约时,策略不存在.然后需要重新新建方案.
            contractId: {type: String, default: '', required: false}, //方案解决所使用的合同ID
        }, {_id: false})

        //声明处理的依赖
        const ResolveResourceSchema = new this.mongoose.Schema({
            resourceId: {type: String, required: true},
            resourceName: {type: String, required: true},
            contracts: [BaseContractInfo],
        }, {_id: false})

        const OriginInfoSchema = new this.mongoose.Schema({
            id: {type: String, required: true},
            name: {type: String, required: true},
            type: {type: String, required: true},  // resource or object
            version: {type: String, required: false, default: null},
            versions: {type: [String], required: false, default: []}
        }, {_id: false})

        const DifferenceInfoSchema = new this.mongoose.Schema({
            onlineStatusInfo: {
                isOnline: {type: Number, required: true},
                ruleId: {type: String, default: '', required: false},//没有规则,代表默认原始的上线状态
            },
            userDefinedTagInfo: {
                tags: {type: [String], required: true},
                ruleId: {type: String, required: false},
            }
        }, {_id: false})

        const TestResourceSchema = new this.mongoose.Schema({
            nodeId: {type: Number, required: true},
            userId: {type: Number, required: true},
            testResourceId: {type: String, required: true, unique: true},
            testResourceName: {type: String, required: true},
            coverImages: {type: [String], default: [], required: false},
            associatedPresentableId: {type: String, default: "", required: false},
            resourceType: {type: String, required: true}, //资源类型
            intro: {type: String, required: false, default: ''}, //测试资源简介
            originInfo: {type: OriginInfoSchema, required: true},
            differenceInfo: {type: DifferenceInfoSchema, required: true},
            resolveResources: {type: [ResolveResourceSchema], default: [], required: false},
            resolveResourceSignStatus: {type: Number, default: 0, required: true}, // 1:已全部签约  2:未全部签约
            ruleId: {type: String, required: false, default: ''},
            status: {type: Number, default: 0, required: true}
        }, {
            versionKey: false,
            timestamps: {createdAt: 'createDate', updatedAt: 'updateDate'},
            toJSON: NodeTestResourceInfo.toObjectOptions,
            toObject: NodeTestResourceInfo.toObjectOptions
        })

        TestResourceSchema.index({userId: 1, nodeId: 1});

        return this.mongoose.model('node-test-resources', TestResourceSchema);
    }

    static get toObjectOptions() {
        return {
            transform(doc, ret) {
                return omit(ret, ['_id', 'id']);
            }
        };
    }
}