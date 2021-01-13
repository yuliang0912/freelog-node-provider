"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OptionSetCoverHandler = void 0;
const midway_1 = require("midway");
const lodash_1 = require("lodash");
let OptionSetCoverHandler = class OptionSetCoverHandler {
    constructor() {
        this.setTagsOptionEfficientCountInfo = { type: 'setTags', count: 1 };
    }
    /**
     * 替换展品封面操作
     * @param testRuleInfo
     */
    handle(testRuleInfo) {
        const { ruleInfo } = testRuleInfo;
        if (!testRuleInfo.isValid || !lodash_1.isString(ruleInfo.cover) || !['alter', 'add'].includes(ruleInfo.operation)) {
            return;
        }
        testRuleInfo.cover = { cover: testRuleInfo.ruleInfo.cover, source: testRuleInfo.id };
        testRuleInfo.efficientInfos.push(this.setTagsOptionEfficientCountInfo);
    }
};
OptionSetCoverHandler = __decorate([
    midway_1.provide()
], OptionSetCoverHandler);
exports.OptionSetCoverHandler = OptionSetCoverHandler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3B0aW9uLXNldC1jb3Zlci1oYW5kbGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2V4dGVuZC90ZXN0LXJ1bGUtaGFuZGxlci9vcHRpb24tc2V0LWNvdmVyLWhhbmRsZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0FBQUEsbUNBQStCO0FBRS9CLG1DQUErQjtBQUcvQixJQUFhLHFCQUFxQixHQUFsQyxNQUFhLHFCQUFxQjtJQUFsQztRQUVZLG9DQUErQixHQUEwQixFQUFDLElBQUksRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBQyxDQUFDO0lBZ0JqRyxDQUFDO0lBZEc7OztPQUdHO0lBQ0gsTUFBTSxDQUFDLFlBQStCO1FBRWxDLE1BQU0sRUFBQyxRQUFRLEVBQUMsR0FBRyxZQUFZLENBQUM7UUFDaEMsSUFBSSxDQUFDLFlBQVksQ0FBQyxPQUFPLElBQUksQ0FBQyxpQkFBUSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsT0FBTyxFQUFFLEtBQUssQ0FBQyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLEVBQUU7WUFDdEcsT0FBTztTQUNWO1FBRUQsWUFBWSxDQUFDLEtBQUssR0FBRyxFQUFDLEtBQUssRUFBRSxZQUFZLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRSxNQUFNLEVBQUUsWUFBWSxDQUFDLEVBQUUsRUFBQyxDQUFDO1FBQ25GLFlBQVksQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQywrQkFBK0IsQ0FBQyxDQUFDO0lBQzNFLENBQUM7Q0FDSixDQUFBO0FBbEJZLHFCQUFxQjtJQURqQyxnQkFBTyxFQUFFO0dBQ0cscUJBQXFCLENBa0JqQztBQWxCWSxzREFBcUIifQ==