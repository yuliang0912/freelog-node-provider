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
var PresentableModel_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PresentableModel = void 0;
const lodash_1 = require("lodash");
const midway_1 = require("midway");
const mongoose_model_base_1 = require("egg-freelog-base/database/mongoose-model-base");
let PresentableModel = PresentableModel_1 = class PresentableModel extends mongoose_model_base_1.MongooseModelBase {
    constructor(mongoose) {
        super(mongoose);
    }
    buildMongooseModel() {
        const PolicySchema = new this.mongoose.Schema({
            policyId: { type: String, required: true },
            policyName: { type: String, required: true },
            status: { type: Number, required: true },
        }, { _id: false });
        const BaseResourceInfo = new this.mongoose.Schema({
            resourceId: { type: String, required: true },
            resourceName: { type: String, required: true },
            resourceType: { type: String, required: true }
        }, { _id: false });
        const BaseContractInfo = new this.mongoose.Schema({
            policyId: { type: String, required: true },
            contractId: { type: String, required: true },
        }, { _id: false });
        const ResolveResourceSchema = new this.mongoose.Schema({
            resourceId: { type: String, required: true },
            resourceName: { type: String, required: true },
            contracts: { type: [BaseContractInfo], required: true },
        }, { _id: false });
        const PresentableSchema = new this.mongoose.Schema({
            presentableName: { type: String, required: true },
            presentableTitle: { type: String, required: true },
            policies: { type: [PolicySchema], default: [] },
            nodeId: { type: Number, required: true },
            userId: { type: Number, required: true },
            version: { type: String, required: true },
            resourceInfo: { type: BaseResourceInfo, required: true },
            // 解决资源的方式存在跨版本的一致性.所以提取到展品信息中.
            resolveResources: { type: [ResolveResourceSchema], required: true },
            tags: { type: [String], default: [], required: false },
            coverImages: { type: [String], default: [], required: false },
            onlineStatus: { type: Number, default: 0, enum: [0, 1], required: true },
            authStatus: { type: Number, default: 0, required: true },
            status: { type: Number, default: 0, required: true },
        }, {
            versionKey: false,
            timestamps: { createdAt: 'createDate', updatedAt: 'updateDate' },
            toJSON: PresentableModel_1.toObjectOptions,
            toObject: PresentableModel_1.toObjectOptions
        });
        PresentableSchema.virtual('presentableId').get(function () {
            return this.id;
        });
        PresentableSchema.index({ nodeId: 1, presentableName: 1 }, { unique: true });
        PresentableSchema.index({ nodeId: 1, 'resourceInfo.resourceId': 1 }, { unique: true });
        return this.mongoose.model('presentables', PresentableSchema);
    }
    static get toObjectOptions() {
        return {
            getters: true,
            virtuals: true,
            transform(doc, ret) {
                return lodash_1.omit(ret, ['_id', 'id']);
            }
        };
    }
};
PresentableModel = PresentableModel_1 = __decorate([
    midway_1.scope(midway_1.ScopeEnum.Singleton),
    midway_1.provide('model.Presentable'),
    __param(0, midway_1.plugin('mongoose')),
    __metadata("design:paramtypes", [Object])
], PresentableModel);
exports.PresentableModel = PresentableModel;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlc2VudGFibGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvbW9kZWwvcHJlc2VudGFibGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLG1DQUE0QjtBQUM1QixtQ0FBeUQ7QUFDekQsdUZBQWdGO0FBSWhGLElBQWEsZ0JBQWdCLHdCQUE3QixNQUFhLGdCQUFpQixTQUFRLHVDQUFpQjtJQUVuRCxZQUFnQyxRQUFRO1FBQ3BDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUNwQixDQUFDO0lBRUQsa0JBQWtCO1FBRWQsTUFBTSxZQUFZLEdBQUcsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQztZQUMxQyxRQUFRLEVBQUUsRUFBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUM7WUFDeEMsVUFBVSxFQUFFLEVBQUMsSUFBSSxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFDO1lBQzFDLE1BQU0sRUFBRSxFQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBQztTQUN6QyxFQUFFLEVBQUMsR0FBRyxFQUFFLEtBQUssRUFBQyxDQUFDLENBQUE7UUFFaEIsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDO1lBQzlDLFVBQVUsRUFBRSxFQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBQztZQUMxQyxZQUFZLEVBQUUsRUFBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUM7WUFDNUMsWUFBWSxFQUFFLEVBQUMsSUFBSSxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFDO1NBQy9DLEVBQUUsRUFBQyxHQUFHLEVBQUUsS0FBSyxFQUFDLENBQUMsQ0FBQTtRQUVoQixNQUFNLGdCQUFnQixHQUFHLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUM7WUFDOUMsUUFBUSxFQUFFLEVBQUMsSUFBSSxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFDO1lBQ3hDLFVBQVUsRUFBRSxFQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBQztTQUM3QyxFQUFFLEVBQUMsR0FBRyxFQUFFLEtBQUssRUFBQyxDQUFDLENBQUE7UUFFaEIsTUFBTSxxQkFBcUIsR0FBRyxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDO1lBQ25ELFVBQVUsRUFBRSxFQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBQztZQUMxQyxZQUFZLEVBQUUsRUFBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUM7WUFDNUMsU0FBUyxFQUFFLEVBQUMsSUFBSSxFQUFFLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFDO1NBQ3hELEVBQUUsRUFBQyxHQUFHLEVBQUUsS0FBSyxFQUFDLENBQUMsQ0FBQTtRQUVoQixNQUFNLGlCQUFpQixHQUFHLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUM7WUFDL0MsZUFBZSxFQUFFLEVBQUMsSUFBSSxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFDO1lBQy9DLGdCQUFnQixFQUFFLEVBQUMsSUFBSSxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFDO1lBQ2hELFFBQVEsRUFBRSxFQUFDLElBQUksRUFBRSxDQUFDLFlBQVksQ0FBQyxFQUFFLE9BQU8sRUFBRSxFQUFFLEVBQUM7WUFDN0MsTUFBTSxFQUFFLEVBQUMsSUFBSSxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFDO1lBQ3RDLE1BQU0sRUFBRSxFQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBQztZQUN0QyxPQUFPLEVBQUUsRUFBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUM7WUFDdkMsWUFBWSxFQUFFLEVBQUMsSUFBSSxFQUFFLGdCQUFnQixFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUM7WUFDdEQsK0JBQStCO1lBQy9CLGdCQUFnQixFQUFFLEVBQUMsSUFBSSxFQUFFLENBQUMscUJBQXFCLENBQUMsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFDO1lBQ2pFLElBQUksRUFBRSxFQUFDLElBQUksRUFBRSxDQUFDLE1BQU0sQ0FBQyxFQUFFLE9BQU8sRUFBRSxFQUFFLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBQztZQUNwRCxXQUFXLEVBQUUsRUFBQyxJQUFJLEVBQUUsQ0FBQyxNQUFNLENBQUMsRUFBRSxPQUFPLEVBQUUsRUFBRSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUM7WUFDM0QsWUFBWSxFQUFFLEVBQUMsSUFBSSxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFDO1lBQ3RFLFVBQVUsRUFBRSxFQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFLENBQUMsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFDO1lBQ3RELE1BQU0sRUFBRSxFQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFLENBQUMsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFDO1NBQ3JELEVBQUU7WUFDQyxVQUFVLEVBQUUsS0FBSztZQUNqQixVQUFVLEVBQUUsRUFBQyxTQUFTLEVBQUUsWUFBWSxFQUFFLFNBQVMsRUFBRSxZQUFZLEVBQUM7WUFDOUQsTUFBTSxFQUFFLGtCQUFnQixDQUFDLGVBQWU7WUFDeEMsUUFBUSxFQUFFLGtCQUFnQixDQUFDLGVBQWU7U0FDN0MsQ0FBQyxDQUFBO1FBRUYsaUJBQWlCLENBQUMsT0FBTyxDQUFDLGVBQWUsQ0FBQyxDQUFDLEdBQUcsQ0FBQztZQUMzQyxPQUFPLElBQUksQ0FBQyxFQUFFLENBQUM7UUFDbkIsQ0FBQyxDQUFDLENBQUM7UUFFSCxpQkFBaUIsQ0FBQyxLQUFLLENBQUMsRUFBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLGVBQWUsRUFBRSxDQUFDLEVBQUMsRUFBRSxFQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUMsQ0FBQyxDQUFDO1FBQ3pFLGlCQUFpQixDQUFDLEtBQUssQ0FBQyxFQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUseUJBQXlCLEVBQUUsQ0FBQyxFQUFDLEVBQUUsRUFBQyxNQUFNLEVBQUUsSUFBSSxFQUFDLENBQUMsQ0FBQztRQUVuRixPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLGNBQWMsRUFBRSxpQkFBaUIsQ0FBQyxDQUFBO0lBQ2pFLENBQUM7SUFFRCxNQUFNLEtBQUssZUFBZTtRQUN0QixPQUFPO1lBQ0gsT0FBTyxFQUFFLElBQUk7WUFDYixRQUFRLEVBQUUsSUFBSTtZQUNkLFNBQVMsQ0FBQyxHQUFHLEVBQUUsR0FBRztnQkFDZCxPQUFPLGFBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztZQUNwQyxDQUFDO1NBQ0osQ0FBQztJQUNOLENBQUM7Q0FDSixDQUFBO0FBeEVZLGdCQUFnQjtJQUY1QixjQUFLLENBQUMsa0JBQVMsQ0FBQyxTQUFTLENBQUM7SUFDMUIsZ0JBQU8sQ0FBQyxtQkFBbUIsQ0FBQztJQUdaLFdBQUEsZUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFBOztHQUZ0QixnQkFBZ0IsQ0F3RTVCO0FBeEVZLDRDQUFnQiJ9