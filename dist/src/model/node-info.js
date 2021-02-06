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
var NodeInfoModel_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NodeInfoModel = void 0;
const lodash_1 = require("lodash");
const midway_1 = require("midway");
const mongoose_model_base_1 = require("egg-freelog-base/database/mongoose-model-base");
let NodeInfoModel = NodeInfoModel_1 = class NodeInfoModel extends mongoose_model_base_1.MongooseModelBase {
    constructor(mongoose) {
        super(mongoose);
    }
    buildMongooseModel() {
        const NodeInfoScheme = new this.mongoose.Schema({
            nodeId: { type: Number, unique: true, required: true },
            nodeName: { type: String, unique: true, required: true },
            nodeDomain: { type: String, unique: true, required: true },
            nodeThemeId: { type: String, required: false, default: '' },
            ownerUserId: { type: Number, required: true },
            ownerUserName: { type: String, required: true },
            uniqueKey: { type: String, required: true },
            auditStatus: { type: Number, default: 0, required: true },
            status: { type: Number, default: 0, required: true },
        }, {
            versionKey: false,
            timestamps: { createdAt: 'createDate', updatedAt: 'updateDate' },
            toJSON: NodeInfoModel_1.toObjectOptions,
            toObject: NodeInfoModel_1.toObjectOptions
        });
        NodeInfoScheme.index({ ownerUserId: 1 });
        NodeInfoScheme.index({ nodeId: 1 }, { unique: true });
        NodeInfoScheme.index({ nodeName: 1 }, { unique: true });
        NodeInfoScheme.index({ nodeDomain: 1 }, { unique: true });
        NodeInfoScheme.index({ uniqueKey: 1 }, { unique: true });
        NodeInfoScheme.virtual('pageBuildId').get(function () {
            return lodash_1.isUndefined(this.nodeThemeId) ? undefined : this.nodeThemeId;
        });
        return this.mongoose.model('nodes', NodeInfoScheme);
    }
    static get toObjectOptions() {
        return {
            getters: true,
            virtuals: true,
            transform(doc, ret) {
                return lodash_1.omit(ret, ['_id', 'id', 'uniqueKey']);
            }
        };
    }
};
NodeInfoModel = NodeInfoModel_1 = __decorate([
    midway_1.scope('Singleton'),
    midway_1.provide('model.NodeInfo'),
    __param(0, midway_1.plugin('mongoose')),
    __metadata("design:paramtypes", [Object])
], NodeInfoModel);
exports.NodeInfoModel = NodeInfoModel;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm9kZS1pbmZvLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL21vZGVsL25vZGUtaW5mby50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsbUNBQXlDO0FBQ3pDLG1DQUE4QztBQUM5Qyx1RkFBZ0Y7QUFJaEYsSUFBYSxhQUFhLHFCQUExQixNQUFhLGFBQWMsU0FBUSx1Q0FBaUI7SUFFaEQsWUFBZ0MsUUFBUTtRQUNwQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDcEIsQ0FBQztJQUVELGtCQUFrQjtRQUVkLE1BQU0sY0FBYyxHQUFHLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUM7WUFDNUMsTUFBTSxFQUFFLEVBQUMsSUFBSSxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUM7WUFDcEQsUUFBUSxFQUFFLEVBQUMsSUFBSSxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUM7WUFDdEQsVUFBVSxFQUFFLEVBQUMsSUFBSSxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUM7WUFDeEQsV0FBVyxFQUFFLEVBQUMsSUFBSSxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxFQUFFLEVBQUM7WUFDekQsV0FBVyxFQUFFLEVBQUMsSUFBSSxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFDO1lBQzNDLGFBQWEsRUFBRSxFQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBQztZQUM3QyxTQUFTLEVBQUUsRUFBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUM7WUFDekMsV0FBVyxFQUFFLEVBQUMsSUFBSSxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUUsQ0FBQyxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUM7WUFDdkQsTUFBTSxFQUFFLEVBQUMsSUFBSSxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUUsQ0FBQyxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUM7U0FDckQsRUFBRTtZQUNDLFVBQVUsRUFBRSxLQUFLO1lBQ2pCLFVBQVUsRUFBRSxFQUFDLFNBQVMsRUFBRSxZQUFZLEVBQUUsU0FBUyxFQUFFLFlBQVksRUFBQztZQUM5RCxNQUFNLEVBQUUsZUFBYSxDQUFDLGVBQWU7WUFDckMsUUFBUSxFQUFFLGVBQWEsQ0FBQyxlQUFlO1NBQzFDLENBQUMsQ0FBQztRQUVILGNBQWMsQ0FBQyxLQUFLLENBQUMsRUFBQyxXQUFXLEVBQUUsQ0FBQyxFQUFDLENBQUMsQ0FBQztRQUN2QyxjQUFjLENBQUMsS0FBSyxDQUFDLEVBQUMsTUFBTSxFQUFFLENBQUMsRUFBQyxFQUFFLEVBQUMsTUFBTSxFQUFFLElBQUksRUFBQyxDQUFDLENBQUM7UUFDbEQsY0FBYyxDQUFDLEtBQUssQ0FBQyxFQUFDLFFBQVEsRUFBRSxDQUFDLEVBQUMsRUFBRSxFQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUMsQ0FBQyxDQUFDO1FBQ3BELGNBQWMsQ0FBQyxLQUFLLENBQUMsRUFBQyxVQUFVLEVBQUUsQ0FBQyxFQUFDLEVBQUUsRUFBQyxNQUFNLEVBQUUsSUFBSSxFQUFDLENBQUMsQ0FBQztRQUN0RCxjQUFjLENBQUMsS0FBSyxDQUFDLEVBQUMsU0FBUyxFQUFFLENBQUMsRUFBQyxFQUFFLEVBQUMsTUFBTSxFQUFFLElBQUksRUFBQyxDQUFDLENBQUM7UUFFckQsY0FBYyxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsQ0FBQyxHQUFHLENBQUM7WUFDdEMsT0FBTyxvQkFBVyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDO1FBQ3hFLENBQUMsQ0FBQyxDQUFDO1FBRUgsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUUsY0FBYyxDQUFDLENBQUM7SUFDeEQsQ0FBQztJQUVELE1BQU0sS0FBSyxlQUFlO1FBQ3RCLE9BQU87WUFDSCxPQUFPLEVBQUUsSUFBSTtZQUNiLFFBQVEsRUFBRSxJQUFJO1lBQ2QsU0FBUyxDQUFDLEdBQUcsRUFBRSxHQUFHO2dCQUNkLE9BQU8sYUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDLEtBQUssRUFBRSxJQUFJLEVBQUUsV0FBVyxDQUFDLENBQUMsQ0FBQztZQUNqRCxDQUFDO1NBQ0osQ0FBQztJQUNOLENBQUM7Q0FDSixDQUFBO0FBL0NZLGFBQWE7SUFGekIsY0FBSyxDQUFDLFdBQVcsQ0FBQztJQUNsQixnQkFBTyxDQUFDLGdCQUFnQixDQUFDO0lBR1QsV0FBQSxlQUFNLENBQUMsVUFBVSxDQUFDLENBQUE7O0dBRnRCLGFBQWEsQ0ErQ3pCO0FBL0NZLHNDQUFhIn0=