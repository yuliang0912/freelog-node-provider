import {scope, provide, plugin} from 'midway';
import {MongooseModelBase} from 'egg-freelog-base/database/mongoose-model-base';

@scope('Singleton')
@provide('model.PresentableVersion')
export class PresentableVersionModel extends MongooseModelBase {

    constructor(@plugin('mongoose') mongoose) {
        super(mongoose);
    }

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
            remark: {type: String, required: false, default: ''},
        }, {_id: false});

        const PresentableAuthTreeSchema = new this.mongoose.Schema({
            nid: {type: String, required: true},
            resourceId: {type: String, required: true},
            resourceName: {type: String, required: true},
            resourceType: {type: String, default: '', required: false},
            version: {type: String, required: true},
            versionId: {type: String, required: true},
            deep: {type: Number, required: true},
            parentNid: {type: String, required: false},
        }, {_id: false});

        const PresentableDependencyTreeSchema = new this.mongoose.Schema({
            nid: {type: String, required: true},
            resourceId: {type: String, required: true},
            resourceName: {type: String, required: true},
            version: {type: String, required: true},
            versionRange: {type: String, required: true},
            resourceType: {type: String, required: false},
            versionId: {type: String, required: true},
            fileSha1: {type: String, required: true},
            deep: {type: Number, required: true},
            parentNid: {type: String, default: '', required: false},
        }, {_id: false});

        const PresentableVersionSchema = new this.mongoose.Schema({
            presentableId: {type: String, required: true}, // 名称节点内唯一
            version: {type: String, required: true}, // 与资源版本同步
            presentableVersionId: {type: String, required: true},
            resourceSystemProperty: {type: this.mongoose.Schema.Types.Mixed, default: {}, required: true}, // 资源的原始系统属性
            resourceCustomPropertyDescriptors: {type: [CustomPropertyDescriptorSchema], default: [], required: false}, // 当前版本资源的自定义属性描述器
            presentableRewriteProperty: {type: [PresentableRewritePropertySchema], default: [], required: false}, // 新增或者覆盖的属性
            //展品的版本属性是通过计算resourceSystemProperty,resourceCustomPropertyDescriptors,presentableRewriteProperty获得的最终属性,提供给消费侧使用
            versionProperty: {type: this.mongoose.Schema.Types.Mixed, default: {}, required: true},
            // 由于资源的子依赖是semver约束,所以不同时期资源的依赖结构可能完全不一致.所以此次会保存切换版本时的当下所有依赖树,然后固化下来.后续可以给出升级或者最新按钮,目前是通过版本来回切换实现
            authTree: {type: [PresentableAuthTreeSchema], default: [], required: false},
            dependencyTree: {type: [PresentableDependencyTreeSchema], default: [], required: false},
            status: {type: Number, default: 0, required: true}, //状态 0:正常
        }, {
            minimize: false,
            versionKey: false,
            timestamps: {createdAt: 'createDate', updatedAt: 'updateDate'}
        });

        PresentableVersionSchema.index({presentableVersionId: 1}, {unique: true});
        PresentableVersionSchema.index({presentableId: 1, version: 1}, {unique: true});

        return this.mongoose.model('presentable-versions', PresentableVersionSchema);
    }
}
