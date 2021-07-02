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
const egg_freelog_base_1 = require("egg-freelog-base");
let NodeTestRuleProvider = class NodeTestRuleProvider extends egg_freelog_base_1.MongodbOperation {
    constructor(model) {
        super(model);
    }
};
NodeTestRuleProvider = __decorate([
    midway_1.provide(),
    midway_1.scope('Singleton'),
    __param(0, midway_1.inject('model.NodeTestRuleInfo')),
    __metadata("design:paramtypes", [Object])
], NodeTestRuleProvider);
exports.default = NodeTestRuleProvider;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm9kZS10ZXN0LXJ1bGUtcHJvdmlkZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvYXBwL2RhdGEtcHJvdmlkZXIvbm9kZS10ZXN0LXJ1bGUtcHJvdmlkZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7QUFBQSxtQ0FBOEM7QUFDOUMsdURBQWlEO0FBS2pELElBQXFCLG9CQUFvQixHQUF6QyxNQUFxQixvQkFBcUIsU0FBUSxtQ0FBa0M7SUFDaEYsWUFBOEMsS0FBSztRQUMvQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDakIsQ0FBQztDQUNKLENBQUE7QUFKb0Isb0JBQW9CO0lBRnhDLGdCQUFPLEVBQUU7SUFDVCxjQUFLLENBQUMsV0FBVyxDQUFDO0lBRUYsV0FBQSxlQUFNLENBQUMsd0JBQXdCLENBQUMsQ0FBQTs7R0FENUIsb0JBQW9CLENBSXhDO2tCQUpvQixvQkFBb0IifQ==