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
            contractId: { type: String, default: '', required: false },
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
            isRuleAdd: { type: Boolean, required: false },
            remark: { type: String, required: false, default: '' },
        }, { _id: false });
        const StateInfoSchema = new this.mongoose.Schema({
            onlineStatusInfo: {
                onlineStatus: { type: Number, required: true },
                ruleId: { type: String, default: '', required: false },
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
                return lodash_1.omit(ret, ['_id', 'id']);
            }
        };
    }
};
NodeTestResourceInfo = NodeTestResourceInfo_1 = __decorate([
    midway_1.scope('Singleton'),
    midway_1.provide('model.NodeTestResourceInfo'),
    __param(0, midway_1.plugin('mongoose')),
    __metadata("design:paramtypes", [Object])
], NodeTestResourceInfo);
exports.NodeTestResourceInfo = NodeTestResourceInfo;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdC1yZXNvdXJjZS1pbmZvLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL21vZGVsL3Rlc3QtcmVzb3VyY2UtaW5mby50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsbUNBQTRCO0FBQzVCLG1DQUE4QztBQUM5Qyx1RkFBZ0Y7QUFJaEYsSUFBYSxvQkFBb0IsNEJBQWpDLE1BQWEsb0JBQXFCLFNBQVEsdUNBQWlCO0lBRXZELFlBQWdDLFFBQVE7UUFDcEMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQ3BCLENBQUM7SUFFRCxrQkFBa0I7UUFFZCxNQUFNLGdCQUFnQixHQUFHLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUM7WUFDOUMsUUFBUSxFQUFFLEVBQUMsSUFBSSxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFDO1lBQ3hDLFVBQVUsRUFBRSxFQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFLEVBQUUsRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFDO1NBQzNELEVBQUUsRUFBQyxHQUFHLEVBQUUsS0FBSyxFQUFDLENBQUMsQ0FBQztRQUVqQixTQUFTO1FBQ1QsTUFBTSxxQkFBcUIsR0FBRyxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDO1lBQ25ELFVBQVUsRUFBRSxFQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBQztZQUMxQyxZQUFZLEVBQUUsRUFBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUM7WUFDNUMsU0FBUyxFQUFFLENBQUMsZ0JBQWdCLENBQUM7U0FDaEMsRUFBRSxFQUFDLEdBQUcsRUFBRSxLQUFLLEVBQUMsQ0FBQyxDQUFDO1FBRWpCLE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQztZQUM5QyxFQUFFLEVBQUUsRUFBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUM7WUFDbEMsSUFBSSxFQUFFLEVBQUMsSUFBSSxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFDO1lBQ3BDLElBQUksRUFBRSxFQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBQztZQUNwQyxPQUFPLEVBQUUsRUFBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLEVBQUUsRUFBQztZQUNyRCxZQUFZLEVBQUUsRUFBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLEVBQUUsRUFBQztZQUMxRCxRQUFRLEVBQUUsRUFBQyxJQUFJLEVBQUUsQ0FBQyxNQUFNLENBQUMsRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxFQUFFLEVBQUM7U0FDM0QsRUFBRSxFQUFDLEdBQUcsRUFBRSxLQUFLLEVBQUMsQ0FBQyxDQUFDO1FBRWpCLE1BQU0sY0FBYyxHQUFHLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUM7WUFDNUMsTUFBTSxFQUFFLEVBQUMsSUFBSSxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxFQUFFLEVBQUM7WUFDcEQsVUFBVSxFQUFFLEVBQUMsSUFBSSxFQUFFLENBQUMsTUFBTSxDQUFDLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBQztTQUMvQyxFQUFFLEVBQUMsR0FBRyxFQUFFLEtBQUssRUFBQyxDQUFDLENBQUM7UUFFakIsTUFBTSwwQkFBMEIsR0FBRyxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDO1lBQ3hELEdBQUcsRUFBRSxFQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBQztZQUNuQyxLQUFLLEVBQUUsRUFBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFDO1lBQy9ELFNBQVMsRUFBRSxFQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsQ0FBQyxFQUFDO1lBQ3JELFNBQVMsRUFBRSxFQUFDLElBQUksRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBQztZQUMzQyxNQUFNLEVBQUUsRUFBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLEVBQUUsRUFBQztTQUN2RCxFQUFFLEVBQUMsR0FBRyxFQUFFLEtBQUssRUFBQyxDQUFDLENBQUM7UUFFakIsTUFBTSxlQUFlLEdBQUcsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQztZQUM3QyxnQkFBZ0IsRUFBRTtnQkFDZCxZQUFZLEVBQUUsRUFBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUM7Z0JBQzVDLE1BQU0sRUFBRSxFQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFLEVBQUUsRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFDO2FBQ3ZEO1lBQ0QsT0FBTyxFQUFFO2dCQUNMLElBQUksRUFBRSxFQUFDLElBQUksRUFBRSxDQUFDLE1BQU0sQ0FBQyxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUM7Z0JBQ3RDLE1BQU0sRUFBRSxFQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBQzthQUMxQztZQUNELFNBQVMsRUFBRTtnQkFDUCxLQUFLLEVBQUUsRUFBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUM7Z0JBQ3JDLE1BQU0sRUFBRSxFQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBQzthQUMxQztZQUNELFNBQVMsRUFBRTtnQkFDUCxXQUFXLEVBQUUsRUFBQyxJQUFJLEVBQUUsQ0FBQyxNQUFNLENBQUMsRUFBRSxPQUFPLEVB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