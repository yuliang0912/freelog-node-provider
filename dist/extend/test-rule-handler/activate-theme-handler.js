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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActivateThemeHandler = void 0;
const midway_1 = require("midway");
const test_node_interface_1 = require("../../test-node-interface");
const lodash_1 = require("lodash");
const egg_freelog_base_1 = require("egg-freelog-base");
const test_node_generator_1 = require("../test-node-generator");
let ActivateThemeHandler = class ActivateThemeHandler {
    constructor() {
        this.activeThemeEfficientCountInfo = { type: 'activeTheme', count: 1 };
    }
    /**
     * 激活主题操作
     * @param testRuleInfo
     * @param nodeId
     * @param testRuleMatchInfos
     */
    async handle(testRuleInfo, nodeId, testRuleMatchInfos) {
        const { ruleInfo } = testRuleInfo;
        if (!testRuleInfo.isValid || !lodash_1.isString(ruleInfo.exhibitName) || ruleInfo.operation !== test_node_interface_1.TestNodeOperationEnum.ActivateTheme) {
            return;
        }
        const themeTestResourceInfo = testRuleMatchInfos.find(x => x.ruleInfo.exhibitName.toLowerCase() === ruleInfo.exhibitName.toLowerCase());
        if (themeTestResourceInfo && (!themeTestResourceInfo.isValid || themeTestResourceInfo.testResourceOriginInfo.resourceType !== egg_freelog_base_1.ResourceTypeEnum.THEME)) {
            testRuleInfo.isValid = false;
            testRuleInfo.matchErrors.push(`展品${testRuleInfo.ruleInfo.exhibitName}不是一个有效的主题资源`);
            return;
        }
        else if (themeTestResourceInfo) {
            testRuleInfo.themeInfo = {
                testResourceId: this.testNodeGenerator.generateTestResourceId(nodeId, themeTestResourceInfo.testResourceOriginInfo),
                source: testRuleInfo.id
            };
            testRuleInfo.efficientInfos.push(this.activeThemeEfficientCountInfo);
            return;
        }
        const presentableInfo = await this.presentableService.findOne({
            nodeId, presentableName: new RegExp(`^${testRuleInfo.ruleInfo.exhibitName}$`, 'i')
        }, 'resourceInfo');
        if (!presentableInfo || presentableInfo.resourceInfo.resourceType !== egg_freelog_base_1.ResourceTypeEnum.THEME) {
            testRuleInfo.isValid = false;
            testRuleInfo.matchErrors.push(`展品${testRuleInfo.ruleInfo.exhibitName}不是一个有效的主题资源`);
            return;
        }
        testRuleInfo.themeInfo = {
            testResourceId: this.testNodeGenerator.generateTestResourceId(nodeId, {
                id: presentableInfo.resourceInfo.resourceId,
                type: test_node_interface_1.TestResourceOriginType.Resource
            }),
            source: testRuleInfo.id
        };
        testRuleInfo.efficientInfos.push(this.activeThemeEfficientCountInfo);
    }
};
__decorate([
    midway_1.inject(),
    __metadata("design:type", test_node_generator_1.TestNodeGenerator)
], ActivateThemeHandler.prototype, "testNodeGenerator", void 0);
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], ActivateThemeHandler.prototype, "presentableService", void 0);
ActivateThemeHandler = __decorate([
    midway_1.provide()
], ActivateThemeHandler);
exports.ActivateThemeHandler = ActivateThemeHandler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWN0aXZhdGUtdGhlbWUtaGFuZGxlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9leHRlbmQvdGVzdC1ydWxlLWhhbmRsZXIvYWN0aXZhdGUtdGhlbWUtaGFuZGxlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7QUFBQSxtQ0FBdUM7QUFDdkMsbUVBSW1DO0FBQ25DLG1DQUErQjtBQUMvQix1REFBa0Q7QUFFbEQsZ0VBQXlEO0FBSXpELElBQWEsb0JBQW9CLEdBQWpDLE1BQWEsb0JBQW9CO0lBQWpDO1FBT1ksa0NBQTZCLEdBQTBCLEVBQUMsSUFBSSxFQUFFLGFBQWEsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFDLENBQUM7SUErQ25HLENBQUM7SUE3Q0c7Ozs7O09BS0c7SUFDSCxLQUFLLENBQUMsTUFBTSxDQUFDLFlBQStCLEVBQUUsTUFBYyxFQUFFLGtCQUF1QztRQUVqRyxNQUFNLEVBQUMsUUFBUSxFQUFDLEdBQUcsWUFBWSxDQUFDO1FBQ2hDLElBQUksQ0FBQyxZQUFZLENBQUMsT0FBTyxJQUFJLENBQUMsaUJBQVEsQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLElBQUksUUFBUSxDQUFDLFNBQVMsS0FBSywyQ0FBcUIsQ0FBQyxhQUFhLEVBQUU7WUFDeEgsT0FBTztTQUNWO1FBRUQsTUFBTSxxQkFBcUIsR0FBRyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxXQUFXLEVBQUUsS0FBSyxRQUFRLENBQUMsV0FBVyxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUM7UUFDeEksSUFBSSxxQkFBcUIsSUFBSSxDQUFDLENBQUMscUJBQXFCLENBQUMsT0FBTyxJQUFJLHFCQUFxQixDQUFDLHNCQUFzQixDQUFDLFlBQVksS0FBSyxtQ0FBZ0IsQ0FBQyxLQUFLLENBQUMsRUFBRTtZQUNuSixZQUFZLENBQUMsT0FBTyxHQUFHLEtBQUssQ0FBQztZQUM3QixZQUFZLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLFlBQVksQ0FBQyxRQUFRLENBQUMsV0FBVyxhQUFhLENBQUMsQ0FBQztZQUNuRixPQUFPO1NBQ1Y7YUFBTSxJQUFJLHFCQUFxQixFQUFFO1lBQzlCLFlBQVksQ0FBQyxTQUFTLEdBQUc7Z0JBQ3JCLGNBQWMsRUFBRSxJQUFJLENBQUMsaUJBQWlCLENBQUMsc0JBQXNCLENBQUMsTUFBTSxFQUFFLHFCQUFxQixDQUFDLHNCQUFzQixDQUFDO2dCQUNuSCxNQUFNLEVBQUUsWUFBWSxDQUFDLEVBQUU7YUFDMUIsQ0FBQztZQUNGLFlBQVksQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDO1lBQ3JFLE9BQU87U0FDVjtRQUVELE1BQU0sZUFBZSxHQUFHLE1BQU0sSUFBSSxDQUFDLGtCQUFrQixDQUFDLE9BQU8sQ0FBQztZQUMxRCxNQUFNLEVBQUUsZUFBZSxFQUFFLElBQUksTUFBTSxDQUFDLElBQUksWUFBWSxDQUFDLFFBQVEsQ0FBQyxXQUFXLEdBQUcsRUFBRSxHQUFHLENBQUM7U0FDckYsRUFBRSxjQUFjLENBQUMsQ0FBQztRQUVuQixJQUFJLENBQUMsZUFBZSxJQUFJLGVBQWUsQ0FBQyxZQUFZLENBQUMsWUFBWSxLQUFLLG1DQUFnQixDQUFDLEtBQUssRUFBRTtZQUMxRixZQUFZLENBQUMsT0FBTyxHQUFHLEtBQUssQ0FBQztZQUM3QixZQUFZLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLFlBQVksQ0FBQyxRQUFRLENBQUMsV0FBVyxhQUFhLENBQUMsQ0FBQztZQUNuRixPQUFPO1NBQ1Y7UUFFRCxZQUFZLENBQUMsU0FBUyxHQUFHO1lBQ3JCLGNBQWMsRUFBRSxJQUFJLENBQUMsaUJBQWlCLENBQUMsc0JBQXNCLENBQUMsTUFBTSxFQUFFO2dCQUNsRSxFQUFFLEVBQUUsZUFBZSxDQUFDLFlBQVksQ0FBQyxVQUFVO2dCQUMzQyxJQUFJLEVBQUUsNENBQXNCLENBQUMsUUFBUTthQUNqQyxDQUFDO1lBQUUsTUFBTSxFQUFFLFlBQVksQ0FBQyxFQUFFO1NBQ3JDLENBQUM7UUFDRixZQUFZLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsNkJBQTZCLENBQUMsQ0FBQztJQUN6RSxDQUFDO0NBQ0osQ0FBQTtBQW5ERztJQURDLGVBQU0sRUFBRTs4QkFDVSx1Q0FBaUI7K0RBQUM7QUFFckM7SUFEQyxlQUFNLEVBQUU7O2dFQUMrQjtBQUwvQixvQkFBb0I7SUFEaEMsZ0JBQU8sRUFBRTtHQUNHLG9CQUFvQixDQXNEaEM7QUF0RFksb0RBQW9CIn0=