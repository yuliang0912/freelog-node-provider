import {omit} from 'lodash';
import {scope, provide} from 'midway';
import {MongooseModelBase, IMongooseModelBase} from './mongoose-model-base';

@scope('Singleton')
@provide('model.Presentable')
export class PresentableModel extends MongooseModelBase implements IMongooseModelBase {

    buildMongooseModel() {

        const PolicySchema = new this.mongoose.Schema({
            policyId: {type: String, required: true},
            policyName: {type: String, required: true},
            policyText: {type: String, required: true},
            status: {type: Number, required: true}, // 0:不启用  1:启用
        }, {_id: false})

        const BaseResourceInfo = new this.mongoose.Schema({
            resourceId: {type: String, required: true},
            resourceName: {type: String, required: true},
            resourceType: {type: String, required: true}
        }, {_id: false})

        const BaseContractInfo = new this.mongoose.Schema({
            policyId: {type: String, required: true},
            contractId: {type: String, required: true},
        }, {_id: false})

        const ResolveResourceSchema = new this.mongoose.Schema({
            resourceId: {type: String, required: true},
            resourceName: {type: String, required: true},
            contracts: [BaseContractInfo],
        }, {_id: false})

        const PresentableSchema = new this.mongoose.Schema({
            presentableName: {type: String, required: true}, // 名称节点内唯一
            presentableTitle: {type: String, required: true},// 标题对外展示.不唯一
            policies: {type: [PolicySchema], default: []},
            nodeId: {type: Number, required: true},
            userId: {type: Number, required: true},
            version: {type: String, required: true}, // 与资源版本同步,切换版本时,修改此值
            resourceInfo: {type: BaseResourceInfo, required: true},
            // 解决资源的方式存在跨版本的一致性.所以提取到展品信息中.
            resolveResources: {type: [ResolveResourceSchema], required: true},
            tags: {type: [String], default: [], required: false},// 用户自定义tags
            intro: {type: String, default: '', required: false},
            coverImages: {type: [String], default: [], required: false},
            isTheme: {type: Number, default: 0, enum: [0, 1], required: true},
            onlineStatus: {type: Number, default: 0, enum: [0, 1], required: true}, //上线状态 0:未上线 1:已上线
            authStatus: {type: Number, default: 0, required: true}, //授权链授权状态 0:未知  1:节点侧合约授权失败 2:资源侧合约授权失败 4:节点侧合约授权通过 8:资源侧合约授权通过
            status: {type: Number, default: 0, required: true}, //状态 0:正常
        }, {
            versionKey: false,
            timestamps: {createdAt: 'createDate', updatedAt: 'updateDate'},
            toJSON: PresentableModel.toObjectOptions,
            toObject: PresentableModel.toObjectOptions
        })

        PresentableSchema.virtual('presentableId').get(function (this: any) {
            return this.id;
        })

        PresentableSchema.index({nodeId: 1, presentableName: 1}, {unique: true});
        PresentableSchema.index({nodeId: 1, 'resourceInfo.resourceId': 1}, {unique: true});

        return this.mongoose.model('presentables', PresentableSchema)
    }

    static get toObjectOptions() {
        return {
            getters: true,
            virtuals: true,
            transform(doc, ret) {
                return omit(ret, ['_id', 'id']);
            }
        };
    }
}
