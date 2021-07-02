import {omit, isUndefined} from 'lodash';
import {scope, provide, plugin} from 'midway';
import {MongooseModelBase} from 'egg-freelog-base/database/mongoose-model-base';

@scope('Singleton')
@provide('model.NodeInfo')
export class NodeInfoModel extends MongooseModelBase {

    constructor(@plugin('mongoose') mongoose) {
        super(mongoose);
    }

    buildMongooseModel() {

        const NodeInfoScheme = new this.mongoose.Schema({
            nodeId: {type: Number, unique: true, required: true},
            nodeName: {type: String, unique: true, required: true},
            nodeDomain: {type: String, unique: true, required: true},
            nodeThemeId: {type: String, required: false, default: ''},
            ownerUserId: {type: Number, required: true},
            ownerUserName: {type: String, required: true},
            uniqueKey: {type: String, required: true},
            auditStatus: {type: Number, default: 0, required: true}, // 审核状态 0:未审核 1:审核通过 2:审核不通过
            status: {type: Number, default: 0, required: true}, //状态 节点状态(0:正常 1:冻结)
        }, {
            versionKey: false,
            timestamps: {createdAt: 'createDate', updatedAt: 'updateDate'},
            toJSON: NodeInfoModel.toObjectOptions,
            toObject: NodeInfoModel.toObjectOptions
        });

        NodeInfoScheme.index({ownerUserId: 1});
        NodeInfoScheme.index({nodeId: 1}, {unique: true});
        NodeInfoScheme.index({nodeName: 1}, {unique: true});
        NodeInfoScheme.index({nodeDomain: 1}, {unique: true});
        NodeInfoScheme.index({uniqueKey: 1}, {unique: true});

        NodeInfoScheme.virtual('pageBuildId').get(function (this: any) {
            return isUndefined(this.nodeThemeId) ? undefined : this.nodeThemeId;
        });

        return this.mongoose.model('nodes', NodeInfoScheme);
    }

    static get toObjectOptions() {
        return {
            getters: true,
            virtuals: true,
            transform(doc, ret) {
                return omit(ret, ['_id', 'id', 'uniqueKey']);
            }
        };
    }
}
