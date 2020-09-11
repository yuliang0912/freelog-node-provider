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
exports.TestNodeService = void 0;
const lodash_1 = require("lodash");
const midway_1 = require("midway");
// import {ApplicationError} from 'egg-freelog-base';
const test_node_interface_1 = require("../../test-node-interface");
const crypto_helper_1 = require("egg-freelog-base/app/extend/helper/crypto_helper");
let TestNodeService = class TestNodeService {
    /**
     * 匹配规则并且保存结果
     * @param nodeId
     * @param testRuleText
     */
    async matchAndSaveNodeTestRule(nodeId, testRuleText) {
        const testRuleMatchInfos = await this._compileAndMatchTestRule(nodeId, testRuleText);
        const matchedNodeTestResources = testRuleMatchInfos.filter(x => x.isValid && ['alter', 'add'].includes(x.ruleInfo.operation))
            .map(testRuleMatchInfo => this._testRuleMatchInfoMapToTestResource(testRuleMatchInfo, nodeId));
        const unOperantNodeTestResources = await this.getUnOperantPresentables(nodeId, testRuleMatchInfos);
        return [...matchedNodeTestResources, ...unOperantNodeTestResources];
    }
    /**
     * 获取未操作的展品
     * @param nodeId
     * @param testRuleMatchInfos
     */
    async getUnOperantPresentables(nodeId, testRuleMatchInfos) {
        const existingPresentableIds = testRuleMatchInfos.filter(x => x.isValid && x.ruleInfo.operation == test_node_interface_1.TestNodeOperationEnum.Alter && x.presentableInfo).map(x => x.presentableInfo.presentableId);
        const unOperantPresentables = await this.presentableService.find({ nodeId, _id: { $nin: existingPresentableIds } });
        const resourceMap = await this.outsideApiService.getResourceListByIds(unOperantPresentables.map(x => x.resourceInfo.resourceId), { projection: 'resourceId,coverImages,resourceVersions,intro' }).then(list => {
            return new Map(list.map(x => [x.resourceId, x]));
        });
        return unOperantPresentables.map(presentable => this._presentableInfoMapToTestResource(presentable, resourceMap.get(presentable.resourceInfo.resourceId), nodeId));
    }
    /**
     * 规则匹配结果转换为测试资源实体
     * @param testRuleMatchInfo
     * @param nodeId
     */
    _testRuleMatchInfoMapToTestResource(testRuleMatchInfo, nodeId) {
        const { id, testResourceOriginInfo, ruleInfo, onlineStatus, tags, entityDependencyTree } = testRuleMatchInfo;
        const testResourceInfo = {
            nodeId,
            ruleId: id,
            userId: this.ctx.userId,
            intro: testResourceOriginInfo.intro ?? '',
            associatedPresentableId: testRuleMatchInfo.presentableInfo?.presentableId ?? '',
            resourceType: testResourceOriginInfo.resourceType,
            testResourceId: this._generateTestResourceId(nodeId, testResourceOriginInfo),
            testResourceName: ruleInfo.presentableName,
            coverImages: testResourceOriginInfo.coverImages ?? [],
            originInfo: testResourceOriginInfo,
            differenceInfo: {
                onlineStatusInfo: {
                    isOnline: onlineStatus?.status ?? 0,
                    ruleId: onlineStatus?.source ?? 'default'
                },
                userDefinedTagInfo: {
                    tags: tags?.tags ?? [],
                    ruleId: tags?.source ?? 'default'
                }
            }
        };
        // 如果根级资源的版本被替换掉了,则整个测试资源的版本重置为被替换之后的版本
        if (testResourceOriginInfo.type === test_node_interface_1.TestResourceOriginType.Resource && !lodash_1.isEmpty(entityDependencyTree)) {
            testResourceInfo.originInfo.version = lodash_1.first(entityDependencyTree).version;
        }
        return testResourceInfo;
    }
    /**
     * presentable转换为测试资源实体
     * @param presentableInfo
     * @param resourceInfo
     * @param nodeId
     */
    _presentableInfoMapToTestResource(presentableInfo, resourceInfo, nodeId) {
        const testResourceOriginInfo = {
            id: presentableInfo.resourceInfo.resourceId,
            name: presentableInfo.resourceInfo.resourceName,
            type: test_node_interface_1.TestResourceOriginType.Resource,
            resourceType: presentableInfo.resourceInfo.resourceType,
            version: presentableInfo.version,
            versions: resourceInfo ? resourceInfo.resourceVersions.map(x => x.version) : [],
            coverImages: resourceInfo.coverImages ?? [],
        };
        const testResourceInfo = {
            nodeId,
            userId: this.ctx.userId,
            intro: resourceInfo.intro ?? '',
            associatedPresentableId: presentableInfo.presentableId,
            resourceType: presentableInfo.resourceInfo.resourceType,
            testResourceId: this._generateTestResourceId(nodeId, testResourceOriginInfo),
            testResourceName: presentableInfo.presentableName,
            coverImages: testResourceOriginInfo.coverImages,
            originInfo: testResourceOriginInfo,
            differenceInfo: {
                onlineStatusInfo: {
                    isOnline: presentableInfo.onlineStatus,
                    ruleId: 'default'
                },
                userDefinedTagInfo: {
                    tags: presentableInfo.tags,
                    ruleId: 'default'
                }
            }
        };
        return testResourceInfo;
    }
    async _compileAndMatchTestRule(nodeId, testRuleText) {
        // const {errors, rules} = this.testRuleHandler.compileTestRule(testRuleText);
        // if (!isEmpty(errors)) {
        //     throw new ApplicationError(this.ctx.gettext('node-test-rule-compile-failed'), {errors})
        // }
        // if (!isEmpty(rules)) {
        //     return [];
        // }
        const ruleInfos = [];
        ruleInfos.push({
            text: "alter hello  do \\n set_tags tag1,tag2\\n   show\\nend",
            tags: ["tag1", "tag2"],
            replaces: [],
            online: true,
            operation: test_node_interface_1.TestNodeOperationEnum.Alter,
            presentableName: "hello"
        });
        ruleInfos.push({
            text: "add  $yuliang/my-first-resource3@^1.0.0   as import_test_resource \\ndo\\nend",
            tags: ["tag1", "tag2"],
            replaces: [],
            online: null,
            operation: test_node_interface_1.TestNodeOperationEnum.Add,
            presentableName: 'import_test_resource',
            candidate: {
                name: "yuliang/my-first-resource3",
                versionRange: "^1.0.0",
                type: test_node_interface_1.TestResourceOriginType.Resource
            }
        });
        ruleInfos.push({
            text: "add   #yuliang/2a  as object_1 \\ndo  \\n  set_tags reset  \\n  replace #yuliang/readme2 with #yuliang/readme3  \\n   hide \\nend",
            tags: ["tag1", "tag2"],
            replaces: [
                {
                    replaced: {
                        name: "yuliang/my-resource-1",
                        type: test_node_interface_1.TestResourceOriginType.Resource
                    },
                    replacer: {
                        name: "yuliang/my-first-resource4",
                        type: test_node_interface_1.TestResourceOriginType.Resource
                    },
                    scopes: []
                }
            ],
            online: null,
            operation: test_node_interface_1.TestNodeOperationEnum.Add,
            presentableName: "object_1",
            candidate: {
                name: "yuliang/2a",
                type: test_node_interface_1.TestResourceOriginType.Object
            }
        });
        return this.testRuleHandler.main(nodeId, ruleInfos.reverse());
    }
    async _generateTestResourceAuthTree(dependencyTree) {
        //1200
    }
    /**
     * 生成测试资源ID
     * @param nodeId
     * @param originInfo
     * @private
     */
    _generateTestResourceId(nodeId, originInfo) {
        return crypto_helper_1.md5(`${nodeId}-${originInfo.id}-${originInfo.type}`);
    }
};
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], TestNodeService.prototype, "ctx", void 0);
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], TestNodeService.prototype, "nodeProvider", void 0);
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], TestNodeService.prototype, "testRuleHandler", void 0);
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], TestNodeService.prototype, "presentableService", void 0);
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], TestNodeService.prototype, "outsideApiService", void 0);
TestNodeService = __decorate([
    midway_1.provide()
], TestNodeService);
exports.TestNodeService = TestNodeService;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdC1ub2RlLXNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvYXBwL3NlcnZpY2UvdGVzdC1ub2RlLXNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0FBQUEsbUNBQXNDO0FBQ3RDLG1DQUF1QztBQUN2QyxxREFBcUQ7QUFDckQsbUVBSW1DO0FBQ25DLG9GQUFxRTtBQUlyRSxJQUFhLGVBQWUsR0FBNUIsTUFBYSxlQUFlO0lBYXhCOzs7O09BSUc7SUFDSCxLQUFLLENBQUMsd0JBQXdCLENBQUMsTUFBYyxFQUFFLFlBQW9CO1FBRS9ELE1BQU0sa0JBQWtCLEdBQUcsTUFBTSxJQUFJLENBQUMsd0JBQXdCLENBQUMsTUFBTSxFQUFFLFlBQVksQ0FBQyxDQUFDO1FBRXJGLE1BQU0sd0JBQXdCLEdBQUcsa0JBQWtCLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLE9BQU8sRUFBRSxLQUFLLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsQ0FBQzthQUN4SCxHQUFHLENBQUMsaUJBQWlCLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxtQ0FBbUMsQ0FBQyxpQkFBaUIsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDO1FBQ25HLE1BQU0sMEJBQTBCLEdBQUcsTUFBTSxJQUFJLENBQUMsd0JBQXdCLENBQUMsTUFBTSxFQUFFLGtCQUFrQixDQUFDLENBQUM7UUFFbkcsT0FBTyxDQUFDLEdBQUcsd0JBQXdCLEVBQUUsR0FBRywwQkFBMEIsQ0FBQyxDQUFDO0lBQ3hFLENBQUM7SUFFRDs7OztPQUlHO0lBQ0gsS0FBSyxDQUFDLHdCQUF3QixDQUFDLE1BQWMsRUFBRSxrQkFBdUM7UUFDbEYsTUFBTSxzQkFBc0IsR0FBRyxrQkFBa0IsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxD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