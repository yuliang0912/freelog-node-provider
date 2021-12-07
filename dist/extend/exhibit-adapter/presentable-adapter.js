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
            status: 0,
            createDate: presentableInfo.createDate,
            updateDate: presentableInfo.updateDate
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