"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestRuleInfo = void 0;
const lodash_1 = require("lodash");
const midway_1 = require("midway");
const mongoose_model_base_1 = require("./mongoose-model-base");
let TestRuleInfo = class TestRuleInfo extends mongoose_model_base_1.MongooseModelBase {
    buildMongooseModel() {
        const TestRuleInfo = new this.mongoose.Schema({
            id: { type: String, required: true },
            ruleInfo: { type: this.mongoose.Schema.Types.Mixed, default: {}, required: true },
            matchErrors: { type: [String], required: true, default: [] },
            efficientInfos: { type: [], required: true, default: [] }
        }, { _id: false, minimize: false });
        const NodeTestRuleSchema = new this.mongoose.Schema({
            nodeId: { type: Number, required: true },
            userId: { type: Number, required: true },
            ruleText: { type: String, required: false, default: '' },
            themeId: { type: String, required: false, default: '' },
            testRules: {
                type: [TestRuleInfo], required: false
            },
            status: { type: Number, default: 0 }
        }, {
            minimize: false,
            versionKey: false,
            toJSON: TestRuleInfo.toObjectOptions,
            toObject: TestRuleInfo.toObjectOptions,
            timestamps: { createdAt: 'createDate', updatedAt: 'updateDate' }
        });
        NodeTestRuleSchema.index({ nodeId: 1 }, { unique: true });
        return this.mongoose.model('node-test-rules', NodeTestRuleSchema);
    }
    static get toObjectOptions() {
        return {
            transform(doc, ret) {
                return lodash_1.omit(ret, ['_id', 'id']);
            }
        };
    }
};
TestRuleInfo = __decorate([
    midway_1.scope('Singleton'),
    midway_1.provide('model.NodeTestRuleInfo')
], TestRuleInfo);
exports.TestRuleInfo = TestRuleInfo;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdC1ydWxlLWluZm8uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvbW9kZWwvdGVzdC1ydWxlLWluZm8udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0FBQUEsbUNBQTRCO0FBQzVCLG1DQUFzQztBQUN0QywrREFBNEU7QUFJNUUsSUFBYSxZQUFZLEdBQXpCLE1BQWEsWUFBYSxTQUFRLHVDQUFpQjtJQUUvQyxrQkFBa0I7UUFFZCxNQUFNLFlBQVksR0FBRyxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDO1lBQzFDLEVBQUUsRUFBRSxFQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBQztZQUNsQyxRQUFRLEVBQUUsRUFBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRSxPQUFPLEVBQUUsRUFBRSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUM7WUFDL0UsV0FBVyxFQUFFLEVBQUMsSUFBSSxFQUFFLENBQUMsTUFBTSxDQUFDLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsRUFBRSxFQUFDO1lBQzFELGNBQWMsRUFBRSxFQUFDLElBQUksRUFBRSxFQUFFLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsRUFBRSxFQUFDO1NBQzFELEVBQUUsRUFBQyxHQUFHLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUMsQ0FBQyxDQUFBO1FBRWpDLE1BQU0sa0JBQWtCLEdBQUcsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQztZQUNoRCxNQUFNLEVBQUUsRUFBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUM7WUFDdEMsTUFBTSxFQUFFLEVBQUMsSUFBSSxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFDO1lBQ3RDLFFBQVEsRUFBRSxFQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsRUFBRSxFQUFDO1lBQ3RELE9BQU8sRUFBRSxFQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsRUFBRSxFQUFDO1lBQ3JELFNBQVMsRUFBRTtnQkFDUCxJQUFJLEVBQUUsQ0FBQyxZQUFZLENBQUMsRUFBRSxRQUFRLEVBQUUsS0FBSzthQUN4QztZQUNELE1BQU0sRUFBRSxFQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFLENBQUMsRUFBQztTQUNyQyxFQUFFO1lBQ0MsUUFBUSxFQUFFLEtBQUs7WUFDZixVQUFVLEVBQUUsS0FBSztZQUNqQixNQUFNLEVBQUUsWUFBWSxDQUFDLGVBQWU7WUFDcEMsUUFBUSxFQUFFLFlBQVksQ0FBQyxlQUFlO1lBQ3RDLFVBQVUsRUFBRSxFQUFDLFNBQVMsRUFBRSxZQUFZLEVBQUUsU0FBUyxFQUFFLFlBQVksRUFBQztTQUNqRSxDQUFDLENBQUE7UUFFRixrQkFBa0IsQ0FBQyxLQUFLLENBQUMsRUFBQyxNQUFNLEVBQUUsQ0FBQyxFQUFDLEVBQUUsRUFBQyxNQUFNLEVBQUUsSUFBSSxFQUFDLENBQUMsQ0FBQztRQUV0RCxPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLGlCQUFpQixFQUFFLGtCQUFrQixDQUFDLENBQUM7SUFDdEUsQ0FBQztJQUVELE1BQU0sS0FBSyxlQUFlO1FBQ3RCLE9BQU87WUFDSCxTQUFTLENBQUMsR0FBRyxFQUFFLEdBQUc7Z0JBQ2QsT0FBTyxhQUFJLENBQUMsR0FBRyxFQUFFLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7WUFDcEMsQ0FBQztTQUNKLENBQUM7SUFDTixDQUFDO0NBQ0osQ0FBQTtBQXhDWSxZQUFZO0lBRnhCLGNBQUssQ0FBQyxXQUFXLENBQUM7SUFDbEIsZ0JBQU8sQ0FBQyx3QkFBd0IsQ0FBQztHQUNyQixZQUFZLENBd0N4QjtBQXhDWSxvQ0FBWSJ9