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
exports.MatchTestRuleEventHandler = void 0;
const midway_1 = require("midway");
const test_node_interface_1 = require("../test-node-interface");
const lodash_1 = require("lodash");
const enum_1 = require("../enum");
let MatchTestRuleEventHandler = class MatchTestRuleEventHandler {
    /**
     * 开始规则测试匹配事件
     * @param nodeTestRuleInfo
     */
    async handle(nodeId) {
        const operatedPresentableIds = [];
        let allTestRuleMatchResults = [];
        const nodeTestRuleInfo = await this.nodeTestRuleProvider.findOne({ nodeId });
        if (!nodeTestRuleInfo || nodeTestRuleInfo.status !== enum_1.NodeTestRuleMatchStatus.Pending) {
            return;
        }
        try {
            const task1 = this.nodeTestResourceProvider.deleteMany({ nodeId: nodeTestRuleInfo.nodeId });
            const task2 = this.nodeTestResourceTreeProvider.deleteMany({ nodeId: nodeTestRuleInfo.nodeId });
            await Promise.all([task1, task2]);
            // 按批次(每50条)匹配规则对应的测试资源,处理完尽早释放掉占用的内存
            for (const testRules of lodash_1.chunk(nodeTestRuleInfo.testRules.map(x => x.ruleInfo), 50)) {
                await this.matchAndSaveTestResourceInfos(testRules, nodeId, nodeTestRuleInfo.userId).then(testRuleMatchResults => {
                    allTestRuleMatchResults = [...allTestRuleMatchResults, ...testRuleMatchResults];
                });
            }
            for (const matchResult of allTestRuleMatchResults) {
                const testRuleInfo = nodeTestRuleInfo.testRules.find(x => x.id === matchResult.ruleId) ?? {};
                if (!matchResult.isValid) {
                    testRuleInfo.matchErrors = matchResult.matchErrors;
                }
                else {
                    testRuleInfo.efficientInfos = matchResult.efficientInfos;
                }
                if (matchResult.associatedPresentableId) {
                    operatedPresentableIds.push(matchResult.associatedPresentableId);
                }
            }
            await this.saveUnOperantPresentableToTestResources(nodeId, nodeTestRuleInfo.userId, operatedPresentableIds);
            await this.nodeTestRuleProvider.updateOne({ nodeId }, {
                status: enum_1.NodeTestRuleMatchStatus.Completed, testRules: nodeTestRuleInfo.testRules
            });
        }
        catch (e) {
            console.log(e);
            await this.nodeTestRuleProvider.updateOne({ nodeId }, { status: enum_1.NodeTestRuleMatchStatus.Failed });
        }
    }
    /**
     * 匹配测试资源
     * @param ruleInfos
     * @param nodeId
     * @param userId
     */
    async matchAndSaveTestResourceInfos(ruleInfos, nodeId, userId) {
        if (lodash_1.isEmpty(ruleInfos)) {
            return;
        }
        const testRuleMatchInfos = await this.testRuleHandler.main(nodeId, ruleInfos);
        const matchedNodeTestResources = testRuleMatchInfos.filter(x => x.isValid && [test_node_interface_1.TestNodeOperationEnum.Alter, test_node_interface_1.TestNodeOperationEnum.Add].includes(x.ruleInfo.operation))
            .map(testRuleMatchInfo => this.testRuleMatchInfoMapToTestResource(testRuleMatchInfo, nodeId, userId));
        const resourceMap = new Map();
        const existingTestResourceMap = new Map();
        const allResourceIds = lodash_1.chain(matchedNodeTestResources).map(x => x.dependencyTree).flatten().filter(x => x.type === test_node_interface_1.TestResourceOriginType.Resource).map(x => x.id).value();
        for (const resourceIds of lodash_1.chunk(allResourceIds, 200)) {
            await this.outsideApiService.getResourceListByIds(resourceIds, { projection: "resourceId,baseUpcastResources,userId" }).then(list => {
                list.forEach(resource => resourceMap.set(resource.resourceId, resource));
            });
        }
        const testResourceTreeInfos = [];
        for (const testResource of matchedNodeTestResources) {
            const testRuleMatchInfo = testRuleMatchInfos.find(x => x.id === testResource.ruleId);
            const resolveResources = existingTestResourceMap.get(testResource.testResourceId)?.resolveResources;
            testResource.authTree = this.testNodeGenerator.generateTestResourceAuthTree(testResource.dependencyTree, resourceMap);
            testResource.resolveResources = this.getTestResourceResolveResources(testResource.authTree, userId, resolveResources, testRuleMatchInfo.presentableInfo);
            testResourceTreeInfos.push({
                nodeId,
                testResourceId: testResource.testResourceId,
                testResourceName: testResource.testResourceName,
                authTree: testResource.authTree,
                dependencyTree: testResource.dependencyTree
            });
        }
        await this.nodeTestResourceProvider.insertMany(matchedNodeTestResources);
        await this.nodeTestResourceTreeProvider.insertMany(testResourceTreeInfos);
        return testRuleMatchInfos.map(x => {
            return {
                ruleId: x.id,
                isValid: x.isValid,
                matchErrors: x.matchErrors,
                efficientInfos: x.efficientInfos,
                associatedPresentableId: x.presentableInfo?.presentableId
            };
        });
    }
    /**
     * 导入展品到测试资源库(排除掉已经操作过的),目前不导入依赖树授权树信息
     * @param nodeId
     * @param userId
     * @param excludedPresentableIds
     */
    async saveUnOperantPresentableToTestResources(nodeId, userId, excludedPresentableIds) {
        let page = 1;
        const pageSize = 1;
        const condition = { nodeId };
        if (!lodash_1.isEmpty(excludedPresentableIds)) {
            condition['_id'] = { $nin: excludedPresentableIds };
        }
        const projection = ['presentableId', 'tag', 'onlineStatus', 'coverImages', 'presentableName', 'resourceInfo', 'version', 'resolveResources'];
        while (true) {
            const pageResult = await this.presentableService.findPageList(condition, page++, pageSize, projection, { createDate: -1 });
            if (lodash_1.isEmpty(pageResult.dataList)) {
                break;
            }
            const resourceMap = await this.outsideApiService.getResourceListByIds(pageResult.dataList.map(x => x.resourceInfo.resourceId), { projection: 'resourceId,resourceVersions' }).then(list => {
                return new Map(list.map(x => [x.resourceId, x]));
            });
            const testResources = pageResult.dataList.map(x => this.presentableInfoMapToTestResource(x, resourceMap.get(x.resourceInfo.resourceId), nodeId, userId));
            await this.nodeTestResourceProvider.insertMany(testResources);
        }
    }
    /**
     * 规则匹配结果转换为测试资源实体
     * @param testRuleMatchInfo
     * @param nodeId
     * @param userId
     */
    testRuleMatchInfoMapToTestResource(testRuleMatchInfo, nodeId, userId) {
        const { id, testResourceOriginInfo, ruleInfo, onlineStatus, tags, entityDependencyTree } = testRuleMatchInfo;
        const testResourceInfo = {
            nodeId, ruleId: id, userId,
            associatedPresentableId: testRuleMatchInfo.presentableInfo?.presentableId ?? '',
            resourceType: testResourceOriginInfo.resourceType,
            testResourceId: this.testNodeGenerator.generateTestResourceId(nodeId, testResourceOriginInfo),
            testResourceName: ruleInfo.presentableName,
            coverImages: testRuleMatchInfo.presentableInfo?.coverImages ?? testResourceOriginInfo.coverImages ?? [],
            originInfo: testResourceOriginInfo,
            stateInfo: {
                onlineStatusInfo: {
                    isOnline: onlineStatus?.status ?? 0,
                    ruleId: onlineStatus?.source ?? 'default'
                },
                tagsInfo: {
                    tags: tags?.tags ?? [],
                    ruleId: tags?.source ?? 'default'
                }
            }
        };
        testResourceInfo.dependencyTree = this.flattenDependencyTree(testResourceInfo.testResourceId, testRuleMatchInfo.entityDependencyTree);
        testResourceInfo.resolveResources = testResourceInfo.dependencyTree.filter(x => x.userId !== userId && x.deep === 1 && x.type === test_node_interface_1.TestResourceOriginType.Resource).map(x => {
            return {
                resourceId: x.id,
                resourceName: x.name,
                contracts: []
            };
        });
        // 如果根级资源的版本被替换掉了,则整个测试资源的版本重置为被替换之后的版本
        if (testResourceOriginInfo.type === test_node_interface_1.TestResourceOriginType.Resource && !lodash_1.isEmpty(entityDependencyTree)) {
            testResourceInfo.originInfo.version = lodash_1.first(entityDependencyTree).version;
        }
        return testResourceInfo;
    }
    /**
     * 展品信息转换为测试资源实体
     * @param presentableInfo
     * @param resourceInfo
     * @param nodeId
     */
    presentableInfoMapToTestResource(presentableInfo, resourceInfo, nodeId, userId) {
        const testResourceOriginInfo = {
            id: presentableInfo.resourceInfo.resourceId,
            name: presentableInfo.resourceInfo.resourceName,
            type: test_node_interface_1.TestResourceOriginType.Resource,
            resourceType: presentableInfo.resourceInfo.resourceType,
            version: presentableInfo.version,
            versions: resourceInfo ? resourceInfo.resourceVersions.map(x => x.version) : [],
            coverImages: resourceInfo.coverImages ?? []
        };
        const testResourceInfo = {
            nodeId, userId,
            associatedPresentableId: presentableInfo.presentableId,
            resourceType: presentableInfo.resourceInfo.resourceType,
            testResourceId: this.testNodeGenerator.generateTestResourceId(nodeId, testResourceOriginInfo),
            testResourceName: presentableInfo.presentableName,
            coverImages: presentableInfo.coverImages,
            originInfo: testResourceOriginInfo,
            stateInfo: {
                onlineStatusInfo: {
                    isOnline: presentableInfo.onlineStatus,
                    ruleId: 'default'
                },
                tagsInfo: {
                    tags: presentableInfo.tags,
                    ruleId: 'default'
                }
            },
            resolveResources: presentableInfo.resolveResources
        };
        return testResourceInfo;
    }
    /**
     * 平铺依赖树
     * @param testResourceId
     * @param dependencyTree
     * @param parentNid
     * @param results
     * @param deep
     * @private
     */
    flattenDependencyTree(testResourceId, dependencyTree, parentNid = '', results = [], deep = 1) {
        for (const dependencyInfo of dependencyTree) {
            const nid = this.testNodeGenerator.generateDependencyNodeId(deep === 1 ? testResourceId : null);
            const { id, name, type, version, versionId, dependencies, resourceType } = dependencyInfo;
            results.push({ nid, id, name, type, deep, version, versionId, parentNid, resourceType });
            this.flattenDependencyTree(testResourceId, dependencies ?? [], nid, results, deep + 1);
        }
        return results;
    }
    /**
     *
     * @param authTree 平铺的授权树
     * @param existingResolveResources 之前已经解决过的记录
     * @param presentableInfo 展品信息
     * @private
     */
    getTestResourceResolveResources(authTree, userId, existingResolveResources, presentableInfo) {
        // 自己的资源无需授权,自己的object也无需授权(只能测试自己的object).
        const resolveResourceMap = new Map((existingResolveResources ?? presentableInfo?.resolveResources ?? []).map(x => [x.resourceId, x.contracts]));
        return authTree.filter(x => x.deep === 1 && x.type === test_node_interface_1.TestResourceOriginType.Resource && x.userId !== userId).map(m => Object({
            resourceId: m.id,
            resourceName: m.name,
            contracts: resolveResourceMap.get(m.id) ?? []
        }));
    }
};
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], MatchTestRuleEventHandler.prototype, "testRuleHandler", void 0);
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], MatchTestRuleEventHandler.prototype, "testNodeGenerator", void 0);
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], MatchTestRuleEventHandler.prototype, "nodeTestRuleProvider", void 0);
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], MatchTestRuleEventHandler.prototype, "nodeTestResourceProvider", void 0);
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], MatchTestRuleEventHandler.prototype, "nodeTestResourceTreeProvider", void 0);
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], MatchTestRuleEventHandler.prototype, "presentableService", void 0);
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], MatchTestRuleEventHandler.prototype, "outsideApiService", void 0);
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], MatchTestRuleEventHandler.prototype, "presentableVersionService", void 0);
MatchTestRuleEventHandler = __decorate([
    midway_1.provide()
], MatchTestRuleEventHandler);
exports.MatchTestRuleEventHandler = MatchTestRuleEventHandler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWF0Y2gtdGVzdC1ydWxlLWV2ZW50LWhhbmRsZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvZXZlbnQtaGFuZGxlci9tYXRjaC10ZXN0LXJ1bGUtZXZlbnQtaGFuZGxlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7QUFBQSxtQ0FBdUM7QUFDdkMsZ0VBYWdDO0FBUWhDLG1DQUFvRDtBQUNwRCxrQ0FBZ0Q7QUFHaEQsSUFBYSx5QkFBeUIsR0FBdEMsTUFBYSx5QkFBeUI7SUFtQmxDOzs7T0FHRztJQUNILEtBQUssQ0FBQyxNQUFNLENBQUMsTUFBYztRQUV2QixNQUFNLHNCQUFzQixHQUFHLEVBQUUsQ0FBQztRQUNsQyxJQUFJLHVCQUF1QixHQUEwQixFQUFFLENBQUM7UUFDeEQsTUFBTSxnQkFBZ0IsR0FBcUIsTUFBTSxJQUFJLENBQUMsb0JBQW9CLENBQUMsT0FBTyxDQUFDLEVBQUMsTUFBTSxFQUFDLENBQUMsQ0FBQztRQUM3RixJQUFJLENBQUMsZ0JBQWdCLElBQUksZ0JBQWdCLENBQUMsTUFBTSxLQUFLLDhCQUF1QixDQUFDLE9BQU8sRUFBRTtZQUNsRixPQUFPO1NBQ1Y7UUFFRCxJQUFJO1lBQ0EsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLHdCQUF3QixDQUFDLFVBQVUsQ0FBQyxFQUFDLE1BQU0sRUFBRSxnQkFBZ0IsQ0FBQyxNQUFNLEVBQUMsQ0FBQyxDQUFDO1lBQzFGLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyw0QkFBNEIsQ0FBQyxVQUFVLENBQUMsRUFBQyxNQUFNLEVBQUUsZ0JBQWdCLENBQUMsTUFBTSxFQUFDLENBQUMsQ0FBQztZQUM5RixNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQztZQUVsQyxxQ0FBcUM7WUFDckMsS0FBSyxNQUFNLFNBQVMsSUFBSSxjQUFLLENBQUMsZ0JBQWdCLENBQUMsU0FBUyxDQUFDLEdBQUcs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