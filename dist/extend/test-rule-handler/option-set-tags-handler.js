"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OptionSetTagsHandler = void 0;
const midway_1 = require("midway");
const lodash_1 = require("lodash");
let OptionSetTagsHandler = class OptionSetTagsHandler {
    constructor() {
        this.setTagsOptionEfficientCountInfo = { type: 'setTags', count: 1 };
    }
    /**
     * 替换标签操作
     * @param testRuleInfo
     */
    handle(testRuleInfo) {
        const { ruleInfo } = testRuleInfo;
        if (!testRuleInfo.isValid || !lodash_1.isArray(ruleInfo.tags) || !['alter', 'add'].includes(ruleInfo.operation)) {
            return;
        }
        testRuleInfo.tags = { tags: testRuleInfo.ruleInfo.tags, source: testRuleInfo.id };
        testRuleInfo.efficientCountInfos.push(this.setTagsOptionEfficientCountInfo);
    }
};
OptionSetTagsHandler = __decorate([
    midway_1.provide()
], OptionSetTagsHandler);
exports.OptionSetTagsHandler = OptionSetTagsHandler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3B0aW9uLXNldC10YWdzLWhhbmRsZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvZXh0ZW5kL3Rlc3QtcnVsZS1oYW5kbGVyL29wdGlvbi1zZXQtdGFncy1oYW5kbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7OztBQUFBLG1DQUErQjtBQUUvQixtQ0FBOEI7QUFHOUIsSUFBYSxvQkFBb0IsR0FBakMsTUFBYSxvQkFBb0I7SUFBakM7UUFFWSxvQ0FBK0IsR0FBMEIsRUFBQyxJQUFJLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUMsQ0FBQztJQWdCakcsQ0FBQztJQWRHOzs7T0FHRztJQUNILE1BQU0sQ0FBQyxZQUErQjtRQUVsQyxNQUFNLEVBQUMsUUFBUSxFQUFDLEdBQUcsWUFBWSxDQUFDO1FBQ2hDLElBQUksQ0FBQyxZQUFZLENBQUMsT0FBTyxJQUFJLENBQUMsZ0JBQU8sQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLE9BQU8sRUFBRSxLQUFLLENBQUMsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxFQUFFO1lBQ3BHLE9BQU87U0FDVjtRQUVELFlBQVksQ0FBQyxJQUFJLEdBQUcsRUFBQyxJQUFJLEVBQUUsWUFBWSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLFlBQVksQ0FBQyxFQUFFLEVBQUMsQ0FBQztRQUNoRixZQUFZLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQywrQkFBK0IsQ0FBQyxDQUFDO0lBQ2hGLENBQUM7Q0FDSixDQUFBO0FBbEJZLG9CQUFvQjtJQURoQyxnQkFBTyxFQUFFO0dBQ0csb0JBQW9CLENBa0JoQztBQWxCWSxvREFBb0IifQ==