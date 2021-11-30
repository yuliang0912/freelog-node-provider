"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var PresentableAdapter_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PresentableAdapter = void 0;
const egg_freelog_base_1 = require("egg-freelog-base");
const enum_1 = require("../../enum");
const lodash_1 = require("lodash");
const midway_1 = require("midway");
let PresentableAdapter = PresentableAdapter_1 = class PresentableAdapter {
    /**
     * presentable适配为展品
     * @param presentableInfo
     * @param presentableVersionInfo
     */
    presentableWrapToExhibitInfo(presentableInfo, presentableVersionInfo) {
        const exhibitInfo = {
            exhibitId: presentableInfo.presentableId,
            exhibitName: presentableInfo.presentableName,
            exhibitTitle: presentableInfo.presentableTitle,
            exhibitSubjectType: egg_freelog_base_1.SubjectTypeEnum.Presentable,
            tags: presentableInfo.tags,
            coverImages: presentableInfo.coverImages,
            version: presentableInfo.version,
            policies: presentableInfo.policies,
            onlineStatus: presentableInfo.onlineStatus,
            nodeId: presentableInfo.nodeId,
            userId: presentableInfo.userId,
            articleInfo: {
                articleId: presentableInfo.resourceInfo.resourceId,
                articleName: presentableInfo.resourceInfo.resourceName,
                resourceType: presentableInfo.resourceInfo.resourceType,
                articleType: 1,
                articleOwnerId: 0,
                articleOwnerName: lodash_1.first(presentableInfo.resourceInfo.resourceName.split('/'))
            },
            status: 0
        };
        if (presentableVersionInfo) {
            exhibitInfo.versionInfo = PresentableAdapter_1.presentableVersionInfoWrapToExhibitVersionInfo(presentableVersionInfo);
        }
        return exhibitInfo;
    }
    /**
     * presentable版本适配为exhibit版本信息
     * @param presentableVersionInfo
     */
    static presentableVersionInfoWrapToExhibitVersionInfo(presentableVersionInfo) {
        return {
            exhibitId: presentableVersionInfo.presentableId,
            version: presentableVersionInfo.version,
            articleId: presentableVersionInfo.resourceId,
            articleSystemProperty: presentableVersionInfo.resourceSystemProperty,
            articleCustomPropertyDescriptors: presentableVersionInfo.resourceCustomPropertyDescriptors,
            exhibitRewriteProperty: presentableVersionInfo.presentableRewriteProperty,
            exhibitProperty: presentableVersionInfo.versionProperty,
            authTree: PresentableAdapter_1.presentableAuthTreeWrapToExhibitDependencyNodeInfo(presentableVersionInfo.authTree),
            dependencyTree: PresentableAdapter_1.presentableDependencyTreeWrapToExhibitDependencyNodeInfo(presentableVersionInfo.dependencyTree)
        };
    }
    /**
     * presentable依赖树适配为exhibit依赖树
     * @param presentableDependencyTree
     */
    static presentableDependencyTreeWrapToExhibitDependencyNodeInfo(presentableDependencyTree) {
        return presentableDependencyTree?.map(item => {
            return {
                nid: item.nid ?? '',
                articleId: item.resourceId,
                articleName: item.resourceName,
                articleType: enum_1.ArticleTypeEnum.IndividualResource,
                version: item.version,
                versionRange: item.versionRange,
                resourceType: item.resourceType,
                versionId: item.versionId,
                deep: item.deep,
                parentNid: item.parentNid
            };
        });
    }
    /**
     * presentable授权树适配为exhibit依赖树
     * @param presentableAuthTree
     */
    static presentableAuthTreeWrapToExhibitDependencyNodeInfo(presentableAuthTree) {
        return presentableAuthTree?.map(item => {
            return {
                nid: item.nid,
                articleId: item.resourceId,
                articleName: item.resourceName,
                articleType: enum_1.ArticleTypeEnum.IndividualResource,
                resourceType: item.resourceType,
                version: item.version,
                versionId: item.versionId,
                deep: item.deep,
                parentNid: item.parentNid
            };
        });
    }
};
PresentableAdapter = PresentableAdapter_1 = __decorate([
    midway_1.provide()
], PresentableAdapter);
exports.PresentableAdapter = PresentableAdapter;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlc2VudGFibGUtYWRhcHRlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9leHRlbmQvZXhoaWJpdC1hZGFwdGVyL3ByZXNlbnRhYmxlLWFkYXB0ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7OztBQVVBLHVEQUFpRDtBQUNqRCxxQ0FBMkM7QUFDM0MsbUNBQTZCO0FBQzdCLG1DQUErQjtBQUcvQixJQUFhLGtCQUFrQiwwQkFBL0IsTUFBYSxrQkFBa0I7SUFFM0I7Ozs7T0FJRztJQUNILDRCQUE0QixDQUFDLGVBQWdDLEVBQUUsc0JBQStDO1FBRTFHLE1BQU0sV0FBVyxHQUFnQjtZQUM3QixTQUFTLEVBQUUsZUFBZSxDQUFDLGFBQWE7WUFDeEMsV0FBVyxFQUFFLGVBQWUsQ0FBQyxlQUFlO1lBQzVDLFlBQVksRUFBRSxlQUFlLENBQUMsZ0JBQWdCO1lBQzlDLGtCQUFrQixFQUFFLGtDQUFlLENBQUMsV0FBVztZQUMvQyxJQUFJLEVBQUUsZUFBZSxDQUFDLElBQUk7WUFDMUIsV0FBVyxFQUFFLGVBQWUsQ0FBQyxXQUFXO1lBQ3hDLE9BQU8sRUFBRSxlQUFlLENBQUMsT0FBTztZQUNoQyxRQUFRLEVBQUUsZUFBZSxDQUFDLFFBQVE7WUFDbEMsWUFBWSxFQUFFLGVBQWUsQ0FBQyxZQUFZO1lBQzFDLE1BQU0sRUFBRSxlQUFlLENBQUMsTUFBTTtZQUM5QixNQUFNLEVBQUUsZUFBZSxDQUFDLE1BQU07WUFDOUIsV0FBVyxFQUFFO2dCQUNULFNBQVMsRUFBRSxlQUFlLENBQUMsWUFBWSxDQUFDLFVBQVU7Z0JBQ2xELFdBQVcsRUFBRSxlQUFlLENBQUMsWUFBWSxDQUFDLFlBQVk7Z0JBQ3RELFlBQVksRUFBRSxlQUFlLENBQUMsWUFBWSxDQUFDLFlBQVk7Z0JBQ3ZELFdBQVcsRUFBRSxDQUFDO2dCQUNkLGNBQWMsRUFBRSxDQUFDO2dCQUNqQixnQkFBZ0IsRUFBRSxjQUFLLENBQUMsZUFBZSxDQUFDLFlBQVks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