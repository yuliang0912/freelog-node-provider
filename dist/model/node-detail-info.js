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
var NodeDetailInfoModel_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NodeDetailInfoModel = void 0;
const lodash_1 = require("lodash");
const midway_1 = require("midway");
const mongoose_model_base_1 = require("egg-freelog-base/database/mongoose-model-base");
let NodeDetailInfoModel = NodeDetailInfoModel_1 = class NodeDetailInfoModel extends mongoose_model_base_1.MongooseModelBase {
    constructor(mongoose) {
        super(mongoose);
    }
    buildMongooseModel() {
        const nodeDetailInfoSchema = new this.mongoose.Schema({
            nodeId: { type: Number, required: true },
            tagIds: { type: [Number], default: [], required: false },
            statusChangeRemark: { type: String, default: '', required: false }, // 状态变更备注
        }, {
            versionKey: false,
            timestamps: { createdAt: 'createDate', updatedAt: 'updateDate' },
            toJSON: NodeDetailInfoModel_1.toObjectOptions,
            toObject: NodeDetailInfoModel_1.toObjectOptions
        });
        nodeDetailInfoSchema.index({ tagIds: 1 });
        nodeDetailInfoSchema.index({ nodeId: 1 }, { unique: true });
        return this.mongoose.model('node-detail-infos', nodeDetailInfoSchema);
    }
    static get toObjectOptions() {
        return {
            transform(doc, ret) {
                return lodash_1.omit(ret, ['_id']);
            }
        };
    }
};
NodeDetailInfoModel = NodeDetailInfoModel_1 = __decorate([
    midway_1.scope('Singleton'),
    midway_1.provide('model.NodeDetailInfo'),
    __param(0, midway_1.plugin('mongoose')),
    __metadata("design:paramtypes", [Object])
], NodeDetailInfoModel);
exports.NodeDetailInfoModel = NodeDetailInfoModel;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm9kZS1kZXRhaWwtaW5mby5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9tb2RlbC9ub2RlLWRldGFpbC1pbmZvLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxtQ0FBNEI7QUFDNUIsbUNBQThDO0FBQzlDLHVGQUFnRjtBQUloRixJQUFhLG1CQUFtQiwyQkFBaEMsTUFBYSxtQkFBb0IsU0FBUSx1Q0FBaUI7SUFFdEQsWUFBZ0MsUUFBUTtRQUNwQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDcEIsQ0FBQztJQUVELGtCQUFrQjtRQUVkLE1BQU0sb0JBQW9CLEdBQUcsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQztZQUNsRCxNQUFNLEVBQUUsRUFBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUM7WUFDdEMsTUFBTSxFQUFFLEVBQUMsSUFBSSxFQUFFLENBQUMsTUFBTSxDQUFDLEVBQUUsT0FBTyxFQUFFLEVBQUUsRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFDO1lBQ3RELGtCQUFrQixFQUFFLEVBQUMsSUFBSSxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUUsRUFBRSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUMsRUFBRSxTQUFTO1NBQzlFLEVBQUU7WUFDQyxVQUFVLEVBQUUsS0FBSztZQUNqQixVQUFVLEVBQUUsRUFBQyxTQUFTLEVBQUUsWUFBWSxFQUFFLFNBQVMsRUFBRSxZQUFZLEVBQUM7WUFDOUQsTUFBTSxFQUFFLHFCQUFtQixDQUFDLGVBQWU7WUFDM0MsUUFBUSxFQUFFLHFCQUFtQixDQUFDLGVBQWU7U0FDaEQsQ0FBQyxDQUFDO1FBRUgsb0JBQW9CLENBQUMsS0FBSyxDQUFDLEVBQUMsTUFBTSxFQUFFLENBQUMsRUFBQyxDQUFDLENBQUM7UUFDeEMsb0JBQW9CLENBQUMsS0FBSyxDQUFDLEVBQUMsTUFBTSxFQUFFLENBQUMsRUFBQyxFQUFFLEVBQUMsTUFBTSxFQUFFLElBQUksRUFBQyxDQUFDLENBQUM7UUFFeEQsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxtQkFBbUIsRUFBRSxvQkFBb0IsQ0FBQyxDQUFDO0lBQzFFLENBQUM7SUFFRCxNQUFNLEtBQUssZUFBZTtRQUN0QixPQUFPO1lBQ0gsU0FBUyxDQUFDLEdBQUcsRUFBRSxHQUFHO2dCQUNkLE9BQU8sYUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7WUFDOUIsQ0FBQztTQUNKLENBQUM7SUFDTixDQUFDO0NBQ0osQ0FBQTtBQWhDWSxtQkFBbUI7SUFGL0IsY0FBSyxDQUFDLFdBQVcsQ0FBQztJQUNsQixnQkFBTyxDQUFDLHNCQUFzQixDQUFDO0lBR2YsV0FBQSxlQUFNLENBQUMsVUFBVSxDQUFDLENBQUE7O0dBRnRCLG1CQUFtQixDQWdDL0I7QUFoQ1ksa0RBQW1CIn0=