import {omit} from 'lodash';
import {scope, provide, plugin} from 'midway';
import {MongooseModelBase} from 'egg-freelog-base/database/mongoose-model-base';

@scope('Singleton')
@provide('model.NodeTestResourceTreeInfo')
export class TestResourceTreeInfo extends MongooseModelBase {

    constructor(@plugin('mongoose') mongoose) {
        super(mongoose);
    }

    buildMongooseModel() {

        // const BaseReplacedInfoSchema = new this.mongoose.Schema({
        //     id: {type: String, required: true},
        //     name: {type: String, required: true},
        //     type: {type: String, required: true}
        // }, {_id: false});

        const DependencyTreeSchema = new this.mongoose.Schema({
            nid: {type: String, required: true},
            id: {type: String, required: true},
            name: {type: String, required: true},
            type: {type: String, required: true},
            deep: {type: Number, required: true},
            version: {type: String, required: false},
            versionId: {type: String, required: false},
            fileSha1: {type: String, required: false},
            resourceType: {type: String, required: false},
            parentNid: {type: String, required: false}
            // replaced: {type: BaseReplacedInfoSchema, required: false}
        }, {_id: false});

        const AuthTreeSchema = new this.mongoose.Schema({
            nid: {type: String, required: true},
            id: {type: String, required: true},
            name: {type: String, required: true},
            type: {type: String, required: true},
            deep: {type: Number, required: true},
            version: {type: String, required: false},
            versionId: {type: String, required: false},
            resourceType: {type: String, required: false},
            parentNid: {type: String, required: false},
            // userId: {type: Number, required: false}, //资源需要此字段,默认规则是自己的资源可以直接使用.此外还用于筛选待解决的依赖
        }, {_id: false});

        const TestResourceTreeSchema = new this.mongoose.Schema({
            nodeId: {type: Number, required: true},
            testResourceId: {type: String, required: true, unique: true},
            testResourceName: {type: String, required: true},
            dependencyTree: {type: [DependencyTreeSchema], required: true},
            authTree: {type: [AuthTreeSchema], required: true},
        }, {
            versionKey: false,
            timestamps: {createdAt: 'createDate', updatedAt: 'updateDate'},
            toJSON: TestResourceTreeInfo.toObjectOptions,
            toObject: TestResourceTreeInfo.toObjectOptions
        })

        return this.mongoose.model('node-test-resource-tree-infos', TestResourceTreeSchema);
    }

    static get toObjectOptions() {
        return {
            transform(doc, ret) {
                return omit(ret, ['_id', 'id']);
            }
        };
    }
}
