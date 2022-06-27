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
var TestResourceTreeInfo_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestResourceTreeInfo = void 0;
const lodash_1 = require("lodash");
const midway_1 = require("midway");
const mongoose_model_base_1 = require("egg-freelog-base/database/mongoose-model-base");
let TestResourceTreeInfo = TestResourceTreeInfo_1 = class TestResourceTreeInfo extends mongoose_model_base_1.MongooseModelBase {
    constructor(mongoose) {
        super(mongoose);
    }
    buildMongooseModel() {
        // const BaseReplacedInfoSchema = new this.mongoose.Schema({
        //     id: {type: String, required: true},
        //     name: {type: String, required: true},
        //     type: {type: String, required: true}
        // }, {_id: false});
        const DependencyTreeSchema = new this.mongoose.Schema({
            nid: { type: String, required: true },
            id: { type: String, required: true },
            name: { type: String, required: true },
            type: { type: String, required: true },
            deep: { type: Number, required: true },
            version: { type: String, required: false },
            versionId: { type: String, required: false },
            fileSha1: { type: String, required: false },
            resourceType: { type: [String], default: [], required: false },
            parentNid: { type: String, required: false }
            // replaced: {type: BaseReplacedInfoSchema, required: false}
        }, { _id: false });
        const AuthTreeSchema = new this.mongoose.Schema({
            nid: { type: String, required: true },
            id: { type: String, required: true },
            name: { type: String, required: true },
            type: { type: String, required: true },
            deep: { type: Number, required: true },
            version: { type: String, required: false },
            versionId: { type: String, required: false },
            // resourceType: {type: [String], required: false},
            parentNid: { type: String, required: false },
            // userId: {type: Number, required: false}, //资源需要此字段,默认规则是自己的资源可以直接使用.此外还用于筛选待解决的依赖
        }, { _id: false });
        const TestResourceTreeSchema = new this.mongoose.Schema({
            nodeId: { type: Number, required: true },
            testResourceId: { type: String, required: true, unique: true },
            testResourceName: { type: String, required: true },
            resourceType: { type: [String], required: true },
            dependencyTree: { type: [DependencyTreeSchema], required: true },
            authTree: { type: [AuthTreeSchema], required: true },
        }, {
            versionKey: false,
            timestamps: { createdAt: 'createDate', updatedAt: 'updateDate' },
            toJSON: TestResourceTreeInfo_1.toObjectOptions,
            toObject: TestResourceTreeInfo_1.toObjectOptions
        });
        return this.mongoose.model('node-test-resource-tree-infos', TestResourceTreeSchema);
    }
    static get toObjectOptions() {
        return {
            transform(doc, ret) {
                return (0, lodash_1.omit)(ret, ['_id', 'id']);
            }
        };
    }
};
TestResourceTreeInfo = TestResourceTreeInfo_1 = __decorate([
    (0, midway_1.scope)('Singleton'),
    (0, midway_1.provide)('model.NodeTestResourceTreeInfo'),
    __param(0, (0, midway_1.plugin)('mongoose')),
    __metadata("design:paramtypes", [Object])
], TestResourceTreeInfo);
exports.TestResourceTreeInfo = TestResourceTreeInfo;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdC1yZXNvdXJjZS10cmVlLWluZm8uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvbW9kZWwvdGVzdC1yZXNvdXJjZS10cmVlLWluZm8udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLG1DQUE0QjtBQUM1QixtQ0FBOEM7QUFDOUMsdUZBQWdGO0FBSWhGLElBQWEsb0JBQW9CLDRCQUFqQyxNQUFhLG9CQUFxQixTQUFRLHVDQUFpQjtJQUV2RCxZQUFnQyxRQUFRO1FBQ3BDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUNwQixDQUFDO0lBRUQsa0JBQWtCO1FBRWQsNERBQTREO1FBQzVELDBDQUEwQztRQUMxQyw0Q0FBNEM7UUFDNUMsMkNBQTJDO1FBQzNDLG9CQUFvQjtRQUVwQixNQUFNLG9CQUFvQixHQUFHLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUM7WUFDbEQsR0FBRyxFQUFFLEVBQUMsSUFBSSxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFDO1lBQ25DLEVBQUUsRUFBRSxFQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBQztZQUNsQyxJQUFJLEVBQUUsRUFBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUM7WUFDcEMsSUFBSSxFQUFFLEVBQUMsSUFBSSxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFDO1lBQ3BDLElBQUksRUFBRSxFQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBQztZQUNwQyxPQUFPLEVBQUUsRUFBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUM7WUFDeEMsU0FBUyxFQUFFLEVBQUMsSUFBSSxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFDO1lBQzFDLFFBQVEsRUFBRSxFQUFDLElBQUksRUFBRSxN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