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
const presentable_common_checker_1 = require("../extend/presentable-common-checker");
const test_rule_handler_1 = require("../extend/test-rule-handler");
let MatchTestRuleEventHandler = class MatchTestRuleEventHandler {
    /**
     * 开始规则测试匹配事件
     * @param nodeId
     */
    async handle(nodeId) {
        const operatedPresentableIds = [];
        const allTestRuleMatchResults = [];
        const nodeTestRuleInfo = await this.nodeTestRuleProvider.findOne({ nodeId });
        if (!nodeTestRuleInfo || nodeTestRuleInfo.status !== enum_1.NodeTestRuleMatchStatus.Pending) {
            return;
        }
        // 如果小于1分钟,则不重新匹配
        if (new Date().getTime() - nodeTestRuleInfo.matchResultDate.getTime() < 60000) {
            return;
        }
        try {
            const task1 = this.nodeTestResourceProvider.deleteMany({ nodeId });
            const task2 = this.nodeTestResourceTreeProvider.deleteMany({ nodeId });
            await Promise.all([task1, task2]);
            // 按批次(每50条)匹配规则对应的测试资源,处理完尽早释放掉占用的内存
            for (const testRules of lodash_1.chunk(nodeTestRuleInfo.testRules.map(x => x.ruleInfo), 50)) {
                await this.matchAndSaveTestResourceInfos(testRules, nodeId, nodeTestRuleInfo.userId).then(testRuleMatchResults => {
                    allTestRuleMatchResults.push(...testRuleMatchResults);
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
            const activeThemeRule = await this.testRuleHandler.matchThemeRule(nodeId, nodeTestRuleInfo.testRules);
            if (activeThemeRule) {
                this.testNodeGenerator.generateTestResourceId(nodeId, activeThemeRule.testResourceOriginInfo);
            }
            // const activeThemeRuleInfo = nodeTestRuleInfo.testRules.find(x => x.ruleInfo.operation === TestNodeOperationEnum.ActivateTheme);
            await this.nodeTestRuleProvider.updateOne({ nodeId }, {
                status: enum_1.NodeTestRuleMatchStatus.Completed,
                testRules: nodeTestRuleInfo.testRules,
                themeId: activeThemeRule?.themeInfo?.testResourceId ?? '',
                matchResultDate: new Date()
            });
        }
        catch (e) {
            console.log('节点测试规则匹配异常', e);
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
        let skip = 0;
        const limit = 50;
        const condition = { nodeId, createDate: { $lt: new Date() } };
        if (!lodash_1.isEmpty(excludedPresentableIds)) {
            condition['_id'] = { $nin: excludedPresentableIds };
        }
        const projection = ['presentableId', 'tag', 'onlineStatus', 'coverImages', 'presentableName', 'presentableTitle', 'resourceInfo', 'version', 'resolveResources'];
        while (true) {
            const presentables = await this.presentableService.find(condition, projection.join(' '), {
                skip, limit, sort: { createDate: -1 }
            });
            if (lodash_1.isEmpty(presentables)) {
                break;
            }
            const presentableVersionIds = presentables.map(x => this.presentableCommonChecker.generatePresentableVersionId(x.presentableId, x.version));
            const presentableVersionInfos = await this.presentableVersionService.find({ presentableVersionId: { $in: presentableVersionIds } });
            const presentableVersionMap = new Map(presentableVersionInfos.map(x => [x.presentableId, x]));
            const allResourceIds = lodash_1.chain(presentableVersionInfos).map(x => x.dependencyTree).flatten().map(x => x.resourceId).uniq().value();
            const resourceMap = await this.outsideApiService.getResourceListByIds(allResourceIds, { projection: 'resourceId,userId,resourceVersions' }).then(list => {
                return new Map(list.map(x => [x.resourceId, x]));
            });
            const testResourceTreeInfos = [];
            const testResources = presentables.map(x => this.presentableInfoMapToTestResource(x, resourceMap.get(x.resourceInfo.resourceId), nodeId, userId));
            for (const testResource of testResources) {
                testResourceTreeInfos.push({
                    nodeId,
                    testResourceId: testResource.testResourceId,
                    testResourceName: testResource.testResourceName,
                    authTree: this.convertPresentableAuthTreeToTestResourceAuthTree(presentableVersionMap.get(testResource.associatedPresentableId).authTree, resourceMap),
                    dependencyTree: this.convertPresentableDependencyTreeToTestResourceDependencyTree(testResource.testResourceId, presentableVersionMap.get(testResource.associatedPresentableId).dependencyTree)
                });
            }
            await this.nodeTestResourceProvider.insertMany(testResources);
            await this.nodeTestResourceTreeProvider.insertMany(testResourceTreeInfos);
            skip += 50;
        }
    }
    /**
     * 规则匹配结果转换为测试资源实体
     * @param testRuleMatchInfo
     * @param nodeId
     * @param userId
     */
    testRuleMatchInfoMapToTestResource(testRuleMatchInfo, nodeId, userId) {
        const { id, testResourceOriginInfo, ruleInfo, onlineStatusInfo, tagInfo, titleInfo, coverInfo, attrInfo, entityDependencyTree } = testRuleMatchInfo;
        const testResourceInfo = {
            nodeId, ruleId: id, userId,
            associatedPresentableId: testRuleMatchInfo.presentableInfo?.presentableId ?? '',
            resourceType: testResourceOriginInfo.resourceType,
            testResourceId: this.testNodeGenerator.generateTestResourceId(nodeId, testResourceOriginInfo),
            testResourceName: ruleInfo.exhibitName,
            originInfo: testResourceOriginInfo,
            stateInfo: {
                onlineStatusInfo: {
                    isOnline: onlineStatusInfo?.status ?? 0,
                    ruleId: onlineStatusInfo?.source ?? 'default'
                },
                tagsInfo: {
                    tags: tagInfo?.tags ?? [],
                    ruleId: tagInfo?.source ?? 'default'
                },
                titleInfo: {
                    title: titleInfo?.title ?? testResourceOriginInfo.name,
                    ruleId: titleInfo?.source ?? 'default'
                },
                coverInfo: {
                    coverImages: coverInfo?.coverImages ?? testResourceOriginInfo.coverImages,
                    ruleId: coverInfo?.source ?? 'default'
                },
                propertyInfo: {
                    testResourceProperty: attrInfo?.attrs ?? [],
                    ruleId: attrInfo?.source ?? 'default'
                }
            }
        };
        testResourceInfo.dependencyTree = this.flattenTestResourceDependencyTree(testResourceInfo.testResourceId, testRuleMatchInfo.entityDependencyTree);
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
     * 获取测试资源的meta属性
     * @param testRuleMatchInfo
     */
    getTestResourceProperty(testRuleMatchInfo) {
        const resourceCustomReadonlyInfo = {};
        const resourceCustomEditableInfo = {};
        const presentableRewriteInfo = {};
        const testRuleRewriteInfo = {};
        testRuleMatchInfo.testResourceOriginInfo.customPropertyDescriptors?.forEach(({ key, defaultValue, type }) => {
            if (type === 'readonlyText') {
                resourceCustomReadonlyInfo[key] = defaultValue;
            }
            else {
                resourceCustomEditableInfo[key] = defaultValue;
            }
        });
        testRuleMatchInfo.presentableRewriteProperty?.forEach(({ key, value }) => {
            presentableRewriteInfo[key] = value;
        });
        testRuleMatchInfo.ruleInfo.attrs?.forEach(({ key, operation, value }) => {
            if (operation === 'add') {
                testRuleRewriteInfo[key] = value;
            }
        });
        // 属性优先级为: 1.系统属性 2:资源定义的不可编辑的属性 3:展品重写的属性 4:资源自定义的可编辑属性
        const testResourceProperty = lodash_1.assign(resourceCustomEditableInfo, presentableRewriteInfo, resourceCustomReadonlyInfo, testRuleMatchInfo.testResourceOriginInfo.systemProperty);
        const omitKeys = testRuleMatchInfo.ruleInfo.attrs?.filter(x => x.operation === 'delete').map(x => x.key);
        return lodash_1.omit(testResourceProperty, omitKeys);
    }
    /**
     * 展品信息转换为测试资源实体
     * @param presentableInfo
     * @param resourceInfo
     * @param nodeId
     * @param userId
     */
    presentableInfoMapToTestResource(presentableInfo, resourceInfo, nodeId, userId) {
        const testResourceOriginInfo = {
            id: presentableInfo.resourceInfo.resourceId,
            name: presentableInfo.resourceInfo.resourceName,
            type: test_node_interface_1.TestResourceOriginType.Resource,
            resourceType: presentableInfo.resourceInfo.resourceType,
            version: presentableInfo.version,
            versions: resourceInfo ? resourceInfo.resourceVersions.map(x => x.version) : [],
            coverImages: resourceInfo?.coverImages ?? []
        };
        return {
            nodeId, userId,
            associatedPresentableId: presentableInfo.presentableId,
            resourceType: presentableInfo.resourceInfo.resourceType,
            testResourceId: this.testNodeGenerator.generateTestResourceId(nodeId, testResourceOriginInfo),
            testResourceName: presentableInfo.presentableName,
            originInfo: testResourceOriginInfo,
            stateInfo: {
                onlineStatusInfo: {
                    isOnline: presentableInfo.onlineStatus,
                    ruleId: 'default'
                },
                tagsInfo: {
                    tags: presentableInfo.tags,
                    ruleId: 'default'
                },
                coverInfo: {
                    coverImages: presentableInfo.coverImages,
                    ruleId: 'default'
                },
                titleInfo: {
                    title: presentableInfo.presentableTitle,
                    ruleId: 'default'
                },
                propertyInfo: {
                    testResourceProperty: [],
                    ruleId: 'default'
                }
            },
            resolveResources: presentableInfo.resolveResources
        };
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
    flattenTestResourceDependencyTree(testResourceId, dependencyTree, parentNid = '', results = [], deep = 1) {
        for (const dependencyInfo of dependencyTree) {
            const nid = this.testNodeGenerator.generateDependencyNodeId(deep === 1 ? testResourceId : null);
            const { id, fileSha1, name, type, version, versionId, dependencies, resourceType, replaced } = dependencyInfo;
            results.push({ fileSha1, nid, id, name, type, deep, version, versionId, parentNid, resourceType, replaced });
            this.flattenTestResourceDependencyTree(testResourceId, dependencies ?? [], nid, results, deep + 1);
        }
        return results;
    }
    /**
     * 展品依赖树转换成测试资源依赖树
     * @param testResourceId
     * @param flattenTestResourceDependencyTree
     */
    convertPresentableDependencyTreeToTestResourceDependencyTree(testResourceId, flattenTestResourceDependencyTree) {
        const nid = this.testNodeGenerator.generateDependencyNodeId(testResourceId);
        for (const dependencyInfo of flattenTestResourceDependencyTree) {
            if (dependencyInfo.deep === 2) {
                dependencyInfo.parentNid = nid;
            }
        }
        flattenTestResourceDependencyTree.find(x => x.deep === 1).nid = nid;
        return flattenTestResourceDependencyTree.map(item => {
            return {
                nid: item.nid,
                id: item.resourceId,
                name: item.resourceName,
                type: test_node_interface_1.TestResourceOriginType.Resource,
                resourceType: item.resourceType,
                version: item.version,
                versionId: item.versionId,
                fileSha1: item.fileSha1,
                parentNid: item.parentNid,
                deep: item.deep
            };
        });
    }
    /**
     * 展品授权树转换为测试资源授权树
     * @param flattenAuthTree
     * @param resourceMap
     */
    convertPresentableAuthTreeToTestResourceAuthTree(flattenAuthTree, resourceMap) {
        return flattenAuthTree.map(item => {
            return {
                nid: item.nid,
                id: item.resourceId,
                name: item.resourceName,
                type: test_node_interface_1.TestResourceOriginType.Resource,
                version: item.version,
                versionId: item.versionId,
                deep: item.deep,
                parentNid: item.parentNid,
                userId: resourceMap.get(item.resourceId)?.userId
            };
        });
    }
    /**
     * 平铺的授权树
     * @param authTree
     * @param userId
     * @param existingResolveResources
     * @param presentableInfo
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
    __metadata("design:type", test_rule_handler_1.TestRuleHandler)
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
], MatchTestRuleEventHandler.prototype, "nodeProvider", void 0);
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
__decorate([
    midway_1.inject(),
    __metadata("design:type", presentable_common_checker_1.PresentableCommonChecker)
], MatchTestRuleEventHandler.prototype, "presentableCommonChecker", void 0);
MatchTestRuleEventHandler = __decorate([
    midway_1.provide()
], MatchTestRuleEventHandler);
exports.MatchTestRuleEventHandler = MatchTestRuleEventHandler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWF0Y2gtdGVzdC1ydWxlLWV2ZW50LWhhbmRsZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvZXZlbnQtaGFuZGxlci9tYXRjaC10ZXN0LXJ1bGUtZXZlbnQtaGFuZGxlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7QUFBQSxtQ0FBdUM7QUFDdkMsZ0VBY2dDO0FBV2hDLG1DQUFrRTtBQUNsRSxrQ0FBZ0Q7QUFFaEQscUZBQThFO0FBQzlFLG1FQUE0RDtBQUc1RCxJQUFhLHlCQUF5QixHQUF0QyxNQUFhLHlCQUF5QjtJQXVCbEM7OztPQUdHO0lBQ0gsS0FBSyxDQUFDLE1BQU0sQ0FBQyxNQUFjO1FBRXZCLE1BQU0sc0JBQXNCLEdBQUcsRUFBRSxDQUFDO1FBQ2xDLE1BQU0sdUJBQXVCLEdBQTBCLEVBQUUsQ0FBQztRQUMxRCxNQUFNLGdCQUFnQixHQUFHLE1BQU0sSUFBSSxDQUFDLG9CQUFvQixDQUFDLE9BQU8sQ0FBQyxFQUFDLE1BQU0sRUFBQyxDQUFDLENBQUM7UUFDM0UsSUFBSSxDQUFDLGdCQUFnQixJQUFJLGdCQUFnQixDQUFDLE1BQU0sS0FBSyw4QkFBdUIsQ0FBQyxPQUFPLEVBQUU7WUFDbEYsT0FBTztTQUNWO1FBRUQsaUJBQWlCO1FBQ2pCLElBQUksSUFBSSxJQUFJLEVBQUUsQ0FBQyxPQUFPLEVBQUUsR0FBRyxnQkFBZ0IsQ0FBQyxlQUFlLENBQUMsT0FBTyxFQUFFLEdBQUcsS0FBSyxFQUFFO1lBQzNFLE9BQU87U0FDVjtRQUVELElBQUk7WUFDQSxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsd0JBQXdCLENBQUMsVUFBVSxDQUFDLEVBQUMsTUFBTSxFQUFDLENBQUMsQ0FBQztZQUNqRSxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsNEJBQTRCLENBQUMsVUFBVSxDQUFDLEVBQUMsTUFBTSxFQUFDLENBQUMsQ0FBQztZQUNyRSxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFL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