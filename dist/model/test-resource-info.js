"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var NodeTestResourceInfo_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NodeTestResourceInfo = void 0;
const lodash_1 = require("lodash");
const midway_1 = require("midway");
const mongoose_model_base_1 = require("egg-freelog-base/database/mongoose-model-base");
let NodeTestResourceInfo = NodeTestResourceInfo_1 = class NodeTestResourceInfo extends mongoose_model_base_1.MongooseModelBase {
    constructor(mongoose) {
        super(mongoose);
    }
    buildMongooseModel() {
        const BaseContractInfo = new this.mongoose.Schema({
            policyId: { type: String, required: true },
            contractId: { type: String, default: '', required: false }, //方案解决所使用的合同ID
        }, { _id: false });
        //声明处理的依赖
        const ResolveResourceSchema = new this.mongoose.Schema({
            resourceId: { type: String, required: true },
            resourceName: { type: String, required: true },
            contracts: [BaseContractInfo],
        }, { _id: false });
        const OriginInfoSchema = new this.mongoose.Schema({
            id: { type: String, required: true },
            name: { type: String, required: true },
            type: { type: String, required: true },
            resourceType: { type: String, required: true },
            version: { type: String, required: false, default: '' },
            versionRange: { type: String, required: false, default: '' },
            versions: { type: [String], required: false, default: [] }
        }, { _id: false });
        const RuleInfoSchema = new this.mongoose.Schema({
            ruleId: { type: String, required: false, default: '' },
            operations: { type: [String], required: true }
        }, { _id: false });
        const testResourcePropertySchema = new this.mongoose.Schema({
            key: { type: String, required: true },
            value: { type: this.mongoose.Schema.Types.Mixed, required: true },
            authority: { type: Number, required: true, default: 1 },
            isRuleSet: { type: Boolean, required: false },
            isRuleAdd: { type: Boolean, required: false },
            remark: { type: String, required: false, default: '' },
        }, { _id: false });
        const StateInfoSchema = new this.mongoose.Schema({
            onlineStatusInfo: {
                onlineStatus: { type: Number, required: true },
                ruleId: { type: String, default: '', required: false }, //没有规则,代表默认原始的上线状态
            },
            tagInfo: {
                tags: { type: [String], required: true },
                ruleId: { type: String, required: false },
            },
            titleInfo: {
                title: { type: String, required: true },
                ruleId: { type: String, required: false },
            },
            coverInfo: {
                coverImages: { type: [String], default: [], required: false },
                ruleId: { type: String, required: false },
            },
            propertyInfo: {
                testResourceProperty: { type: [testResourcePropertySchema], default: [], required: false },
                ruleId: { type: String, required: false },
            },
            themeInfo: {
                isActivatedTheme: { type: Number, required: false },
                ruleId: { type: String, required: false },
            },
            replaceInfo: {
                // rootResourceReplacer: {type: this.mongoose.Schema.Types.Mixed, default: null, required: false},
                replaceRecords: { type: this.mongoose.Schema.Types.Mixed, required: false },
                ruleId: { type: String, required: false },
            }
        }, { _id: false });
        const TestResourceSchema = new this.mongoose.Schema({
            nodeId: { type: Number, required: true },
            userId: { type: Number, required: true },
            testResourceId: { type: String, required: true, unique: true },
            testResourceName: { type: String, required: true },
            associatedPresentableId: { type: String, default: '', required: false },
            resourceType: { type: String, required: true },
            intro: { type: String, required: false, default: '' },
            originInfo: { type: OriginInfoSchema, required: true },
            stateInfo: { type: StateInfoSchema, required: true },
            resolveResources: { type: [ResolveResourceSchema], default: [], required: false },
            resolveResourceSignStatus: { type: Number, default: 0, required: true },
            rules: { type: [RuleInfoSchema], required: true },
            status: { type: Number, default: 0, required: true }
        }, {
            versionKey: false,
            timestamps: { createdAt: 'createDate', updatedAt: 'updateDate' },
            toJSON: NodeTestResourceInfo_1.toObjectOptions,
            toObject: NodeTestResourceInfo_1.toObjectOptions
        });
        TestResourceSchema.index({ userId: 1, nodeId: 1 });
        return this.mongoose.model('node-test-resources', TestResourceSchema);
    }
    static get toObjectOptions() {
        return {
            transform(doc, ret) {
                return (0, lodash_1.omit)(ret, ['_id', 'id']);
            }
        };
    }
};
NodeTestResourceInfo = NodeTestResourceInfo_1 = __decorate([
    (0, midway_1.scope)('Singleton'),
    (0, midway_1.provide)('model.NodeTestResourceInfo'),
    __param(0, (0, midway_1.plugin)('mongoose')),
    __metadata("design:paramtypes", [Object])
], NodeTestResourceInfo);
exports.NodeTestResourceInfo = NodeTestResourceInfo;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdC1yZXNvdXJjZS1pbmZvLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL21vZGVsL3Rlc3QtcmVzb3VyY2UtaW5mby50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsbUNBQTRCO0FBQzVCLG1DQUE4QztBQUM5Qyx1RkFBZ0Y7QUFJaEYsSUFBYSxvQkFBb0IsNEJBQWpDLE1BQWEsb0JBQXFCLFNBQVEsdUNBQWlCO0lBRXZELFlBQWdDLFFBQVE7UUFDcEMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQ3BCLENBQUM7SUFFRCxrQkFBa0I7UUFFZCxNQUFNLGdCQUFnQixHQUFHLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUM7WUFDOUMsUUFBUSxFQUFFLEVBQUMsSUFBSSxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFDO1lBQ3hDLFVBQVUsRUFBRSxFQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFLEVBQUUsRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFDLEVBQUUsY0FBYztTQUMzRSxFQUFFLEVBQUMsR0FBRyxFQUFFLEtBQUssRUFBQyxDQUFDLENBQUM7UUFFakIsU0FBUztRQUNULE1BQU0scUJBQXFCLEdBQUcsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQztZQUNuRCxVQUFVLEVBQUUsRUFBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUM7WUFDMUMsWUFBWSxFQUFFLEVBQUMsSUFBSSxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFDO1lBQzVDLFNBQVMsRUFBRSxDQUFDLGdCQUFnQixDQUFDO1NBQ2hDLEVBQUUsRUFBQyxHQUFHLEVBQUUsS0FBSyxFQUFDLENBQUMsQ0FBQztRQUVqQixNQUFNLGdCQUFnQixHQUFHLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUM7WUFDOUMsRUFB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