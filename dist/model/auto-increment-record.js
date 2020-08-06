"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutoIncrementRecordModel = void 0;
const midway_1 = require("midway");
const mongoose_model_base_1 = require("./mongoose-model-base");
let AutoIncrementRecordModel = class AutoIncrementRecordModel extends mongoose_model_base_1.MongooseModelBase {
    buildMongooseModel() {
        const AutoIncrementRecordSchema = new this.mongoose.Schema({
            dataType: { type: String, unique: true, default: 'NODE_ID', required: true },
            value: { type: Number, required: true, mixin: 1 }
        }, {
            versionKey: false,
            timestamps: { createdAt: 'createDate', updatedAt: 'updateDate' }
        });
        AutoIncrementRecordSchema.index({ dataType: 1 }, { unique: true });
        return this.mongoose.model('auto-increment-record', AutoIncrementRecordSchema);
    }
};
AutoIncrementRecordModel = __decorate([
    midway_1.scope('Singleton'),
    midway_1.provide('model.AutoIncrementRecord')
], AutoIncrementRecordModel);
exports.AutoIncrementRecordModel = AutoIncrementRecordModel;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0by1pbmNyZW1lbnQtcmVjb3JkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL21vZGVsL2F1dG8taW5jcmVtZW50LXJlY29yZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUFBQSxtQ0FBc0M7QUFDdEMsK0RBQTRFO0FBSTVFLElBQWEsd0JBQXdCLEdBQXJDLE1BQWEsd0JBQXlCLFNBQVEsdUNBQWlCO0lBRTNELGtCQUFrQjtRQUVkLE1BQU0seUJBQXlCLEdBQUcsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQztZQUN2RCxRQUFRLEVBQUUsRUFBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFDO1lBQzFFLEtBQUssRUFBRSxFQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFDO1NBQ2xELEVBQUU7WUFDQyxVQUFVLEVBQUUsS0FBSztZQUNqQixVQUFVLEVBQUUsRUFBQyxTQUFTLEVBQUUsWUFBWSxFQUFFLFNBQVMsRUFBRSxZQUFZLEVBQUM7U0FDakUsQ0FBQyxDQUFDO1FBRUgseUJBQXlCLENBQUMsS0FBSyxDQUFDLEVBQUMsUUFBUSxFQUFFLENBQUMsRUFBQyxFQUFFLEVBQUMsTUFBTSxFQUFFLElBQUksRUFBQyxDQUFDLENBQUM7UUFFL0QsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyx1QkFBdUIsRUFBRSx5QkFBeUIsQ0FBQyxDQUFDO0lBQ25GLENBQUM7Q0FDSixDQUFBO0FBaEJZLHdCQUF3QjtJQUZwQyxjQUFLLENBQUMsV0FBVyxDQUFDO0lBQ2xCLGdCQUFPLENBQUMsMkJBQTJCLENBQUM7R0FDeEIsd0JBQXdCLENBZ0JwQztBQWhCWSw0REFBd0IifQ==