import {scope, provide, plugin} from 'midway';
import {MongooseModelBase} from 'egg-freelog-base/database/mongoose-model-base';

@scope('Singleton')
@provide('model.AutoIncrementRecord')
export class AutoIncrementRecordModel extends MongooseModelBase {

    constructor(@plugin('mongoose') mongoose) {
        super(mongoose);
    }

    buildMongooseModel() {

        const AutoIncrementRecordSchema = new this.mongoose.Schema({
            dataType: {type: String, unique: true, default: 'NODE_ID', required: true},
            value: {type: Number, required: true, mixin: 1}
        }, {
            versionKey: false,
            timestamps: {createdAt: 'createDate', updatedAt: 'updateDate'}
        });

        AutoIncrementRecordSchema.index({dataType: 1}, {unique: true});

        return this.mongoose.model('auto-increment-record', AutoIncrementRecordSchema);
    }
}
