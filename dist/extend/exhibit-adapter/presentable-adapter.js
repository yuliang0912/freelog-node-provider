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
                articleOwnerName: (0, lodash_1.first)(presentableInfo.resourceInfo.resourceName.split('/'))
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
    (0, midway_1.provide)()
], PresentableAdapter);
exports.PresentableAdapter = PresentableAdapter;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlc2VudGFibGUtYWRhcHRlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9leHRlbmQvZXhoaWJpdC1hZGFwdGVyL3ByZXNlbnRhYmxlLWFkYXB0ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7OztBQVVBLHVEQUFpRDtBQUNqRCxxQ0FBMkM7QUFDM0MsbUNBQTZCO0FBQzdCLG1DQUErQjtBQUcvQixJQUFhLGtCQUFrQiwwQkFBL0IsTUFBYSxrQkFBa0I7SUFFM0I7Ozs7T0FJRztJQUNILDRCQUE0QixDQUFDLGVBQWdDLEVBQUUsc0JBQStDO1FBRTFHLE1BQU0sV0FBVyxHQUFnQjtZQUM3QixTQUFTLEVBQUUsZUFBZSxDQUFDLGFBQWE7WUFDeEMsV0FBVyxFQUFFLGVBQWUsQ0FBQyxlQUFlO1lBQzVDLFlBQVksRUFBRSxlQUFlLENBQUMsZ0JBQWdCO1lBQzlDLGtCQUFrQixFQUFFLGtDQUFlLENBQUMsV0FBVztZQUMvQyxJQUFJLEVBQUUsZUFBZSxDQUFDLElBQUk7WUFDMUIsV0FBVyxFQUFFLGVBQWUsQ0FBQyxXQUFXO1lBQ3hDLE9BQU8sRUFBRSxlQUFlLENBQUMsT0FBTztZQUNoQyxRQUFRLEVBQUUsZUFBZSxDQUFDLFFBQVE7WUFDbEMsWUFBWSxFQUFFLGVBQWUsQ0FBQyxZQUFZO1lBQzFDLE1BQU0sRUFBRSxlQUFlLENBQUMsTUFBTTtZQUM5QixNQUFNLEVBQUUsZUFBZSxDQUFDLE1BQU07WUFDOUIsV0FBVyxFQUFFO2dCQUNULFNBQVMsRUFBRSxlQUFlLENBQUMsWUFBWSxDQUFDLFVBQVU7Z0JBQ2xELFdBQVcsRUFBRSxlQUFlLENBQUMsWUFBWSxDQUFDLFlBQVk7Z0JBQ3RELFlBQVksRUFBRSxlQUFlLENBQUMsWUFBWSxDQUFDLFlBQVk7Z0JBQ3ZELFdBQVcsRUFBRSxDQUFDO2dCQUNkLGNBQWMsRUFBRSxDQUFDO2dCQUNqQixnQkFBZ0IsRUFBRSxJQUFBLGNBQUssRUFBQyxlQUFlLENBQUMs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