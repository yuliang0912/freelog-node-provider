import {omit} from 'lodash';
import {scope, provide, plugin} from 'midway';
import {MongooseModelBase} from 'egg-freelog-base/database/mongoose-model-base';

@scope('Singleton')
@provide('model.NodeDetailInfo')
export class NodeDetailInfoModel extends MongooseModelBase {

    constructor(@plugin('mongoose') mongoose) {
        super(mongoose);
    }

    buildMongooseModel() {

        const nodeDetailInfoSchema = new this.mongoose.Schema({
            nodeId: {type: Number, required: true}, //节点ID
            tagIds: {type: [Number], default: [], required: false}, // tagId,有关联需求.
            statusChangeRemark: {type: String, default: '', required: false}, // 状态变更备注
        }, {
            versionKey: false,
            timestamps: {createdAt: 'createDate', updatedAt: 'updateDate'},
            toJSON: NodeDetailInfoModel.toObjectOptions,
            toObject: NodeDetailInfoModel.toObjectOptions
        });

        nodeDetailInfoSchema.index({tagIds: 1});
        nodeDetailInfoSchema.index({nodeId: 1}, {unique: true});

        return this.mongoose.model('node-detail-infos', nodeDetailInfoSchema);
    }

    static get toObjectOptions() {
        return {
            transform(doc, ret) {
                return omit(ret, ['_id']);
            }
        };
    }
}
