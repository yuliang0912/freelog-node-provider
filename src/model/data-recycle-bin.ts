import {scope, provide} from 'midway';
import {MongooseModelBase, IMongooseModelBase} from './mongoose-model-base';

@scope('Singleton')
@provide('model.DataRecycleBin')
export class DataRecycleBinModel extends MongooseModelBase implements IMongooseModelBase {

    buildMongooseModel() {

        const DataRecycleBinSchema = new this.mongoose.Schema({
            primaryKey: {type: String, required: true},
            dataType: {type: String, required: true},
            data: {type: this.mongoose.Schema.Types.Mixed, default: {}, required: true},
            status: {type: Number, default: 0, required: true}
        }, {
            minimize: false,
            versionKey: false,
            timestamps: {createdAt: 'createDate', updatedAt: 'updateDate'}
        });

        DataRecycleBinSchema.index({primaryKey: 1, dataType: 1}, {unique: true});

        return this.mongoose.model('data-recycle-bin', DataRecycleBinSchema);
    }
}
