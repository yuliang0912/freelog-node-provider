"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestNodeGenerator = void 0;
const midway_1 = require("midway");
const crypto_helper_1 = require("egg-freelog-base/app/extend/helper/crypto_helper");
let TestNodeGenerator = class TestNodeGenerator {
    /**
     * 生成测试资源ID
     * @param nodeId
     * @param originInfo
     */
    generateTestResourceId(nodeId, originInfo) {
        return crypto_helper_1.md5(`${nodeId}-${originInfo.id}-${originInfo.type}`);
    }
};
TestNodeGenerator = __decorate([
    midway_1.provide()
], TestNodeGenerator);
exports.TestNodeGenerator = TestNodeGenerator;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdC1ub2RlLWdlbmVyYXRvci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9leHRlbmQvdGVzdC1ub2RlLWdlbmVyYXRvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUFBQSxtQ0FBK0I7QUFFL0Isb0ZBQW9FO0FBSXBFLElBQWEsaUJBQWlCLEdBQTlCLE1BQWEsaUJBQWlCO0lBRTFCOzs7O09BSUc7SUFDSCxzQkFBc0IsQ0FBQyxNQUFjLEVBQUUsVUFBa0M7UUFDckUsT0FBTyxtQkFBRyxDQUFDLEdBQUcsTUFBTSxJQUFJLFVBQVUsQ0FBQyxFQUFFLElBQUksVUFBVSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUM7SUFDaEUsQ0FBQztDQUVKLENBQUE7QUFYWSxpQkFBaUI7SUFEN0IsZ0JBQU8sRUFBRTtHQUNHLGlCQUFpQixDQVc3QjtBQVhZLDhDQUFpQiJ9