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
const egg_freelog_base_1 = require("egg-freelog-base");
const presentable_common_checker_1 = require("../extend/presentable-common-checker");
const test_rule_handler_1 = require("../extend/test-rule-handler");
let MatchTestRuleEventHandler = class MatchTestRuleEventHandler {
    /**
     * 开始规则测试匹配事件
     * @param nodeId
     * @param isMandatoryMatch 是否强制匹配
     */
    async handle(nodeId, isMandatoryMatch = false) {
        const operatedPresentableIds = [];
        const allTestRuleMatchResults = [];
        const nodeTestRuleInfo = await this.nodeTestRuleProvider.findOne({ nodeId });
        if (!nodeTestRuleInfo) {
            return;
        }
        // 如果非强制化匹配的,并且上次匹配时间小于1分钟,则直接使用上次匹配结果
        if (!isMandatoryMatch && nodeTestRuleInfo.status === enum_1.NodeTestRuleMatchStatus.Completed && (new Date().getTime() - nodeTestRuleInfo.matchResultDate.getTime() < 60000)) {
            return;
        }
        try {
            const task1 = this.nodeTestResourceProvider.deleteMany({ nodeId });
            const task2 = this.nodeTestResourceTreeProvider.deleteMany({ nodeId });
            const task3 = nodeTestRuleInfo.status !== enum_1.NodeTestRuleMatchStatus.Pending ? this.nodeTestRuleProvider.updateOne({ nodeId }, { status: enum_1.NodeTestRuleMatchStatus.Pending }) : undefined;
            await Promise.all([task1, task2, task3]);
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
            const themeTestResourceInfo = await this.setThemeTestResource(nodeTestRuleInfo);
            await this.nodeTestRuleProvider.updateOne({ nodeId }, {
                status: enum_1.NodeTestRuleMatchStatus.Completed,
                testRules: nodeTestRuleInfo.testRules,
                themeId: themeTestResourceInfo?.testResourceId ?? '',
                matchResultDate: new Date()
            });
        }
        catch (e) {
            console.log('节点测试规则匹配异常', e);
            await this.nodeTestRuleProvider.updateOne({ nodeId }, {
                status: enum_1.NodeTestRuleMatchStatus.Failed, matchErrorMsg: e.toString()
            });
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
            testResource.resolveResourceSignStatus = (testResource.resolveResources.length && testResource.resolveResources.some(x => !x.contracts.length)) ? 2 : 1;
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
     * 设置主题
     * @param nodeTestRuleInfo
     */
    async setThemeTestResource(nodeTestRuleInfo) {
        const activeThemeRuleInfo = nodeTestRuleInfo.testRules.find(x => x.ruleInfo.operation === test_node_interface_1.TestNodeOperationEnum.ActivateTheme);
        let themeTestResourceInfo = await this.testRuleHandler.matchThemeRule(nodeTestRuleInfo.nodeId, activeThemeRuleInfo);
        if (!themeTestResourceInfo) {
            themeTestResourceInfo = await this.nodeTestResourceProvider.findOne(({
                nodeId: nodeTestRuleInfo.nodeId,
                resourceType: egg_freelog_base_1.ResourceTypeEnum.THEME,
                'onlineStatusInfo.onlineStatus': 1
            }));
        }
        if (!themeTestResourceInfo) {
            return;
        }
        const updateModel = {
            'stateInfo.themeInfo.isActivatedTheme': 1,
            'stateInfo.themeInfo.ruleId': activeThemeRuleInfo?.id ?? 'default'
        };
        if (activeThemeRuleInfo?.isValid) {
            updateModel['$push'] = { rules: { ruleId: activeThemeRuleInfo.id, operations: ['activateTheme'] } };
        }
        await this.nodeTestResourceProvider.updateOne({ testResourceId: themeTestResourceInfo.testResourceId }, updateModel);
        return themeTestResourceInfo;
    }
    /**
     * 规则匹配结果转换为测试资源实体
     * @param testRuleMatchInfo
     * @param nodeId
     * @param userId
     */
    testRuleMatchInfoMapToTestResource(testRuleMatchInfo, nodeId, userId) {
        const { id, testResourceOriginInfo, ruleInfo, onlineStatusInfo, tagInfo, titleInfo, coverInfo, attrInfo, entityDependencyTree, efficientInfos, replaceRecords } = testRuleMatchInfo;
        const testResourceInfo = {
            nodeId, ruleId: id, userId,
            associatedPresentableId: testRuleMatchInfo.presentableInfo?.presentableId ?? '',
            resourceType: testResourceOriginInfo.resourceType,
            testResourceId: this.testNodeGenerator.generateTestResourceId(nodeId, testResourceOriginInfo),
            testResourceName: ruleInfo.exhibitName,
            originInfo: testResourceOriginInfo,
            stateInfo: {
                onlineStatusInfo: {
                    onlineStatus: onlineStatusInfo?.status ?? 0,
                    ruleId: onlineStatusInfo?.source ?? 'default'
                },
                tagInfo: {
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
                },
                themeInfo: {
                    isActivatedTheme: 0,
                    ruleId: 'default'
                },
                replaceInfo: {
                    replaceRecords: replaceRecords ?? [],
                    ruleId: (replaceRecords ?? []).length ? id : "default"
                }
            },
            rules: [{
                    ruleId: id, operations: efficientInfos.map(x => x.type)
                }],
            resolveResourceSignStatus: 0,
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
                    onlineStatus: presentableInfo.onlineStatus,
                    ruleId: 'default'
                },
                tagInfo: {
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
                },
                themeInfo: {
                    isActivatedTheme: 0,
                    ruleId: 'default'
                },
                replaceInfo: {
                    replaceRecords: [],
                    ruleId: 'default'
                }
            },
            resolveResources: presentableInfo.resolveResources,
            resolveResourceSignStatus: presentableInfo.resolveResources.some(x => !x.contracts.length) ? 2 : 1,
            rules: []
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
            const { id, fileSha1, name, type, version, versionId, dependencies, resourceType } = dependencyInfo; // replaceRecords
            results.push({
                fileSha1, nid, id, name, type, deep, version, versionId,
                parentNid, resourceType,
            });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWF0Y2gtdGVzdC1ydWxlLWV2ZW50LWhhbmRsZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvZXZlbnQtaGFuZGxlci9tYXRjaC10ZXN0LXJ1bGUtZXZlbnQtaGFuZGxlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7QUFBQSxtQ0FBdUM7QUFDdkMsZ0VBY2dDO0FBV2hDLG1DQUFrRTtBQUNsRSxrQ0FBZ0Q7QUFDaEQsdURBQXFFO0FBQ3JFLHFGQUE4RTtBQUM5RSxtRUFBNEQ7QUFHNUQsSUFBYSx5QkFBeUIsR0FBdEMsTUFBYSx5QkFBeUI7SUF1QmxDOzs7O09BSUc7SUFDSCxLQUFLLENBQUMsTUFBTSxDQUFDLE1BQWMsRUFBRSxtQkFBNEIsS0FBSztRQUUxRCxNQUFNLHNCQUFzQixHQUFHLEVBQUUsQ0FBQztRQUNsQyxNQUFNLHVCQUF1QixHQUEwQixFQUFFLENBQUM7UUFDMUQsTUFBTSxnQkFBZ0IsR0FBRyxNQUFNLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxPQUFPLENBQUMsRUFBQyxNQUFNLEVBQUMsQ0FBQyxDQUFDO1FBQzNFLElBQUksQ0FBQyxnQkFBZ0IsRUFBRTtZQUNuQixPQUFPO1NBQ1Y7UUFDRCxzQ0FBc0M7UUFDdEMsSUFBSSxDQUFDLGdCQUFnQixJQUFJLGdCQUFnQixDQUFDLE1BQU0sS0FBSyw4QkFBdUIsQ0FBQyxTQUFTLElBQUksQ0FBQyxJQUFJLElBQUksRUFBRSxDQUFDLE9BQU8sRUFBRSxHQUFHLGdCQUFnQixDQUFDLGVBQWUsQ0FBQyxPQUFPLEVBQUUsR0FBRyxLQUFLLENBQUMsRUFBRTtZQUNuSyxPQUFPO1NBQ1Y7UUFFRCxJQUFJO1lBQ0EsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLHdCQUF3QixDQUFDLFVBQVUsQ0FBQyxFQUFDLE1BQU0sRUFBQyxDQUFDLENBQUM7WUFDakUsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLDRCQUE0QixDQUFDLFVBQVUsQ0FBQyxFQUFDLE1B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