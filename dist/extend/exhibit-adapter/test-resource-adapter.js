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
                articleOwnerName: testResource.originInfo.type === test_node_interface_1.TestResourceOriginType.Resource ? (0, lodash_1.first)(testResource.originInfo.name.split('/')) : ''
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
    (0, midway_1.inject)(),
    __metadata("design:type", test_node_generator_1.TestNodeGenerator)
], TestResourceAdapter.prototype, "testNodeGenerator", void 0);
TestResourceAdapter = TestResourceAdapter_1 = __decorate([
    (0, midway_1.provide)()
], TestResourceAdapter);
exports.TestResourceAdapter = TestResourceAdapter;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdC1yZXNvdXJjZS1hZGFwdGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2V4dGVuZC9leGhpYml0LWFkYXB0ZXIvdGVzdC1yZXNvdXJjZS1hZGFwdGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7QUFNQSx1REFBaUQ7QUFDakQscUNBQTJDO0FBQzNDLG1DQUE2QjtBQUM3QixtRUFNbUM7QUFDbkMsbUNBQXVDO0FBQ3ZDLGdFQUF5RDtBQUd6RCxJQUFhLG1CQUFtQiwyQkFBaEMsTUFBYSxtQkFBbUI7SUFHNUIsaUJBQWlCLENBQW9CO0lBRXJDOzs7O09BSUc7SUFDSCw2QkFBNkIsQ0FBQyxZQUE4QixFQUFFLG9CQUEyQztRQUVyRyxNQUFNLFdBQVcsR0FBZ0I7WUFDN0IsU0FBUyxFQUFFLFlBQVksQ0FBQyxjQUFjO1lBQ3RDLFdBQVcsRUFBRSxZQUFZLENBQUMsZ0JBQWdCO1lBQzFDLFlBQVksRUFBRSxZQUFZLENBQUMsZ0JBQWdCO1lBQzNDLGtCQUFrQixFQUFFLGtDQUFlLENBQUMsV0FBVztZQUMvQyxJQUFJLEVBQUUsWUFBWSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsSUFBSTtZQUN6QyxXQUFXLEVBQUUsWUFBWSxDQUFDLFVBQVUsQ0FBQyxXQUFXO1lBQ2hELE9BQU8sRUFBRSxZQUFZLENBQUMsVUFBVSxDQUFDLE9BQU87WUFDeEMsUUFBUSxFQUFFLEVBQUU7WUFDWixZQUFZLEVBQUUsWUFBWSxDQUFDLFNBQVMsQ0FBQyxnQkFBZ0IsRUFBRSxZQUFZLElBQUksQ0FBQztZQUN4RSxNQUFNLEVBQUUsWUFBWSxDQUFDLE1BQU07WUFDM0IsTUFBTSxFQUFFLFlBQVksQ0FBQyxNQUFNO1lBQzNCLFdBQVcsRUFBRTtnQkFDVCxTQUFTLEVBQUUsWUFBWSxDQUFDLFVBQVUsQ0FBQyxFQUFFO2dCQUNyQyxXQUFXLEVBQUUsWUFBWSxDQUFDLFVBQVUsQ0FBQyxJQUFJO2dCQUN6QyxZQUFZLEVB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