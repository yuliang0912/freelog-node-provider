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
    testRuleHandler;
    testNodeGenerator;
    nodeTestRuleProvider;
    nodeTestResourceProvider;
    nodeTestResourceTreeProvider;
    nodeProvider;
    presentableService;
    outsideApiService;
    presentableVersionService;
    presentableCommonChecker;
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
                // replaced: first(replaceRecords ?? [])
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWF0Y2gtdGVzdC1ydWxlLWV2ZW50LWhhbmRsZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvZXZlbnQtaGFuZGxlci9tYXRjaC10ZXN0LXJ1bGUtZXZlbnQtaGFuZGxlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7QUFBQSxtQ0FBdUM7QUFDdkMsZ0VBY2dDO0FBV2hDLG1DQUEyRDtBQUMzRCxrQ0FBZ0Q7QUFDaEQsdURBQXFFO0FBQ3JFLHFGQUE4RTtBQUM5RSxtRUFBNEQ7QUFHNUQsSUFBYSx5QkFBeUIsR0FBdEMsTUFBYSx5QkFBeUI7SUFHbEMsZUFBZSxDQUFrQjtJQUVqQyxpQkFBaUIsQ0FBQztJQUVsQixvQkFBb0IsQ0FBc0M7SUFFMUQsd0JBQXdCLENBQXNDO0lBRTlELDRCQUE0QixDQUEwQztJQUV0RSxZQUFZLENBQThCO0lBRTFDLGtCQUFrQixDQUFzQjtJQUV4QyxpQkFBaUIsQ0FBcUI7SUFFdEMseUJBQXlCLENBQTZCO0lBRXRELHdCQUF3QixDQUEyQjtJQUVuRDs7OztPQUlHO0lBQ0gsS0FBSyxDQUFDLE1BQU0sQ0FBQyxNQUFjLEVBQUUsbUJBQTRCLEtBQUs7UUFFMUQsTUFBTSxzQkFBc0IsR0FBRyxFQUFFLENBQUM7UUFDbEMsTUFBTSx1QkFBdUIsR0FBMEIsRUFBRSxDQUFDO1FBQzFELE1BQU0sZ0JBQWdCLEdBQUcsTUFBTSxJQUFJLENBQUMsb0JBQW9CLENBQUMsT0FBTyxDQUFDLEVBQUMsTUFBTSxFQUFDLENBQUMsQ0FBQztRQUMzRSxNQUFNLGlCQUFpQixHQUFHLENBQUMsSUFBSSxJQUFJLEVBQUUsQ0FBQyxPQUFPLEVBQUUsR0FBRyxnQkFBZ0IsRUFBRSxVQUFVLENBQUMsT0FBTyxFQUFFLEdBQUcsS0FBSyxDQUFDLENBQUM7UUFDbEcsSUFBSSxDQUFDLGdCQUFnQixJQUFJLGdCQUFnQixDQUFDLE1BQU0sS0FBSyw4QkFBdUIsQ0FBQyxPQUFPLElBQUksaUJBQWlCLEVBQUU7WUFDdkcsT0FBTztTQUNWO1FBQ0Qsc0NBQXNDO1FBQ3RDLElBQUksQ0FBQyxnQkFBZ0IsSUFBSSxnQkFBZ0IsQ0FBQyxNQUFNLEtBQUssOEJBQXVCLENBQUMsU0FBUyxJQUFJLGlCQUFpQixFQUFFO1lBQ3pHLE9BQU87U0FDVjtRQUNELElBQUk7WUFDQSxNQUFNLEtBQUssR0FBRyxFQUFFLENBQUM7WUFDakIsSUFBSSxnQkFBZ0IsQ0FBQyxNQUFNLEtBQUssOEJBQXVCLENBQUMsT0FBTyxFQUFFO2dCQUM3RCxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxTQUFTLENBQUMsRUFBQyxNQUFNLEVBQUMsRUFBRTtvQkFDckQsTUFBTSxFQUFFLDhCQUF1QixDQUFDLE9BQU8sRUFBRSxhQUFhLEVBQUUsRUFBRTtpQkFDN0QsQ0FBQyxDQUFDLENBQUM7YUFDUDtZQUNELEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLHdCQUF3QixDQUFDLFVBQVUsQ0FBQyxFQUFDLE1BQU0sRUFBQyxDQUFDLENBQUMsQ0FBQztZQUMvRCxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyw0QkFBNEIsQ0FBQyxVQUFVLENBQUMsRUFBQyxNQUFNLEVBQUMsQ0FBQyxDQUFDLENBQUM7WUFDbkUsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBRXpCLHFDQUFxQztZQUNyQyxLQUFLLE1BQU0sU0FBUyxJQUFJLGNBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFO2dCQUNoRixNQUFNLElBQUksQ0FBQyw2QkFBNkIsQ0FBQyxTQUFTLEVBQUUsTUFBTSxFQUFFLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxFQUFFO29CQUM3Ryx1QkFBdUIsQ0FBQyxJQUFJLENBQUMsR0FBRyxvQkFBb0IsQ0FBQyxDQUFDO2dCQUMxRCxDQUFDLENBQUMsQ0FBQzthQUNOO1lBRUQsS0FBSyxNQUFNLFdBQVcsSUFBSSx1QkFBdUIsRUFBRTtnQkFDL0MsTUFBTSxZQUFZLEdBQUcsZ0JBQWdCLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssV0FBVyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQztnQkFDN0YsWUFBWSxDQUFDLFdBQVcsR0FBRyxXQUFXLENBQUMsV0FBVyxDQUFDO2dCQUNuRCxJQUFJLFdBQVcsQ0FBQyxPQUFPLEVBQUU7b0JBQ3JCLFlBQVksQ0FBQyxjQUFjLEdBQUcsV0FBVyxDQUFDLGNBQWMsQ0FBQztpQkFDNUQ7Z0JBQ0QsSUFBSSxXQUFXLENBQUMsdUJBQXVCLEVBQUU7b0JBQ3JDLHNCQUFzQixDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsdUJBQXVCLENBQUMsQ0FBQztpQkFDcEU7YUFDSjtZQUVELE1BQU0sSUFBSSxDQUFDLHVDQUF1QyxDQUFDLE1BQU0sRUFBRSxnQkFBZ0IsQ0FBQyxNQUFNLEVBQUUsc0JBQXNCLENBQUMsQ0FBQztZQUM1RyxNQUFNLHFCQUFxQixHQUFHLE1BQU0sSUFBSSxDQUFDLG9CQUFvQixDQUFDLGdCQUFnQixDQUFDLENBQUM7WUFDaEYsTUFBTSxJQUFJLENBQUMsb0JBQW9CLENBQUMsU0FBUyxDQUFDLEVBQUMsTUFBTSxFQUFDLEVBQUU7Z0JBQ2hELE1BQU0sRUFBRSw4QkFBdUIsQ0FBQyxTQUFTO2dCQUN6QyxTQUFTLEVBQUUsZ0JBQWdCLENBQUMsU0FBUztnQkFDckMsT0FBTyxFQUFFLHFCQUFxQixFQUFFLGNBQWMsSUFBSSxFQUFFO2dCQUNwRCxlQUFlLEVBQUUsSUFBSSxJQUFJLEVBQUU7YUFDOUIsQ0FBQyxDQUFDO1NBQ047UUFBQyxPQUFPLENBQUMsRUFBRTtZQUNSLE9BQU8sQ0FBQyxHQUFHLENBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQzdCLE1BQU0sSUFBSSxDQUFDLG9CQUFvQixDQUFDLFNBQVMsQ0FBQyxFQUFDLE1BQU0sRUFBQyxFQUFFO2dCQUNoRCxNQUFNLEVBQUUsOEJBQXVCLENBQUMsTUFBTSxFQUFFLGFBQWEsRUFBRSxDQUFDLENBQUMsUUFBUSxFQUFFO2FBQ3RFLENBQUMsQ0FBQztTQUNOO0lBQ0wsQ0FBQztJQUVEOzs7OztPQUtHO0lBQ0gsS0FBSyxDQUFDLDZCQUE2QixDQUFDLFNBQTZCLEVBQUUsTUFBYyxFQUFFLE1BQWM7UUFFN0YsSUFBSSxnQkFBTyxDQUFDLFNBQVMsQ0FBQyxFQUFFO1lBQ3BCLE9BQU87U0FDVjtRQUVELE1BQU0sa0JBQWtCLEdBQUcsTUFBTSxJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDOUUsTUFBTSx3QkFBd0IsR0FBRyxjQUFLLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsMkNBQXFCLENBQUMsS0FBSyxFQUFFLDJDQUFxQixDQUFDLEdBQUcsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxDQUFDO2FBQ3ZLLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLGtDQUFrQyxDQUFDLGlCQUFpQixFQUFFLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUV0Siw0TEFBNEw7UUFDNUwsNkdBQTZHO1FBRTdHLE1BQU0sV0FBVyxHQUFHLElBQUksR0FBRyxFQUF3QixDQUFDO1FBQ3BELE1BQU0sdUJBQXVCLEdBQUcsSUFBSSxHQUFHLEVBQTRCLENBQUM7UUFDcEUsTUFBTSxjQUFjLEdBQUcsY0FBSyxDQUFDLHdCQUF3QixDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLEtBQUssNENBQXNCLENBQUMsUUFBUSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDO1FBQzNLLEtBQUssTUFBTSxXQUFXLElBQUksY0FBSyxDQUFDLGNBQWMsRUFBRSxHQUFHLENBQUMsRUFBRTtZQUNsRCxNQUFNLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxvQkFBb0IsQ0FBQyxXQUFXLEVBQUUsRUFBQyxVQUFVLEVBQUUsdUNBQXVDLEVBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRTtnQkFDOUgsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLFVBQVUsRUFBRSxRQUFRLENBQUMsQ0FBQyxDQUFDO1lBQzdFLENBQUMsQ0FBQyxDQUFDO1NBQ047UUFFRCxNQUFNLHFCQUFxQixHQUFHLEVBQUUsQ0FBQztRQUNqQyxLQUFLLElBQUksWUFBWSxJQUFJLHdCQUF3QixFQUFFO1lBQy9DLE1BQU0saUJBQWlCLEdBQUcsa0JBQWtCLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxZQUFZLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDckYsTUFBTSxnQkFBZ0IsR0FBRyx1QkFBdUIsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLGNBQWMsQ0FBQyxFQUFFLGdCQUFnQixDQUFDO1lBQ3BHLFlBQVksQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixDQUFDLDRCQUE0QixDQUFDLFlBQVksQ0FBQyxjQUFjLEVBQUUsV0FBVyxDQUFDLENBQUM7WUFDdEgsWUFBWSxDQUFDLGdCQUFnQixHQUFHLElBQUksQ0FBQywrQkFBK0IsQ0FBQyxZQUFZLENBQUMsUUFBUSxFQUFFLE1BQU0sRUFBRSxnQkFBZ0IsRUFBRSxpQkFBaUIsQ0FBQyxlQUFlLENBQUMsQ0FBQztZQUN6SixZQUFZLENBQUMseUJBQXlCLEdBQUcsQ0FBQyxZQUFZLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxJQUFJLFlBQVksQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDeEoscUJBQXFCLENBQUMsSUFBSSxDQUFDO2dCQUN2QixNQUFNO2dCQUNOLGNBQWMsRUFBRSxZQUFZLENBQUMsY0FBYztnQkFDM0MsZ0JBQWdCLEVBQUUsWUFBWSxDQUFDLGdCQUFnQjtnQkFDL0MsWUFBWSxFQUFFLFlBQVksQ0FBQyxZQUFZO2dCQUN2QyxRQUFRLEVBQUUsWUFBWSxDQUFDLFFBQVE7Z0JBQy9CLGNBQWMsRUFBRSxZQUFZLENBQUMsY0FBYzthQUM5QyxDQUFDLENBQUM7U0FDTjtRQUVELE1BQU0sSUFBSSxDQUFDLHdCQUF3QixDQUFDLFVBQVUsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDO1FBQ3pFLE1BQU0sSUFBSSxDQUFDLDRCQUE0QixDQUFDLFVBQVUsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO1FBRTFFLE9BQU8sa0JBQWtCLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQzlCLE9BQU87Z0JBQ0gsTUFBTSxFQUFFLENBQUMsQ0FBQyxFQUFFO2dCQUNaLE9BQU8sRUFBRSxDQUFDLENBQUMsT0FBTztnQkFDbEIsV0FBVyxFQUFFLENBQUMsQ0FBQyxXQUFXO2dCQUMxQixjQUFjLEVBQUUsQ0FBQyxDQUFDLGNBQWM7Z0JBQ2hDLHVCQUF1QixFQUFFLENBQUMsQ0FBQyxlQUFlLEVBQUUsYUFBYTthQUM1RCxDQUFDO1FBQ04sQ0FBQyxDQUFDLENBQUM7SUFDUCxDQUFDO0lBRUQ7Ozs7O09BS0c7SUFDSCxLQUFLLENBQUMsdUNBQXVDLENBQUMsTUFBYyxFQUFFLE1BQWMsRUFBRSxzQkFBZ0M7UUFDMUcsSUFBSSxJQUFJLEdBQUcsQ0FBQyxDQUFDO1FBQ2IsTUFBTSxLQUFLLEdBQUcsRUFBRSxDQUFDO1FBQ2pCLE1BQU0sU0FBUyxHQUFHLEVBQUMsTUFBTSxFQUFFLFVBQVUsRUFBRSxFQUFDLEdBQUcsRUFBRSxJQUFJLElBQUksRUFBRSxFQUFDLEVBQUMsQ0FBQztRQUMxRCxJQUFJLENBQUMsZ0JBQU8sQ0FBQyxzQkFBc0IsQ0FBQyxFQUFFO1lBQ2xDLFNBQVMsQ0FBQyxLQUFLLENBQUMsR0FBRyxFQUFDLElBQUksRUFBRSxzQkFBc0IsRUFBQyxDQUFDO1NBQ3JEO1FBQ0QsTUFBTSxVQUFVLEdBQUcsQ0FBQyxlQUFlLEVBQUUsS0FBSyxFQUFFLGNBQWMsRUFBRSxhQUFhLEVBQUUsaUJBQWlCLEVBQUUsa0JBQWtCLEVBQUUsY0FBYyxFQUFFLFNBQVMsRUFBRSxrQkFBa0IsQ0FBQyxDQUFDO1FBQ2pLLE9BQU8sSUFBSSxFQUFFO1lBQ1QsTUFBTSxZQUFZLEdBQUcsTUFBTSxJQUFJLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxVQUFVLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFO2dCQUNyRixJQUFJLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxFQUFDLFVBQVUsRUFBRSxDQUFDLENBQUMsRUFBQzthQUN0QyxDQUFDLENBQUM7WUFDSCxJQUFJLGdCQUFPLENBQUMsWUFBWSxDQUFDLEVBQUU7Z0JBQ3ZCLE1BQU07YUFDVDtZQUNELE1BQU0scUJBQXFCLEdBQUcsWUFBWSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyw0QkFBNEIsQ0FBQyxDQUFDLENBQUMsYUFBYSxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1lBQzVJLE1BQU0sdUJBQXVCLEdBQUcsTUFBTSxJQUFJLENBQUMseUJBQXlCLENBQUMsSUFBSSxDQUFDLEVBQUMsb0JBQW9CLEVBQUUsRUFBQyxHQUFHLEVBQUUscUJBQXFCLEVBQUMsRUFBQyxDQUFDLENBQUM7WUFDaEksTUFBTSxxQkFBcUIsR0FBd0MsSUFBSSxHQUFHLENBQUMsdUJBQXVCLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsYUFBYSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNuSSxNQUFNLGNBQWMsR0FBRyxjQUFLLENBQUMsdUJBQXVCLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ2pJLE1BQU0sV0FBVyxHQUE4QixNQUFNLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLEVBQUUsRUFBQyxVQUFVLEVBQUUsb0NBQW9DLEVBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRTtnQkFDN0ssT0FBTyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNyRCxDQUFDLENBQUMsQ0FBQztZQUVILE1BQU0scUJBQXFCLEdBQUcsRUFBRSxDQUFDO1lBQ2pDLE1BQU0sYUFBYSxHQUFHLFlBQVksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsZ0NBQWdDLENBQUMsQ0FBQyxFQUFFLHFCQUFxQixDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLEVBQUUsV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLFVBQVUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDO1lBQzlMLEtBQUssTUFBTSxZQUFZLElBQUksYUFBYSxFQUFFO2dCQUN0QyxxQkFBcUIsQ0FBQyxJQUFJLENBQUM7b0JBQ3ZCLE1BQU07b0JBQ04sY0FBYyxFQUFFLFlBQVksQ0FBQyxjQUFjO29CQUMzQyxnQkFBZ0IsRUFBRSxZQUFZLENBQUMsZ0JBQWdCO29CQUMvQyxZQUFZLEVBQUUsWUFBWSxDQUFDLFlBQVk7b0JBQ3ZDLFFBQVEsRUFBRSxJQUFJLENBQUMsZ0RBQWdELENBQUMscUJBQXFCLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDLFFBQVEsRUFBRSxXQUFXLENBQUM7b0JBQ3RKLGNBQWMsRUFBRSxJQUFJLENBQUMsNERBQTRELENBQUMsWUFBWSxDQUFDLGNBQWMsRUFBRSxxQkFBcUIsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLHVCQUF1QixDQUFDLENBQUMsY0FBYyxDQUFDO2lCQUNqTSxDQUFDLENBQUM7YUFDTjtZQUNELE1BQU0sSUFBSSxDQUFDLHdCQUF3QixDQUFDLFVBQVUsQ0FBQyxhQUFhLENBQUMsQ0FBQztZQUM5RCxNQUFNLElBQUksQ0FBQyw0QkFBNEIsQ0FBQyxVQUFVLENBQUMscUJBQXFCLENBQUMsQ0FBQztZQUMxRSxJQUFJLElBQUksRUFBRSxDQUFDO1NBQ2Q7SUFDTCxDQUFDO0lBRUQ7OztPQUdHO0lBQ0gsS0FBSyxDQUFDLG9CQUFvQixDQUFDLGdCQUFrQztRQUN6RCxNQUFNLG1CQUFtQixHQUFzQixnQkFBZ0IsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxTQUFTLEtBQUssMkNBQXFCLENBQUMsYUFBYSxDQUFDLENBQUM7UUFDbEosSUFBSSxxQkFBcUIsR0FBRyxNQUFNLElBQUksQ0FBQyxlQUFlLENBQUMsY0FBYyxDQUFDLGdCQUFnQixDQUFDLE1BQU0sRUFBRSxtQkFBbUIsQ0FBQyxDQUFDO1FBQ3BILElBQUksQ0FBQyxxQkFBcUIsRUFBRTtZQUN4QixxQkFBcUIsR0FBRyxNQUFNLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxPQUFPLENBQUM7Z0JBQ2hFLE1BQU0sRUFBRSxnQkFBZ0IsQ0FBQyxNQUFNO2dCQUMvQixZQUFZLEVBQUUsbUNBQWdCLENBQUMsS0FBSztnQkFDcEMseUNBQXlDLEVBQUUsQ0FBQzthQUMvQyxDQUFDLENBQUM7U0FDTjtRQUNELElBQUksQ0FBQyxxQkFBcUIsRUFBRTtZQUN4QixPQUFPO1NBQ1Y7UUFDRCxNQUFNLFdBQVcsR0FBRztZQUNoQixzQ0FBc0MsRUFBRSxDQUFDO1lBQ3pDLDRCQUE0QixFQUFFLG1CQUFtQixFQUFFLEVBQUUsSUFBSSxTQUFTO1NBQ3JFLENBQUM7UUFDRixJQUFJLG1CQUFtQixFQUFFLE9BQU8sRUFBRTtZQUM5QixXQUFXLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBQyxLQUFLLEVBQUUsRUFBQyxNQUFNLEVBQUUsbUJBQW1CLENBQUMsRUFBRSxFQUFFLFVBQVUsRUFBRSxDQUFDLGVBQWUsQ0FBQyxFQUFDLEVBQUMsQ0FBQztTQUNuRztRQUNELE1BQU0sSUFBSSxDQUFDLHdCQUF3QixDQUFDLFNBQVMsQ0FBQyxFQUFDLGNBQWMsRUFBRSxxQkFBcUIsQ0FBQyxjQUFjLEVBQUMsRUFBRSxXQUFXLENBQUMsQ0FBQztRQUNuSCxPQUFPLHFCQUFxQixDQUFDO0lBQ2pDLENBQUM7SUFFRDs7Ozs7T0FLRztJQUNILGtDQUFrQyxDQUFDLGlCQUFvQyxFQUFFLE1BQWMsRUFBRSxNQUFjO1FBRW5HLE1BQU0sRUFBQyxFQUFFLEVBQUUsc0JBQXNCLEVBQUUsUUFBUSxFQUFFLGdCQUFnQixFQUFFLE9BQU8sRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLFFBQVEsRUFBRSxvQkFBb0IsRUFBRSxjQUFjLEVBQUUsY0FBYyxFQUFDLEdBQUcsaUJBQWlCLENBQUM7UUFDbEwsTUFBTSxnQkFBZ0IsR0FBcUI7WUFDdkMsTUFBTSxFQUFFLE1BQU0sRUFBRSxFQUFFLEVBQUUsTUFBTTtZQUMxQix1QkFBdUIsRUFBRSxpQkFBaUIsQ0FBQyxlQUFlLEVBQUUsYUFBYSxJQUFJLEVBQUU7WUFDL0UsWUFBWSxFQUFFLG9CQUFvQixFQUFFLFlBQVksSUFBSSxzQkFBc0IsQ0FBQyxZQUFZO1lBQ3ZGLGNBQWMsRUFBRSxJQUFJLENBQUMsaUJBQWlCLENBQUMsc0JBQXNCLENBQUMsTUFBTSxFQUFFLHNCQUFzQixDQUFDO1lBQzdGLGdCQUFnQixFQUFFLFFBQVEsQ0FBQyxXQUFXO1lBQ3RDLFVBQVUsRUFBRSxzQkFBc0I7WUFDbEMsU0FBUyxFQUFFO2dCQUNQLGdCQUFnQixFQUFFO29CQUNkLFlBQVksRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLElBQUksQ0FBQztvQkFDM0MsTUFBTSxFQUFFLGdCQUFnQixFQUFFLE1BQU0sSUFBSSxTQUFTO2lCQUNoRDtnQkFDRCxPQUFPLEVBQUU7b0JBQ0wsSUFBSSxFQUFFLE9BQU8sRUFBRSxJQUFJLElBQUksRUFBRTtvQkFDekIsTUFBTSxFQUFFLE9BQU8sRUFBRSxNQUFNLElBQUksU0FBUztpQkFDdkM7Z0JBQ0QsU0FBUyxFQUFFO29CQUNQLEtBQUssRUFBRSxTQUFTLEVBQUUsS0FBSyxJQUFJLHNCQUFzQixDQUFDLElBQUk7b0JBQ3RELE1BQU0sRUFBRSxTQUFTLEVBQUUsTUFBTSxJQUFJLFNBQVM7aUJBQ3pDO2dCQUNELFNBQVMsRUFBRTtvQkFDUCxXQUFXLEVBQUUsU0FBUyxFQUFFLFdBQVcsSUFBSSxzQkFBc0IsQ0FBQyxXQUFXO29CQUN6RSxNQUFNLEVBQUUsU0FBUyxFQUFFLE1BQU0sSUFBSSxTQUFTO2lCQUN6QztnQkFDRCxZQUFZLEVBQUU7b0JBQ1Ysb0JBQW9CLEVBQUUsUUFBUSxFQUFFLEtBQUssSUFBSSxFQUFFO29CQUMzQyxNQUFNLEVBQUUsUUFBUSxFQUFFLE1BQU0sSUFBSSxTQUFTO2lCQUN4QztnQkFDRCxTQUFTLEVBQUU7b0JBQ1AsZ0JBQWdCLEVBQUUsQ0FBQztvQkFDbkIsTUFBTSxFQUFFLFNBQVM7aUJBQ3BCO2dCQUNELFdBQVcsRUFBRTtvQkFDVCxvQkFBb0IsRUFBRSxhQUFJLENBQUMsb0JBQW9CLEVBQUUsQ0FBQyxnQkFBZ0IsRUFBRSwyQkFBMkIsQ0FBQyxDQUFDO29CQUNqRyxjQUFjLEVBQUUsY0FBYyxJQUFJLEVBQUU7b0JBQ3BDLE1BQU0sRUFBRSxDQUFDLGNBQWMsSUFBSSxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsU0FBUztpQkFDekQ7YUFDSjtZQUNELEtBQUssRUFBRSxDQUFDO29CQUNKLE1BQU0sRUFBRSxFQUFFLEVBQUUsVUFBVSxFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO2lCQUMxRCxDQUFDO1lBQ0YseUJBQXlCLEVBQUUsQ0FBQztTQUMvQixDQUFDO1FBQ0YsZ0JBQWdCLENBQUMsY0FBYyxHQUFHLElBQUksQ0FBQyxpQ0FBaUMsQ0FBQyxnQkFBZ0IsQ0FBQyxjQUFjLEVBQUUsaUJBQWlCLENBQUMsb0JBQW9CLENBQUMsQ0FBQztRQUNsSixnQkFBZ0IsQ0FBQyxnQkFBZ0IsR0FBRyxnQkFBZ0IsQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLE1BQU0sS0FBSyxNQUFNLElBQUksQ0FBQyxDQUFDLElBQUksS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksS0FBSyw0Q0FBc0IsQ0FBQyxRQUFRLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUU7WUFDdkssT0FBTztnQkFDSCxVQUFVLEVBQUUsQ0FBQyxDQUFDLEVBQUU7Z0JBQ2hCLFlBQVksRUFBRSxDQUFDLENBQUMsSUFBSTtnQkFDcEIsU0FBUyxFQUFFLEVBQUU7YUFDaEIsQ0FBQztRQUNOLENBQUMsQ0FBQyxDQUFDO1FBQ0gsT0FBTyxnQkFBZ0IsQ0FBQztJQUM1QixDQUFDO0lBRUQ7OztPQUdHO0lBQ0gsdUJBQXVCLENBQUMsaUJBQW9DO1FBQ3hELE1BQU0sMEJBQTBCLEdBQVEsRUFBRSxDQUFDO1FBQzNDLE1BQU0sMEJBQTBCLEdBQVEsRUFBRSxDQUFDO1FBQzNDLE1BQU0sc0JBQXNCLEdBQVEsRUFBRSxDQUFDO1FBQ3ZDLE1BQU0sbUJBQW1CLEdBQVEsRUFBRSxDQUFDO1FBQ3BDLGlCQUFpQixDQUFDLHNCQUFzQixDQUFDLHlCQUF5QixFQUFFLE9BQU8sQ0FBQyxDQUFDLEVBQUMsR0FBRyxFQUFFLFlBQVksRUFBRSxJQUFJLEVBQUMsRUFBRSxFQUFFO1lBQ3RHLElBQUksSUFBSSxLQUFLLGNBQWMsRUFBRTtnQkFDekIsMEJBQTBCLENBQUMsR0FBRyxDQUFDLEdBQUcsWUFBWSxDQUFDO2FBQ2xEO2lCQUFNO2dCQUNILDBCQUEwQixDQUFDLEdBQUcsQ0FBQyxHQUFHLFlBQVksQ0FBQzthQUNsRDtRQUNMLENBQUMsQ0FBQyxDQUFDO1FBQ0gsaUJBQWlCLENBQUMsMEJBQTBCLEVBQUUsT0FBTyxDQUFDLENBQUMsRUFBQyxHQUFHLEVBQUUsS0FBSyxFQUFDLEVBQUUsRUFBRTtZQUNuRSxzQkFBc0IsQ0FBQyxHQUFHLENBQUMsR0FBRyxLQUFLLENBQUM7UUFDeEMsQ0FBQyxDQUFDLENBQUM7UUFDSCxpQkFBaUIsQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFLE9BQU8sQ0FBQyxDQUFDLEVBQUMsR0FBRyxFQUFFLFNBQVMsRUFBRSxLQUFLLEVBQUMsRUFBRSxFQUFFO1lBQ2xFLElBQUksU0FBUyxLQUFLLEtBQUssRUFBRTtnQkFDckIsbUJBQW1CLENBQUMsR0FBRyxDQUFDLEdBQUcsS0FBSyxDQUFDO2FBQ3BDO1FBQ0wsQ0FBQyxDQUFDLENBQUM7UUFDSCx3REFBd0Q7UUFDeEQsTUFBTSxvQkFBb0IsR0FBRyxlQUFNLENBQUMsMEJBQTBCLEVBQUUsc0JBQXNCLEVBQUUsMEJBQTBCLEVBQUUsaUJBQWlCLENBQUMsc0JBQXNCLENBQUMsY0FBYyxDQUFDLENBQUM7UUFDN0ssTUFBTSxRQUFRLEdBQUcsaUJBQWlCLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsU0FBUyxLQUFLLFFBQVEsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUV6RyxPQUFPLGFBQUksQ0FBQyxvQkFBb0IsRUFBRSxRQUFRLENBQUMsQ0FBQztJQUNoRCxDQUFDO0lBRUQ7Ozs7Ozs7T0FPRztJQUNILGdDQUFnQyxDQUFDLGVBQWdDLEVBQUUsc0JBQThDLEVBQUUsWUFBMEIsRUFBRSxNQUFjLEVBQUUsTUFBYztRQUN6SyxNQUFNLHNCQUFzQixHQUFHO1lBQzNCLEVBQUUsRUFBRSxlQUFlLENBQUMsWUFBWSxDQUFDLFVBQVU7WUFDM0MsSUFBSSxFQUFFLGVBQWUsQ0FBQyxZQUFZLENBQUMsWUFBWTtZQUMvQyxJQUFJLEVBQUUsNENBQXNCLENBQUMsUUFBUTtZQUNyQyxZQUFZLEVBQUUsZUFBZSxDQUFDLFlBQVksQ0FBQyxZQUFZO1lBQ3ZELE9BQU8sRUFBRSxlQUFlLENBQUMsT0FBTztZQUNoQyxRQUFRLEVBQUUsWUFBWSxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQy9FLFdBQVcsRUFBRSxZQUFZLEVBQUUsV0FBVyxJQUFJLEVBQUU7U0FDL0MsQ0FBQztRQUNGLE9BQU87WUFDSCxNQUFNLEVBQUUsTUFBTTtZQUNkLHVCQUF1QixFQUFFLGVBQWUsQ0FBQyxhQUFhO1lBQ3RELFlBQVksRUFBRSxlQUFlLENBQUMsWUFBWSxDQUFDLFlBQVk7WUFDdkQsY0FBYyxFQUFFLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxzQkFBc0IsQ0FBQyxNQUFNLEVBQUUsc0JBQXNCLENBQUM7WUFDN0YsZ0JBQWdCLEVBQUUsZUFBZSxDQUFDLGVBQWU7WUFDakQsVUFBVSxFQUFFLHNCQUFzQjtZQUNsQyxTQUFTLEVBQUU7Z0JBQ1AsZ0JBQWdCLEVBQUU7b0JBQ2QsWUFBWSxFQUFFLGVBQWUsQ0FBQyxZQUFZO29CQUMxQyxNQUFNLEVBQUUsU0FBUztpQkFDcEI7Z0JBQ0QsT0FBTyxFQUFFO29CQUNMLElBQUksRUFBRSxlQUFlLENBQUMsSUFBSTtvQkFDMUIsTUFBTSxFQUFFLFNBQVM7aUJBQ3BCO2dCQUNELFNBQVMsRUFBRTtvQkFDUCxXQUFXLEVBQUUsZUFBZSxDQUFDLFdBQVc7b0JBQ3hDLE1BQU0sRUFBRSxTQUFTO2lCQUNwQjtnQkFDRCxTQUFTLEVBQUU7b0JBQ1AsS0FBSyxFQUFFLGVBQWUsQ0FBQyxnQkFBZ0I7b0JBQ3ZDLE1BQU0sRUFBRSxTQUFTO2lCQUNwQjtnQkFDRCxZQUFZLEVBQUU7b0JBQ1Ysb0JBQW9CLEVBQUUsSUFBSSxDQUFDLDBCQUEwQixDQUFDLHNCQUFzQixDQUFDO29CQUM3RSxNQUFNLEVBQUUsU0FBUztpQkFDcEI7Z0JBQ0QsU0FBUyxFQUFFO29CQUNQLGdCQUFnQixFQUFFLENBQUM7b0JBQ25CLE1BQU0sRUFBRSxTQUFTO2lCQUNwQjtnQkFDRCxXQUFXLEVBQUU7b0JBQ1QsY0FBYyxFQUFFLEVBQUU7b0JBQ2xCLE1BQU0sRUFBRSxTQUFTO2lCQUNwQjthQUNKO1lBQ0QsZ0JBQWdCLEVBQUUsZUFBZSxDQUFDLGdCQUF5QztZQUMzRSx5QkFBeUIsRUFBRSxlQUFlLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDbEcsS0FBSyxFQUFFLEVBQUU7U0FDWixDQUFDO0lBQ04sQ0FBQztJQUVEOzs7Ozs7OztPQVFHO0lBQ0gsaUNBQWlDLENBQUMsY0FBc0IsRUFBRSxjQUE0QyxFQUFFLFlBQW9CLEVBQUUsRUFBRSxVQUErQyxFQUFFLEVBQUUsT0FBZSxDQUFDO1FBQy9MLEtBQUssTUFBTSxjQUFjLElBQUksY0FBYyxFQUFFO1lBQ3pDLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyx3QkFBd0IsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ2hHLE1BQU0sRUFBQyxFQUFFLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxZQUFZLEVBQUUsWUFBWSxFQUFDLEdBQUcsY0FBYyxDQUFDLENBQUMsaUJBQWlCO1lBQ3BILE9BQU8sQ0FBQyxJQUFJLENBQUM7Z0JBQ1QsUUFBUSxFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLFNBQVM7Z0JBQ3ZELFNBQVMsRUFBRSxZQUFZO2dCQUN2Qix3Q0FBd0M7YUFDM0MsQ0FBQyxDQUFDO1lBQ0gsSUFBSSxDQUFDLGlDQUFpQyxDQUFDLGNBQWMsRUFBRSxZQUFZLElBQUksRUFBRSxFQUFFLEdBQUcsRUFBRSxPQUFPLEVBQUUsSUFBSSxHQUFHLENBQUMsQ0FBQyxDQUFDO1NBQ3RHO1FBQ0QsT0FBTyxPQUFPLENBQUM7SUFDbkIsQ0FBQztJQUVEOzs7O09BSUc7SUFDSCw0REFBNEQsQ0FBQyxjQUFzQixFQUFFLGlDQUFxRTtRQUN0SixNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsaUJBQWlCLENBQUMsd0JBQXdCLENBQUMsY0FBYyxDQUFDLENBQUM7UUFDNUUsS0FBSyxNQUFNLGNBQWMsSUFBSSxpQ0FBaUMsRUFBRTtZQUM1RCxJQUFJLGNBQWMsQ0FBQyxJQUFJLEtBQUssQ0FBQyxFQUFFO2dCQUMzQixjQUFjLENBQUMsU0FBUyxHQUFHLEdBQUcsQ0FBQzthQUNsQztTQUNKO1FBQ0QsaUNBQWlDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsR0FBRyxDQUFDO1FBRXBFLE9BQU8saUNBQWlDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFO1lBQ2hELE9BQU87Z0JBQ0gsR0FBRyxFQUFFLElBQUksQ0FBQyxHQUFHO2dCQUNiLEVBQUUsRUFBRSxJQUFJLENBQUMsVUFBVTtnQkFDbkIsSUFBSSxFQUFFLElBQUksQ0FBQyxZQUFZO2dCQUN2QixJQUFJLEVBQUUsNENBQXNCLENBQUMsUUFBUTtnQkFDckMsWUFBWSxFQUFFLElBQUksQ0FBQyxZQUFZO2dCQUMvQixPQUFPLEVBQUUsSUFBSSxDQUFDLE9BQU87Z0JBQ3JCLFNBQVMsRUFBRSxJQUFJLENBQUMsU0FBUztnQkFDekIsUUFBUSxFQUFFLElBQUksQ0FBQyxRQUFRO2dCQUN2QixTQUFTLEVBQUUsSUFBSSxDQUFDLFNBQVM7Z0JBQ3pCLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSTthQUNsQixDQUFDO1FBQ04sQ0FBQyxDQUFDLENBQUM7SUFDUCxDQUFDO0lBRUQ7Ozs7T0FJRztJQUNILGdEQUFnRCxDQUFDLGVBQTZDLEVBQUUsV0FBc0M7UUFDbEksT0FBTyxlQUFlLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFO1lBQzlCLE9BQU87Z0JBQ0gsR0FBRyxFQUFFLElBQUksQ0FBQyxHQUFHO2dCQUNiLEVBQUUsRUFBRSxJQUFJLENBQUMsVUFBVTtnQkFDbkIsSUFBSSxFQUFFLElBQUksQ0FBQyxZQUFZO2dCQUN2QixJQUFJLEVBQUUsNENBQXNCLENBQUMsUUFBUTtnQkFDckMsT0FBTyxFQUFFLElBQUksQ0FBQyxPQUFPO2dCQUNyQixTQUFTLEVBQUUsSUFBSSxDQUFDLFNBQVM7Z0JBQ3pCLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSTtnQkFDZixTQUFTLEVBQUUsSUFBSSxDQUFDLFNBQVM7Z0JBQ3pCLE1BQU0sRUFBRSxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsRUFBRSxNQUFNO2FBQ25ELENBQUM7UUFDTixDQUFDLENBQUMsQ0FBQztJQUNQLENBQUM7SUFFRDs7Ozs7O09BTUc7SUFDSCwrQkFBK0IsQ0FBQyxRQUF1QyxFQUFFLE1BQWMsRUFBRSx3QkFBZ0QsRUFBRSxlQUFpQztRQUN4SywyQ0FBMkM7UUFDM0MsTUFBTSxrQkFBa0IsR0FBRyxJQUFJLEdBQUcsQ0FBQyxDQUFDLHdCQUF3QixJQUFJLGVBQWUsRUFBRSxnQkFBZ0IsSUFBSSxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNoSixPQUFPLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxLQUFLLDRDQUFzQixDQUFDLFFBQVEsSUFBSSxDQUFDLENBQUMsTUFBTSxLQUFLLE1BQU0sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQztZQUMzSCxVQUFVLEVBQUUsQ0FBQyxDQUFDLEVBQUU7WUFDaEIsWUFBWSxFQUFFLENBQUMsQ0FBQyxJQUFJO1lBQ3BCLFNBQVMsRUFBRSxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUU7U0FDaEQsQ0FBQyxDQUFDLENBQUM7SUFDUixDQUFDO0lBRUQ7OztPQUdHO0lBQ0gsMEJBQTBCLENBQUMsc0JBQThDO1FBQ3JFLE1BQU0sbUJBQW1CLEdBQUcsSUFBSSxHQUFHLEVBQW9DLENBQUM7UUFDeEUsTUFBTSxtQkFBbUIsR0FBRyxJQUFJLEdBQUcsRUFBb0MsQ0FBQztRQUV4RSx3RkFBd0Y7UUFDeEYsS0FBSyxNQUFNLENBQUMsR0FBRyxFQUFFLEtBQUssQ0FBQyxJQUFJLE1BQU0sQ0FBQyxPQUFPLENBQUMsc0JBQXNCLENBQUMsc0JBQXNCLElBQUksRUFBRSxDQUFDLEVBQUU7WUFDNUYsbUJBQW1CLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxFQUFDLEdBQUcsRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFFLENBQUMsRUFBRSxNQUFNLEVBQUUsRUFBRSxFQUFDLENBQUMsQ0FBQztTQUN4RTtRQUNELEtBQUssTUFBTSxFQUFDLEdBQUcsRUFBRSxZQUFZLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBQyxJQUFJLHNCQUFzQixDQUFDLGlDQUFpQyxJQUFJLEVBQUUsRUFBRTtZQUM1RyxJQUFJLG1CQUFtQixDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRTtnQkFDOUIsU0FBUzthQUNaO1lBQ0QsSUFBSSxJQUFJLEtBQUssY0FBYyxFQUFFO2dCQUN6QixtQkFBbUIsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLEVBQUMsR0FBRyxFQUFFLEtBQUssRUFBRSxZQUFZLEVBQUUsU0FBUyxFQUFFLENBQUMsRUFBRSxNQUFNLEVBQUMsQ0FBQyxDQUFDO2FBQ2xGO2lCQUFNO2dCQUNILG1CQUFtQixDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsRUFBQyxHQUFHLEVBQUUsS0FBSyxFQUFFLFlBQVksRUFBRSxTQUFTLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFBQyxDQUFDLENBQUM7YUFDbEY7U0FDSjtRQUNELEtBQUssTUFBTSxFQUFDLEdBQUcsRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFDLElBQUksc0JBQXNCLENBQUMsMEJBQTBCLElBQUksRUFBRSxFQUFFO1lBQ3hGLElBQUksbUJBQW1CLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFO2dCQUM5QixTQUFTO2FBQ1o7WUFDRCxtQkFBbUIsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLEVBQUMsR0FBRyxFQUFFLFNBQVMsRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBQyxDQUFDLENBQUM7U0FDcEU7UUFDRCxPQUFPLENBQUMsR0FBRyxtQkFBbUIsQ0FBQyxNQUFNLEVBQUUsRUFBRSxHQUFHLG1CQUFtQixDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUM7SUFDOUUsQ0FBQztDQUNKLENBQUE7QUE3ZUc7SUFEQyxlQUFNLEVBQUU7OEJBQ1EsbUNBQWU7a0VBQUM7QUFFakM7SUFEQyxlQUFNLEVBQUU7O29FQUNTO0FBRWxCO0lBREMsZUFBTSxFQUFFOzt1RUFDaUQ7QUFFMUQ7SUFEQyxlQUFNLEVBQUU7OzJFQUNxRDtBQUU5RDtJQURDLGVBQU0sRUFBRTs7K0VBQzZEO0FBRXRFO0lBREMsZUFBTSxFQUFFOzsrREFDaUM7QUFFMUM7SUFEQyxlQUFNLEVBQUU7O3FFQUMrQjtBQUV4QztJQURDLGVBQU0sRUFBRTs7b0VBQzZCO0FBRXRDO0lBREMsZUFBTSxFQUFFOzs0RUFDNkM7QUFFdEQ7SUFEQyxlQUFNLEVBQUU7OEJBQ2lCLHFEQUF3QjsyRUFBQztBQXJCMUMseUJBQXlCO0lBRHJDLGdCQUFPLEVBQUU7R0FDRyx5QkFBeUIsQ0FnZnJDO0FBaGZZLDhEQUF5QiJ9