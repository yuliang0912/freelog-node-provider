import {scope, provide, plugin} from 'midway';
import {MongooseModelBase} from 'egg-freelog-base/database/mongoose-model-base';

@scope('Singleton')
@provide('model.NodeFreezeRecord')
export class NodeFreezeRecordModel extends MongooseModelBase {

    constructor(@plugin('mongoose') mongoose) {
        super(mongoose);
    }

    buildMongooseModel() {

        const OperationRecordSchema = new this.mongoose.Schema({
            operatorUserId: {type: Number, required: true},
            operatorUserName: {type: String, required: true},
            type: {type: Number, enum: [1, 2], required: true}, // 1:冻结 2:解冻
            remark: {type: String, default: '', required: false}
        }, {
            _id: false,
            versionKey: false,
            timestamps: {createdAt: 'createDate', updatedAt: false}
        });

        const NodeFreezeRecordSchema = new this.mongoose.Schema({
            nodeId: {type: String, required: true},
            nodeName: {type: String, required: true},
            records: {type: [OperationRecordSchema], required: true}
        }, {
            versionKey: false,
            timestamps: {createdAt: 'createDate', updatedAt: 'updateDate'}
        });

        NodeFreezeRecordSchema.index({nodeId: 1}, {unique: true});

        return this.mongoose.model('node-freeze-records', NodeFreezeRecordSchema);
    }
}
