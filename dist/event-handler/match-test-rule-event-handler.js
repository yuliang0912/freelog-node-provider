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
                resourceType: testResource.resourceType,
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
                    resourceType: testResource.resourceType,
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
        const { id, testResourceOriginInfo, ruleInfo, onlineStatusInfo, tagInfo, titleInfo, coverInfo, attrInfo, rootResourceReplacer, efficientInfos, replaceRecords } = testRuleMatchInfo;
        const testResourceInfo = {
            nodeId, ruleId: id, userId,
            associatedPresentableId: testRuleMatchInfo.presentableInfo?.presentableId ?? '',
            resourceType: rootResourceReplacer?.resourceType ?? testResourceOriginInfo.resourceType,
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
                    rootResourceReplacer: lodash_1.omit(rootResourceReplacer, ['systemProperty', 'customPropertyDescriptors']),
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWF0Y2gtdGVzdC1ydWxlLWV2ZW50LWhhbmRsZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvZXZlbnQtaGFuZGxlci9tYXRjaC10ZXN0LXJ1bGUtZXZlbnQtaGFuZGxlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7QUFBQSxtQ0FBdUM7QUFDdkMsZ0VBY2dDO0FBV2hDLG1DQUEyRDtBQUMzRCxrQ0FBZ0Q7QUFDaEQsdURBQXFFO0FBQ3JFLHFGQUE4RTtBQUM5RSxtRUFBNEQ7QUFHNUQsSUFBYSx5QkFBeUIsR0FBdEMsTUFBYSx5QkFBeUI7SUF1QmxDOzs7O09BSUc7SUFDSCxLQUFLLENBQUMsTUFBTSxDQUFDLE1BQWMsRUFBRSxtQkFBNEIsS0FBSztRQUUxRCxNQUFNLHNCQUFzQixHQUFHLEVBQUUsQ0FBQztRQUNsQyxNQUFNLHVCQUF1QixHQUEwQixFQUFFLENBQUM7UUFDMUQsTUFBTSxnQkFBZ0IsR0FBRyxNQUFNLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxPQUFPLENBQUMsRUFBQyxNQUFNLEVBQUMsQ0FBQyxDQUFDO1FBQzNFLE1BQU0saUJBQWlCLEdBQUcsQ0FBQyxJQUFJLElBQUksRUFBRSxDQUFDLE9BQU8sRUFBRSxHQUFHLGdCQUFnQixFQUFFLFVBQVUsQ0FBQyxPQUFPLEVBQUUsR0FBRyxLQUFLLENBQUMsQ0FBQztRQUNsRyxJQUFJLENBQUMsZ0JBQWdCLElBQUksZ0JBQWdCLENBQUMsTUFBTSxLQUFLLDhCQUF1QixDQUFDLE9BQU8sSUFBSSxpQkFBaUIsRUFBRTtZQUN2RyxPQUFPO1NBQ1Y7UUFDRCxzQ0FBc0M7UUFDdEMsSUFBSSxDQUFDLGdCQUFnQixJQUFJLGdCQUFnQixDQUFDLE1BQU0sS0FBSyw4QkFBdUIsQ0FBQyxTQUFTLElBQUksaUJBQWlCLEVBQUU7WUFDekcsT0FBTztTQUNWO1FBQ0QsSUFBSTtZQUNBLE1BQU0sS0FBSyxHQUFHLEVBQUUsQ0FBQztZQUNqQixJQUFJLGdCQUFn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