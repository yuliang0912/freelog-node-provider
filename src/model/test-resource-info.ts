import {omit} from 'lodash';
import {scope, provide, plugin} from 'midway';
import {MongooseModelBase} from 'egg-freelog-base/database/mongoose-model-base';

@scope('Singleton')
@provide('model.NodeTestResourceInfo')
export class NodeTestResourceInfo extends MongooseModelBase {

    constructor(@plugin('mongoose') mongoose) {
        super(mongoose);
    }

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
            version: {type: String, required: false, default: ''},
            versions: {type: [String], required: false, default: []}
        }, {_id: false})

        const RuleInfoSchema = new this.mongoose.Schema({
            ruleId: {type: String, required: false, default: ''},
            operations: {type: [String], required: true}
        }, {_id: false})

        const testResourcePropertySchema = new this.mongoose.Schema({
            key: {type: String, required: true},
            value: {type: this.mongoose.Schema.Types.Mixed, required: true},
            remark: {type: String, required: false, default: ''},
        }, {_id: false});

        const StateInfoSchema = new this.mongoose.Schema({
            onlineStatusInfo: {
                onlineStatus: {type: Number, required: true},
                ruleId: {type: String, default: '', required: false},//没有规则,代表默认原始的上线状态
            },
            tagInfo: {
                tags: {type: [String], required: true},
                ruleId: {type: String, required: false},
            },
            titleInfo: {
                title: {type: String, required: true},
                ruleId: {type: String, required: false},
            },
            coverInfo: {
                coverImages: {type: [String], default: [], required: false},
                ruleId: {type: String, required: false},
            },
            propertyInfo: {
                testResourceProperty: {type: [testResourcePropertySchema], default: [], required: false},
                ruleId: {type: String, required: false},
            },
            themeInfo: {
                isActivatedTheme: {type: Number, required: false},
                ruleId: {type: String, required: false},
            }
        }, {_id: false})

        const TestResourceSchema = new this.mongoose.Schema({
            nodeId: {type: Number, required: true},
            userId: {type: Number, required: true},
            testResourceId: {type: String, required: true, unique: true},
            testResourceName: {type: String, required: true},
            associatedPresentableId: {type: String, default: "", required: false},
            resourceType: {type: String, required: true}, //资源类型
            intro: {type: String, required: false, default: ''}, //测试资源简介
            originInfo: {type: OriginInfoSchema, required: true},
            stateInfo: {type: StateInfoSchema, required: true},
            resolveResources: {type: [ResolveResourceSchema], default: [], required: false},
            resolveResourceSignStatus: {type: Number, default: 0, required: true}, // 1:已全部签约  2:未全部签约
            rules: {type: [RuleInfoSchema], required: true},
            status: {type: Number, default: 0, required: true}
        }, {
            versionKey: false,
            timestamps: {createdAt: 'createDate', updatedAt: 'updateDate'},
            toJSON: NodeTestResourceInfo.toObjectOptions,
            toObject: NodeTestResourceInfo.toObjectOptions
        });

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
