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
var TestResourceAdapter_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestResourceAdapter = void 0;
const egg_freelog_base_1 = require("egg-freelog-base");
const enum_1 = require("../../enum");
const lodash_1 = require("lodash");
const test_node_interface_1 = require("../../test-node-interface");
const midway_1 = require("midway");
const test_node_generator_1 = require("../test-node-generator");
let TestResourceAdapter = TestResourceAdapter_1 = class TestResourceAdapter {
    testNodeGenerator;
    /**
     * 测试资源适配成展品
     * @param testResource
     * @param testResourceTreeInfo
     */
    testResourceWrapToExhibitInfo(testResource, testResourceTreeInfo) {
        const exhibitInfo = {
            exhibitId: testResource.testResourceId,
            exhibitName: testResource.testResourceName,
            exhibitTitle: testResource.testResourceName,
            exhibitSubjectType: egg_freelog_base_1.SubjectTypeEnum.Presentable,
            tags: testResource.stateInfo.tagInfo.tags,
            coverImages: testResource.originInfo.coverImages,
            version: testResource.originInfo.version,
            policies: [],
            onlineStatus: testResource.stateInfo.onlineStatusInfo?.onlineStatus ?? 1,
            nodeId: testResource.nodeId,
            userId: testResource.userId,
            articleInfo: {
                articleId: testResource.originInfo.id,
                articleName: testResource.originInfo.name,
                resourceType: testResource.originInfo.resourceType,
                articleType: testResource.originInfo.type === test_node_interface_1.TestResourceOriginType.Resource ? enum_1.ArticleTypeEnum.IndividualResource : enum_1.ArticleTypeEnum.StorageObject,
                articleOwnerId: 0,
                articleOwnerName: testResource.originInfo.type === test_node_interface_1.TestResourceOriginType.Resource ? lodash_1.first(testResource.originInfo.name.split('/')) : ''
            },
            status: 0
        };
        if (testResourceTreeInfo) {
            exhibitInfo.versionInfo = this.testResourceTreeInfoWrapToExhibitVersionInfo(testResource, testResourceTreeInfo);
        }
        return exhibitInfo;
    }
    /**
     * 测试资源版本信息生成
     * @param testResource
     * @param testResourceTreeInfo
     * @private
     */
    testResourceTreeInfoWrapToExhibitVersionInfo(testResource, testResourceTreeInfo) {
        return {
            exhibitId: testResource.testResourceId,
            version: testResource.originInfo.version,
            articleId: testResource.originInfo.id,
            exhibitProperty: this.testNodeGenerator._calculateTestResourceProperty(testResource),
            authTree: TestResourceAdapter_1.testResourceAuthTreeWrapToExhibitDependencyNodeInfo(testResourceTreeInfo.authTree),
            dependencyTree: TestResourceAdapter_1.testResourceDependencyTreeWrapToExhibitDependencyNodeInfo(testResourceTreeInfo.dependencyTree)
        };
    }
    /**
     * 测试资源依赖树适配为exhibit依赖树
     * @param testResourceDependencyTree
     */
    static testResourceDependencyTreeWrapToExhibitDependencyNodeInfo(testResourceDependencyTree) {
        return testResourceDependencyTree?.map(item => {
            return {
                nid: item.nid ?? '',
                articleId: item.id,
                articleName: item.name,
                articleType: item.type === test_node_interface_1.TestResourceOriginType.Resource ? enum_1.ArticleTypeEnum.IndividualResource : enum_1.ArticleTypeEnum.StorageObject,
                version: item.version,
                versionRange: '',
                resourceType: item.resourceType,
                versionId: item.versionId,
                deep: item.deep,
                parentNid: item.parentNid
            };
        });
    }
    /**
     * 测试资源授权树适配为exhibit授权树
     * @param testResourceAuthTree
     */
    static testResourceAuthTreeWrapToExhibitDependencyNodeInfo(testResourceAuthTree) {
        return testResourceAuthTree?.map(item => {
            return {
                nid: item.nid,
                articleId: item.id,
                articleName: item.name,
                articleType: item.type === test_node_interface_1.TestResourceOriginType.Resource ? enum_1.ArticleTypeEnum.IndividualResource : enum_1.ArticleTypeEnum.StorageObject,
                resourceType: '',
                version: item.version,
                versionId: item.versionId,
                deep: item.deep,
                parentNid: item.parentNid
            };
        });
    }
};
__decorate([
    midway_1.inject(),
    __metadata("design:type", test_node_generator_1.TestNodeGenerator)
], TestResourceAdapter.prototype, "testNodeGenerator", void 0);
TestResourceAdapter = TestResourceAdapter_1 = __decorate([
    midway_1.provide()
], TestResourceAdapter);
exports.TestResourceAdapter = TestResourceAdapter;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdC1yZXNvdXJjZS1hZGFwdGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2V4dGVuZC9leGhpYml0LWFkYXB0ZXIvdGVzdC1yZXNvdXJjZS1hZGFwdGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7QUFNQSx1REFBaUQ7QUFDakQscUNBQTJDO0FBQzNDLG1DQUE2QjtBQUM3QixtRUFNbUM7QUFDbkMsbUNBQXVDO0FBQ3ZDLGdFQUF5RDtBQUd6RCxJQUFhLG1CQUFtQiwyQkFBaEMsTUFBYSxtQkFBbUI7SUFHNUIsaUJBQWlCLENBQW9CO0lBRXJDOzs7O09BSUc7SUFDSCw2QkFBNkIsQ0FBQyxZQUE4QixFQUFFLG9CQUEyQztRQUVyRyxNQUFNLFdBQVcsR0FBZ0I7WUFDN0IsU0FBUyxFQUFFLFlBQVksQ0FBQyxjQUFjO1lBQ3RDLFdBQVcsRUFBRSxZQUFZLENBQUMsZ0JBQWdCO1lBQzFDLFlBQVksRUFBRSxZQUFZLENBQUMsZ0JBQWdCO1lBQzNDLGtCQUFrQixFQUFFLGtDQUFlLENBQUMsV0FBVztZQUMvQyxJQUFJLEVBQUUsWUFBWSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsSUFBSTtZQUN6QyxXQUFXLEVBQUUsWUFBWSxDQUFDLFVBQVUsQ0FBQyxXQUFXO1lBQ2hELE9BQU8sRUFBRSxZQUFZLENBQUMsVUFBVSxDQUFDLE9BQU87WUFDeEMsUUFBUSxFQUFFLEVBQUU7WUFDWixZQUFZLEVBQUUsWUFBWSxDQUFDLFNBQVMsQ0FBQyxnQkFBZ0IsRUFBRSxZQUFZLElBQUksQ0FBQztZQUN4RSxNQUFNLEVBQUUsWUFBWSxDQUFDLE1BQU07WUFDM0IsTUFBTSxFQUFFLFlBQVksQ0FBQyxNQUFNO1lBQzNCLFdBQVcsRUFBRTtnQkFDVCxTQUFTLEVBQUUsWUFBWSxDQUFDLFVBQVUsQ0FBQyxFQUFFO2dCQUNyQyxXQUFXLEVBQUUsWUFBWSxDQUFDLFVBQVUsQ0FBQyxJQUFJO2dCQUN6QyxZQUFZLEVB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