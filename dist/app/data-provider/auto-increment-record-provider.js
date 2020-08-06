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
Object.defineProperty(exports, "__esModule", { value: true });
const midway_1 = require("midway");
const MongoBaseOperation = require("egg-freelog-base/lib/database/mongo-base-operation");
let AutoIncrementRecordProvider = class AutoIncrementRecordProvider extends MongoBaseOperation {
    constructor(model) {
        super(model);
    }
    /**
     * 获取下一个递增节点ID
     * @param {string} dataType
     * @returns {Promise<number>}
     */
    async getNextNodeId() {
        const dataType = 'NODE_ID';
        return super.findOneAndUpdate({ dataType }, { $inc: { value: 1 } }, { new: true }).then(model => {
            return model || super.create({ dataType, value: 80000000 });
        }).then(data => data.value);
    }
};
AutoIncrementRecordProvider = __decorate([
    midway_1.provide(),
    midway_1.scope('Singleton'),
    __param(0, midway_1.inject('model.AutoIncrementRecord')),
    __metadata("design:paramtypes", [Object])
], AutoIncrementRecordProvider);
exports.default = AutoIncrementRecordProvider;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0by1pbmNyZW1lbnQtcmVjb3JkLXByb3ZpZGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2FwcC9kYXRhLXByb3ZpZGVyL2F1dG8taW5jcmVtZW50LXJlY29yZC1wcm92aWRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7OztBQUFBLG1DQUE4QztBQUM5Qyx5RkFBeUY7QUFJekYsSUFBcUIsMkJBQTJCLEdBQWhELE1BQXFCLDJCQUE0QixTQUFRLGtCQUFrQjtJQUN2RSxZQUFpRCxLQUFLO1FBQ2xELEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUNqQixDQUFDO0lBRUQ7Ozs7T0FJRztJQUNILEtBQUssQ0FBQyxhQUFhO1FBQ2YsTUFBTSxRQUFRLEdBQUcsU0FBUyxDQUFDO1FBQzNCLE9BQU8sS0FBSyxDQUFDLGdCQUFnQixDQUFDLEVBQUMsUUFBUSxFQUFDLEVBQUUsRUFBQyxJQUFJLEVBQUUsRUFBQyxLQUFLLEVBQUUsQ0FBQyxFQUFDLEVBQUMsRUFBRSxFQUFDLEdBQUcsRUFBRSxJQUFJLEVBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRTtZQUNwRixPQUFPLEtBQUssSUFBSSxLQUFLLENBQUMsTUFBTSxDQUFDLEVBQUMsUUFBUSxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUMsQ0FBQyxDQUFBO1FBQzdELENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUNoQyxDQUFDO0NBQ0osQ0FBQTtBQWhCb0IsMkJBQTJCO0lBRi9DLGdCQUFPLEVBQUU7SUFDVCxjQUFLLENBQUMsV0FBVyxDQUFDO0lBRUYsV0FBQSxlQUFNLENBQUMsMkJBQTJCLENBQUMsQ0FBQTs7R0FEL0IsMkJBQTJCLENBZ0IvQztrQkFoQm9CLDJCQUEyQiJ9