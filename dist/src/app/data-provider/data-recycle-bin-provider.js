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
let NodeProvider = class NodeProvider extends egg_freelog_base_1.MongodbOperation {
    constructor(model) {
        super(model);
    }
};
NodeProvider = __decorate([
    midway_1.provide(),
    midway_1.scope('Singleton'),
    __param(0, midway_1.inject('model.DataRecycleBin')),
    __metadata("design:paramtypes", [Object])
], NodeProvider);
exports.default = NodeProvider;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGF0YS1yZWN5Y2xlLWJpbi1wcm92aWRlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3NyYy9hcHAvZGF0YS1wcm92aWRlci9kYXRhLXJlY3ljbGUtYmluLXByb3ZpZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7O0FBQUEsbUNBQThDO0FBQzlDLHVEQUFpRDtBQUlqRCxJQUFxQixZQUFZLEdBQWpDLE1BQXFCLFlBQWEsU0FBUSxtQ0FBcUI7SUFDM0QsWUFBNEMsS0FBSztRQUM3QyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDakIsQ0FBQztDQUNKLENBQUE7QUFKb0IsWUFBWTtJQUZoQyxnQkFBTyxFQUFFO0lBQ1QsY0FBSyxDQUFDLFdBQVcsQ0FBQztJQUVGLFdBQUEsZUFBTSxDQUFDLHNCQUFzQixDQUFDLENBQUE7O0dBRDFCLFlBQVksQ0FJaEM7a0JBSm9CLFlBQVkifQ==