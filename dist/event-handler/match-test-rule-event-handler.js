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
        const isLessThan1Minute = (new Date().getTime() - nodeTestRuleInfo?.updateDate.getTime() < 60000);
        if (!nodeTestRuleInfo || nodeTestRuleInfo.status === enum_1.NodeTestRuleMatchStatus.Pending && isLessThan1Minute) {
            return;
        }
        // 如果非强制化匹配的,并且上次匹配时间小于1分钟,则直接使用上次匹配结果
        if (!isMandatoryMatch && nodeTestRuleInfo.status === enum_1.NodeTestRuleMatchStatus.Completed && isLessThan1Minute) {
            return;
        }
        try {
            const tasks = [];
            if (nodeTestRuleInfo.status !== enum_1.NodeTestRuleMatchStatus.Pending) {
                tasks.push(this.nodeTestRuleProvider.updateOne({ nodeId }, {
                    status: enum_1.NodeTestRuleMatchStatus.Pending, matchErrorMsg: ''
                }));
            }
            tasks.push(this.nodeTestResourceProvider.deleteMany({ nodeId }));
            tasks.push(this.nodeTestResourceTreeProvider.deleteMany({ nodeId }));
            await Promise.all(tasks);
            // 按批次(每50条)匹配规则对应的测试资源,处理完尽早释放掉占用的内存
            for (const testRules of lodash_1.chunk(nodeTestRuleInfo.testRules.map(x => x.ruleInfo), 50)) {
                await this.matchAndSaveTestResourceInfos(testRules, nodeId, nodeTestRuleInfo.userId).then(testRuleMatchResults => {
                    allTestRuleMatchResults.push(...testRuleMatchResults);
                });
            }
            for (const matchResult of allTestRuleMatchResults) {
                const testRuleInfo = nodeTestRuleInfo.testRules.find(x => x.id === matchResult.ruleId) ?? {};
                testRuleInfo.matchErrors = matchResult.matchErrors;
                if (matchResult.isValid) {
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
        const matchedNodeTestResources = lodash_1.chain(testRuleMatchInfos).filter(x => x.isValid && [test_node_interface_1.TestNodeOperationEnum.Alter, test_node_interface_1.TestNodeOperationEnum.Add].includes(x.ruleInfo.operation))
            .map(testRuleMatchInfo => this.testRuleMatchInfoMapToTestResource(testRuleMatchInfo, nodeId, userId)).uniqBy(data => data.testResourceId).value();
        // const matchedNodeTestResources: TestResourceInfo[] = testRuleMatchInfos.filter(x => x.isValid && [TestNodeOperationEnum.Alter, TestNodeOperationEnum.Add].includes(x.ruleInfo.operation))
        //     .map(testRuleMatchInfo => this.testRuleMatchInfoMapToTestResource(testRuleMatchInfo, nodeId, userId));
        const resourceMap = new Map();
        const existingTestResourceMap = new Map();
        const allResourceIds = lodash_1.chain(matchedNodeTestResources).map(x => x.dependencyTree).flatten().filter(x => x.type === test_node_interface_1.TestResourceOriginType.Resource).map(x => x.id).value();
        for (const resourceIds of lodash_1.chunk(allResourceIds, 200)) {
            await this.outsideApiService.getResourceListByIds(resourceIds, { projection: 'resourceId,baseUpcastResources,userId' }).then(list => {
                list.forEach(resource => resourceMap.set(resource.resourceId, resource));
            });
        }
        const testResourceTreeInfos = [];
        for (let testResource of matchedNodeTestResources) {
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
            const testResources = presentables.map(x => this.presentableInfoMapToTestResource(x, presentableVersionMap.get(x.presentableId), resourceMap.get(x.resourceInfo.resourceId), nodeId, userId));
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
            themeTestResourceInfo = await this.nodeTestResourceProvider.findOne({
                nodeId: nodeTestRuleInfo.nodeId,
                resourceType: egg_freelog_base_1.ResourceTypeEnum.THEME,
                'stateInfo.onlineStatusInfo.onlineStatus': 1
            });
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
                    ruleId: (replaceRecords ?? []).length ? id : 'default'
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
     * @param presentableVersionInfo
     * @param resourceInfo
     * @param nodeId
     * @param userId
     */
    presentableInfoMapToTestResource(presentableInfo, presentableVersionInfo, resourceInfo, nodeId, userId) {
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
                    testResourceProperty: this.getPresentablePropertyInfo(presentableVersionInfo),
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
    /**
     * 展品版本信息
     * @param presentableVersionInfo
     */
    getPresentablePropertyInfo(presentableVersionInfo) {
        const readonlyPropertyMap = new Map();
        const editablePropertyMap = new Map();
        // 以下4个for循环需要严格遵守顺序.属性的优先级分别为1.系统属性 2:资源定义的不可编辑的属性 3:测试规则规定的属性 4:展品重写的属性 5:资源自定义的可编辑属性.
        for (const [key, value] of Object.entries(presentableVersionInfo.resourceSystemProperty ?? {})) {
            readonlyPropertyMap.set(key, { key, value, authority: 1, remark: '' });
        }
        for (const { key, defaultValue, remark, type } of presentableVersionInfo.resourceCustomPropertyDescriptors ?? []) {
            if (readonlyPropertyMap.has(key)) {
                continue;
            }
            if (type === 'readonlyText') {
                readonlyPropertyMap.set(key, { key, value: defaultValue, authority: 1, remark });
            }
            else {
                editablePropertyMap.set(key, { key, value: defaultValue, authority: 2, remark });
            }
        }
        for (const { key, value, remark } of presentableVersionInfo.presentableRewriteProperty ?? []) {
            if (readonlyPropertyMap.has(key)) {
                continue;
            }
            editablePropertyMap.set(key, { key, authority: 6, value, remark });
        }
        return [...readonlyPropertyMap.values(), ...editablePropertyMap.values()];
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWF0Y2gtdGVzdC1ydWxlLWV2ZW50LWhhbmRsZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvZXZlbnQtaGFuZGxlci9tYXRjaC10ZXN0LXJ1bGUtZXZlbnQtaGFuZGxlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7QUFBQSxtQ0FBdUM7QUFDdkMsZ0VBY2dDO0FBV2hDLG1DQUFrRTtBQUNsRSxrQ0FBZ0Q7QUFDaEQsdURBQXFFO0FBQ3JFLHFGQUE4RTtBQUM5RSxtRUFBNEQ7QUFHNUQsSUFBYSx5QkFBeUIsR0FBdEMsTUFBYSx5QkFBeUI7SUF1QmxDOzs7O09BSUc7SUFDSCxLQUFLLENBQUMsTUFBTSxDQUFDLE1BQWMsRUFBRSxtQkFBNEIsS0FBSztRQUUxRCxNQUFNLHNCQUFzQixHQUFHLEVBQUUsQ0FBQztRQUNsQyxNQUFNLHVCQUF1QixHQUEwQixFQUFFLENBQUM7UUFDMUQsTUFBTSxnQkFBZ0IsR0FBRyxNQUFNLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxPQUFPLENBQUMsRUFBQyxNQUFNLEVBQUMsQ0FBQyxDQUFDO1FBQzNFLE1BQU0saUJBQWlCLEdBQUcsQ0FBQyxJQUFJLElBQUksRUFBRSxDQUFDLE9BQU8sRUFBRSxHQUFHLGdCQUFnQixFQUFFLFVBQVUsQ0FBQyxPQUFPLEVBQUUsR0FBRyxLQUFLLENBQUMsQ0FBQztRQUNsRyxJQUFJLENBQUMsZ0JBQWdCLElBQUksZ0JBQWdCLENBQUMsTUFBTSxLQUFLLDhCQUF1QixDQUFDLE9BQU8sSUFBSSxpQkFBaUIsRUFBRTtZQUN2RyxPQUFPO1NBQ1Y7UUFDRCxzQ0FBc0M7UUFDdEMsSUFBSSxDQUFDLGdCQUFnQixJQUFJLGdCQUFnQixDQUFDLE1BQU0sS0FBSyw4QkFBdUIsQ0FBQyxTQUFTLElBQUksaUJBQWlCLEVBQUU7WUFDekcsT0FBTztTQUNWO1FBQ0QsSUFBSTtZQUNBLE1BQU0sS0FBSyxHQUFHLEVBQUUsQ0FBQztZQUNqQixJQUFJLGdCQUFn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