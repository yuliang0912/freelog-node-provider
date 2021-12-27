"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActionSetCoverHandler = void 0;
const lodash_1 = require("lodash");
const midway_1 = require("midway");
const injection_1 = require("injection");
let ActionSetCoverHandler = class ActionSetCoverHandler {
    /**
     * 替换展品封面操作
     * @param ctx
     * @param testRuleInfo
     * @param action
     */
    async handle(ctx, testRuleInfo, action) {
        if (!(0, lodash_1.isString)(action?.content)) {
            return false;
        }
        testRuleInfo.coverInfo = { coverImages: [action.content], source: testRuleInfo.id };
        return true;
    }
};
ActionSetCoverHandler = __decorate([
    (0, midway_1.provide)(),
    (0, midway_1.scope)(injection_1.ScopeEnum.Singleton)
], ActionSetCoverHandler);
exports.ActionSetCoverHandler = ActionSetCoverHandler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWN0aW9uLXNldC1jb3Zlci1oYW5kbGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vc3JjL2V4dGVuZC90ZXN0LXJ1bGUtaGFuZGxlci9hY3Rpb24taGFuZGxlci9hY3Rpb24tc2V0LWNvdmVyLWhhbmRsZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0FBQUEsbUNBQWdDO0FBQ2hDLG1DQUFzQztBQUV0Qyx5Q0FBb0M7QUFLcEMsSUFBYSxxQkFBcUIsR0FBbEMsTUFBYSxxQkFBcUI7SUFFOUI7Ozs7O09BS0c7SUFDSCxLQUFLLENBQUMsTUFBTSxDQUFDLEdBQW1CLEVBQUUsWUFBK0IsRUFBRSxNQUErQjtRQUM5RixJQUFJLENBQUMsSUFBQSxpQkFBUSxFQUFDLE1BQU0sRUFBRSxPQUFPLENBQUMsRUFBRTtZQUM1QixPQUFPLEtBQUssQ0FBQztTQUNoQjtRQUVELFlBQVksQ0FBQyxTQUFTLEdBQUcsRUFBQyxXQUFXLEVBQUUsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLEVBQUUsTUFBTSxFQUFFLFlBQVksQ0FBQyxFQUFFLEVBQUMsQ0FBQztRQUNsRixPQUFPLElBQUksQ0FBQztJQUNoQixDQUFDO0NBQ0osQ0FBQTtBQWhCWSxxQkFBcUI7SUFGakMsSUFBQSxnQkFBTyxHQUFFO0lBQ1QsSUFBQSxjQUFLLEVBQUMscUJBQVMsQ0FBQyxTQUFTLENBQUM7R0FDZCxxQkFBcUIsQ0FnQmpDO0FBaEJZLHNEQUFxQiJ9