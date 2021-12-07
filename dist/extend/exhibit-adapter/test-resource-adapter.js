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
            status: 0,
            createDate: testResource.createDate,
            updateDate: testResource.updateDate
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