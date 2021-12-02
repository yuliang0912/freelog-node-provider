"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PolicyHelper = void 0;
const lodash_1 = require("lodash");
const midway_1 = require("midway");
const injection_1 = require("injection");
let PolicyHelper = class PolicyHelper {
    /**
     * 判定测试是否是免费的
     * 1.只有一个状态
     * 2.初始状态即授权状态
     * @param policyInfo
     */
    isFreePolicy(policyInfo) {
        const stateDescriptionInfos = Object.values(policyInfo.fsmDescriptionInfo);
        if (stateDescriptionInfos.length !== 1) {
            return false;
        }
        const stateDescriptionInfo = (0, lodash_1.first)(stateDescriptionInfos);
        return stateDescriptionInfo.isAuth;
    }
};
PolicyHelper = __decorate([
    (0, midway_1.provide)(),
    (0, midway_1.scope)(injection_1.ScopeEnum.Singleton)
], PolicyHelper);
exports.PolicyHelper = PolicyHelper;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicG9saWN5LWhlbHBlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9leHRlbmQvcG9saWN5LWhlbHBlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUFBQSxtQ0FBNkI7QUFFN0IsbUNBQXNDO0FBQ3RDLHlDQUFvQztBQUlwQyxJQUFhLFlBQVksR0FBekIsTUFBYSxZQUFZO0lBRXJCOzs7OztPQUtHO0lBQ0gsWUFBWSxDQUFDLFVBQTBCO1FBQ25DLE1BQU0scUJBQXFCLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsa0JBQWtCLENBQUMsQ0FBQztRQUMzRSxJQUFJLHFCQUFxQixDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7WUFDcEMsT0FBTyxLQUFLLENBQUM7U0FDaEI7UUFFRCxNQUFNLG9CQUFvQixHQUFHLElBQUEsY0FBSyxFQUFDLHFCQUFxQixDQUFDLENBQUM7UUFFMUQsT0FBTyxvQkFBb0IsQ0FBQyxNQUFNLENBQUM7SUFDdkMsQ0FBQztDQUNKLENBQUE7QUFsQlksWUFBWTtJQUZ4QixJQUFBLGdCQUFPLEdBQUU7SUFDVCxJQUFBLGNBQUssRUFBQyxxQkFBUyxDQUFDLFNBQVMsQ0FBQztHQUNkLFlBQVksQ0FrQnhCO0FBbEJZLG9DQUFZIn0=