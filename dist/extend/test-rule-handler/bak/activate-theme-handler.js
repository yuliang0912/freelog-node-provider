"use strict";
// import {inject, provide} from 'midway';
// import {FreelogContext, IMongodbOperation, ResourceTypeEnum} from 'egg-freelog-base';
// import {TestRuleMatchInfo, TestRuleEfficientInfo, TestResourceInfo} from '../../test-node-interface';
//
// @provide()
// export class ActivateThemeHandler {
//
//     @inject()
//     ctx: FreelogContext;
//     @inject()
//     nodeTestResourceProvider: IMongodbOperation<TestResourceInfo>;
//
//     private activeThemeEfficientCountInfo: TestRuleEfficientInfo = {type: 'activateTheme', count: 1};
//
//     /**
//      * 激活主题操作(此规则需要后置单独处理)
//      * @param nodeId
//      * @param activeThemeRuleInfo
//      */
//     async handle(nodeId: number, activeThemeRuleInfo: TestRuleMatchInfo): Promise<TestResourceInfo> {
//
//         const themeResourceInfo = await this.nodeTestResourceProvider.findOne({
//             nodeId,
//             testResourceName: new RegExp(`^${activeThemeRuleInfo.ruleInfo.themeName}$`, 'i')
//         });
//         if (activeThemeRuleInfo?.isValid === false) {
//             return themeResourceInfo;
//         }
//         if (!themeResourceInfo) {
//             activeThemeRuleInfo.matchErrors.push(this.ctx.gettext(`reflect_rule_pre_excute_error_exhibit_not_existed`, activeThemeRuleInfo.ruleInfo.themeName));
//             return;
//         } else if (themeResourceInfo.resourceType !== ResourceTypeEnum.THEME) {
//             activeThemeRuleInfo.matchErrors.push(this.ctx.gettext(`reflect_rule_pre_excute_error_exhibit_not_theme`, activeThemeRuleInfo.ruleInfo.themeName));
//             return;
//         }
//
//         activeThemeRuleInfo.efficientInfos.push(this.activeThemeEfficientCountInfo);
//         return themeResourceInfo;
//     }
// }
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWN0aXZhdGUtdGhlbWUtaGFuZGxlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3NyYy9leHRlbmQvdGVzdC1ydWxlLWhhbmRsZXIvYmFrL2FjdGl2YXRlLXRoZW1lLWhhbmRsZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLDBDQUEwQztBQUMxQyx3RkFBd0Y7QUFDeEYsd0dBQXdHO0FBQ3hHLEVBQUU7QUFDRixhQUFhO0FBQ2Isc0NBQXNDO0FBQ3RDLEVBQUU7QUFDRixnQkFBZ0I7QUFDaEIsMkJBQTJCO0FBQzNCLGdCQUFnQjtBQUNoQixxRUFBcUU7QUFDckUsRUFBRTtBQUNGLHdHQUF3RztBQUN4RyxFQUFFO0FBQ0YsVUFBVTtBQUNWLDZCQUE2QjtBQUM3Qix1QkFBdUI7QUFDdkIsb0NBQW9DO0FBQ3BDLFVBQVU7QUFDVix3R0FBd0c7QUFDeEcsRUFBRTtBQUNGLGtGQUFrRjtBQUNsRixzQkFBc0I7QUFDdEIsK0ZBQStGO0FBQy9GLGNBQWM7QUFDZCx3REFBd0Q7QUFDeEQsd0NBQXdDO0FBQ3hDLFlBQVk7QUFDWixvQ0FBb0M7QUFDcEMsbUtBQW1LO0FBQ25LLHNCQUFzQjtBQUN0QixrRkFBa0Y7QUFDbEYsaUtBQWlLO0FBQ2pLLHNCQUFzQjtBQUN0QixZQUFZO0FBQ1osRUFBRTtBQUNGLHVGQUF1RjtBQUN2RixvQ0FBb0M7QUFDcEMsUUFBUTtBQUNSLElBQUkifQ==