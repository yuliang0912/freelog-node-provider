"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var NodeTestRuleInfo_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NodeTestRuleInfo = void 0;
const lodash_1 = require("lodash");
const midway_1 = require("midway");
const mongoose_model_base_1 = require("./mongoose-model-base");
let NodeTestRuleInfo = NodeTestRuleInfo_1 = class NodeTestRuleInfo extends mongoose_model_base_1.MongooseModelBase {
    buildMongooseModel() {
        const TestRuleInfo = new this.mongoose.Schema({
            id: { type: String, required: true },
            text: { type: String, required: true },
            ruleInfo: { type: this.mongoose.Schema.Types.Mixed, default: {}, required: true },
            matchErrors: { type: [String], required: false, default: [] },
            effectiveMatchCount: { type: Number, required: false, default: 0 }
        }, { _id: false, minimize: false });
        const NodeTestRuleSchema = new this.mongoose.Schema({
            nodeId: { type: Number, required: true },
            userId: { type: Number, required: true },
            ruleText: { type: String, required: false, default: '' },
            themeId: { type: String, required: false, default: '' },
            testRules: {
                type: [TestRuleInfo], required: true
            },
            status: { type: Number, default: 0 }
        }, {
            minimize: false,
            versionKey: false,
            toJSON: NodeTestRuleInfo_1.toObjectOptions,
            toObject: NodeTestRuleInfo_1.toObjectOptions,
            timestamps: { createdAt: 'createDate', updatedAt: 'updateDate' }
        });
        NodeTestRuleSchema.index({ nodeId: 1 }, { unique: true });
        return this.mongoose.model('node-test-rules', TestRuleInfo);
    }
    static get toObjectOptions() {
        return {
            transform(doc, ret) {
                return lodash_1.omit(ret, ['_id', 'id']);
            }
        };
    }
};
NodeTestRuleInfo = NodeTestRuleInfo_1 = __decorate([
    midway_1.scope('Singleton'),
    midway_1.provide('model.NodeTestRuleInfo')
], NodeTestRuleInfo);
exports.NodeTestRuleInfo = NodeTestRuleInfo;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm9kZS10ZXN0LXJ1bGUtaW5mby5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9tb2RlbC9ub2RlLXRlc3QtcnVsZS1pbmZvLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7QUFBQSxtQ0FBNEI7QUFDNUIsbUNBQXNDO0FBQ3RDLCtEQUE0RTtBQUk1RSxJQUFhLGdCQUFnQix3QkFBN0IsTUFBYSxnQkFBaUIsU0FBUSx1Q0FBaUI7SUFFbkQsa0JBQWtCO1FBRWQsTUFBTSxZQUFZLEdBQUcsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQztZQUMxQyxFQUFFLEVBQUUsRUFBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUM7WUFDbEMsSUFBSSxFQUFFLEVBQUMsSUFBSSxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFDO1lBQ3BDLFFBQVEsRUFBRSxFQUFDLElBQUksRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFLE9BQU8sRUFBRSxFQUFFLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBQztZQUMvRSxXQUFXLEVBQUUsRUFBQyxJQUFJLEVBQUUsQ0FBQyxNQUFNLENBQUMsRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxFQUFFLEVBQUM7WUFDM0QsbUJBQW1CLEVBQUUsRUFBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLENBQUMsRUFBQztTQUNuRSxFQUFFLEVBQUMsR0FBRyxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFDLENBQUMsQ0FBQTtRQUVqQyxNQUFNLGtCQUFrQixHQUFHLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUM7WUFDaEQsTUFBTSxFQUFFLEVBQUMsSUFBSSxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFDO1lBQ3RDLE1BQU0sRUFBRSxFQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBQztZQUN0QyxRQUFRLEVBQUUsRUFBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLEVBQUUsRUFBQztZQUN0RCxPQUFPLEVBQUUsRUFBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLEVBQUUsRUFBQztZQUNyRCxTQUFTLEVBQUU7Z0JBQ1AsSUFBSSxFQUFFLENBQUMsWUFBWSxDQUFDLEVBQUUsUUFBUSxFQUFFLElBQUk7YUFDdkM7WUFDRCxNQUFNLEVBQUUsRUFBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSxDQUFDLEVBQUM7U0FDckMsRUFBRTtZQUNDLFFBQVEsRUFBRSxLQUFLO1lBQ2YsVUFBVSxFQUFFLEtBQUs7WUFDakIsTUFBTSxFQUFFLGtCQUFnQixDQUFDLGVBQWU7WUFDeEMsUUFBUSxFQUFFLGtCQUFnQixDQUFDLGVBQWU7WUFDMUMsVUFBVSxFQUFFLEVBQUMsU0FBUyxFQUFFLFlBQVksRUFBRSxTQUFTLEVBQUUsWUFBWSxFQUFDO1NBQ2pFLENBQUMsQ0FBQTtRQUVGLGtCQUFrQixDQUFDLEtBQUssQ0FBQyxFQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUMsRUFBRSxFQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUMsQ0FBQyxDQUFDO1FBRXRELE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsaUJBQWlCLEVBQUUsWUFBWSxDQUFDLENBQUM7SUFDaEUsQ0FBQztJQUVELE1BQU0sS0FBSyxlQUFlO1FBQ3RCLE9BQU87WUFDSCxTQUFTLENBQUMsR0FBRyxFQUFFLEdBQUc7Z0JBQ2QsT0FBTyxhQUFJLENBQUMsR0FBRyxFQUFFLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7WUFDcEMsQ0FBQztTQUNKLENBQUM7SUFDTixDQUFDO0NBQ0osQ0FBQTtBQXpDWSxnQkFBZ0I7SUFGNUIsY0FBSyxDQUFDLFdBQVcsQ0FBQztJQUNsQixnQkFBTyxDQUFDLHdCQUF3QixDQUFDO0dBQ3JCLGdCQUFnQixDQXlDNUI7QUF6Q1ksNENBQWdCIn0=