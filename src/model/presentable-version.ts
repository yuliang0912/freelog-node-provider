import {scope, provide} from 'midway';
import {MongooseModelBase, IMongooseModelBase} from './mongoose-model-base';

@scope('Singleton')
@provide('model.PresentableVersion')
export class PresentableVersionModel extends MongooseModelBase implements IMongooseModelBase {

    buildMongooseModel() {

        // 自定义属性描述器主要面向继承者,例如展品需要对资源中的自定义属性进行编辑
        const CustomPropertyDescriptorSchema = new this.mongoose.Schema({
            key: {type: String, required: true},
            defaultValue: {type: this.mongoose.Schema.Types.Mixed, required: true},
            type: {type: String, required: true, enum: ['editableText', 'readonlyText', 'radio', 'checkbox', 'select']}, // 类型目前分为: 可编辑文本框,不可编辑文本框,单选框,多选框,下拉选择框
            candidateItems: {type: [String], required: false}, // 选项列表
            remark: {type: String, required: false, default: ''}, // 对外显示的名称
        }, {_id: false});

        const PresentableRewritePropertySchema = new this.mongoose.Schema({
            key: {type: String, required: true},
            value: {type: this.mongoose.Schema.Types.Mixed, required: true},
        }, {_id: false});

        const PresentableAuthTreeSchema = new this.mongoose.Schema({
            resourceId: {type: String, required: true},
            resourceName: {type: String, required: true},
            version: {type: String, required: true},
            versionId: {type: String, required: true},
            parentVersionId: {type: String, required: false},
            deep: {type: Number, required: true},
        }, {_id: false});

        const PresentableDependencyTreeSchema = new this.mongoose.Schema({
            nid: {type: String, required: true},
            resourceId: {type: String, required: true},
            resourceName: {type: String, required: true},
            version: {type: String, required: true},
            versionRange: {type: String, required: true},
            resourceType: {type: String, required: false},
            versionId: {type: String, required: true},
            deep: {type: Number, required: true},
            parentNid: {type: String, default: '', required: false},
        }, {_id: false});

        const PresentableVersionSchema = new this.mongoose.Schema({
            presentableId: {type: String, required: true}, // 名称节点内唯一
            version: {type: String, required: true}, // 与资源版本同步,切换版本时,修改此值
            resourceVersionId: {type: String, required: true},
            resourceSystemProperty: {type: this.mongoose.Schema.Types.Mixed, default: {}, required: true}, // 资源的原始系统属性
            resourceCustomPropertyDescriptors: {type: [CustomPropertyDescriptorSchema], default: [], required: false},
            presentableRewriteProperty: {type: [PresentableRewritePropertySchema], default: [], required: false}, // 新增或者覆盖的属性
            versionProperty: {type: this.mongoose.Schema.Types.Mixed, default: {}, required: true}, // 通过计算resourceSystemProperty,resourceCustomPropertyDescriptors,presentableRewriteProperty获得的最终属性
            authTree: {type: [PresentableAuthTreeSchema], default: [], required: false},
            dependencyTree: {type: [PresentableDependencyTreeSchema], default: [], required: false},
            status: {type: Number, default: 0, required: true}, //状态 0:正常
        }, {
            minimize: false,
            versionKey: false,
            timestamps: {createdAt: 'createDate', updatedAt: 'updateDate'}
        });

        PresentableVersionSchema.index({presentableId: 1, version: 1}, {unique: true});

        return this.mongoose.model('presentable-versions', PresentableVersionSchema);
    }
}