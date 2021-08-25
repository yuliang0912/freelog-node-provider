import {scope, provide, plugin} from 'midway';
import {MongooseModelBase} from 'egg-freelog-base/database/mongoose-model-base';
import {omit} from 'lodash';

@scope('Singleton')
@provide('model.tagInfo')
export class TagInfoModel extends MongooseModelBase {

    constructor(@plugin('mongoose') mongoose) {
        super(mongoose);
    }

    buildMongooseModel() {

        const tagInfoSchema = new this.mongoose.Schema({
            tagName: {type: String, required: true},
            totalSetCount: {type: Number, default: 0, required: false}, // 总设置次数
            createUserId: {type: Number, required: true},
        }, {
            versionKey: false,
            timestamps: {createdAt: 'createDate', updatedAt: 'updateDate'},
            toJSON: TagInfoModel.toObjectOptions,
            toObject: TagInfoModel.toObjectOptions,
        });

        tagInfoSchema.index({tagName: 1}, {unique: true});

        tagInfoSchema.virtual('tagId').get(function (this: any) {
            return this._id;
        });

        return this.mongoose.model('tags', tagInfoSchema);
    }

    static get toObjectOptions() {
        return {
            transform(doc, ret) {
                return Object.assign({tagId: ret._id}, omit(ret, ['_id']));
            }
        };
    }
}
