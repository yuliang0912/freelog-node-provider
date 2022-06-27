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
     * @param userInfo
     * @param isMandatoryMatch 是否强制匹配
     */
    async handle(nodeId, userInfo, isMandatoryMatch = false) {
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
            if (nodeTestRuleInfo.status !== enum_1.NodeTestRuleMatchStatus.Pending) {
                await this.nodeTestRuleProvider.updateOne({ nodeId }, {
                    status: enum_1.NodeTestRuleMatchStatus.Pending, matchErrorMsg: ''
                });
            }
            // 按批次(每50条)匹配规则对应的测试资源,处理完尽早释放掉占用的内存
            let themeTestRuleMatchInfo = null;
            //for (const testRules of chunk(nodeTestRuleInfo.testRules.map(x => x.ruleInfo), 200)) {
            // }
            await this.matchAndSaveTestResourceInfos(nodeTestRuleInfo.testRules.map(x => x.ruleInfo), nodeId, userInfo).then(testRuleMatchResult => {
                if (!testRuleMatchResult) {
                    return;
                }
                if (testRuleMatchResult.themeTestRuleMatchInfo) {
                    themeTestRuleMatchInfo = testRuleMatchResult.themeTestRuleMatchInfo;
                }
                allTestRuleMatchResults.push(...testRuleMatchResult.testRuleMatchInfos);
            });
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
            await this.saveUnOperantPresentableToTestResources(nodeId, userInfo, operatedPresentableIds, themeTestRuleMatchInfo);
            let themeTestResourceId = themeTestRuleMatchInfo?.ruleInfo?.candidate ? this.testNodeGenerator.generateTestResourceId(nodeId, {
                id: themeTestRuleMatchInfo.ruleInfo.candidate.name, type: themeTestRuleMatchInfo.ruleInfo.candidate.type
            }) : '';
            if (!themeTestResourceId) {
                const themeTestResource = await this.nodeTestResourceProvider.findOne({
                    nodeId, 'stateInfo.themeInfo.isActivatedTheme': 1
                }, 'testResourceId');
                if (themeTestResource) {
                    themeTestResourceId = themeTestResource.testResourceId;
                }
            }
            await this.nodeTestRuleProvider.updateOne({ nodeId }, {
                status: enum_1.NodeTestRuleMatchStatus.Completed,
                testRules: allTestRuleMatchResults,
                themeId: themeTestResourceId,
                matchResultDate: new Date()
            });
            await this.nodeProvider.updateOne({ nodeId }, {
                nodeTestThemeId: themeTestResourceId
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
     * @param userInfo
     */
    async matchAndSaveTestResourceInfos(ruleInfos, nodeId, userInfo) {
        if ((0, lodash_1.isEmpty)(ruleInfos)) {
            await this.clearNodeTestResources(nodeId);
            return;
        }
        const testRuleMatchInfos = await this.testRuleHandler.main(nodeId, ruleInfos);
        const matchedNodeTestResources = (0, lodash_1.chain)(testRuleMatchInfos).filter(x => x.isValid && [test_node_interface_1.TestNodeOperationEnum.Alter, test_node_interface_1.TestNodeOperationEnum.Add].includes(x.ruleInfo.operation))
            .map(testRuleMatchInfo => this.testRuleMatchInfoMapToTestResource(testRuleMatchInfo, nodeId, userInfo)).uniqBy(data => data.testResourceId).value();
        const resourceMap = new Map();
        const existingTestResourceMap = new Map();
        const allResourceIds = (0, lodash_1.chain)(matchedNodeTestResources).map(x => x.dependencyTree).flatten().filter(x => x.type === test_node_interface_1.TestResourceOriginType.Resource).map(x => x.id).value();
        const allTestResourceIds = matchedNodeTestResources.map(x => x.testResourceId);
        const existingTestResources = await this.nodeTestResourceProvider.find({ testResourceId: { $in: allTestResourceIds } }, 'testResourceId resolveResources');
        for (const existingTestResourceInfo of existingTestResources) {
            existingTestResourceMap.set(existingTestResourceInfo.testResourceId, existingTestResourceInfo);
        }
        for (const resourceIds of (0, lodash_1.chunk)(allResourceIds, 200)) {
            await this.outsideApiService.getResourceListByIds(resourceIds, { projection: 'resourceId,baseUpcastResources,userId' }).then(list => {
                list.forEach(resource => resourceMap.set(resource.resourceId, resource));
            });
        }
        const testResourceTreeInfos = [];
        for (let testResource of matchedNodeTestResources) {
            const testRuleMatchInfo = testRuleMatchInfos.find(x => x.id === testResource.ruleId);
            const resolveResources = existingTestResourceMap.get(testResource.testResourceId)?.resolveResources;
            testResource.authTree = this.testNodeGenerator.generateTestResourceAuthTree(testResource.dependencyTree, resourceMap);
            testResource.resolveResources = this.getTestResourceResolveResources(testResource.authTree, userInfo, resolveResources, testRuleMatchInfo.presentableInfo);
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
        await this.clearNodeTestResources(nodeId);
        await this.nodeTestResourceProvider.insertMany(matchedNodeTestResources);
        await this.nodeTestResourceTreeProvider.insertMany(testResourceTreeInfos);
        return {
            themeTestRuleMatchInfo: testRuleMatchInfos.find(x => x.ruleInfo.operation === test_node_interface_1.TestNodeOperationEnum.ActivateTheme),
            testRuleMatchInfos: testRuleMatchInfos.map(x => {
                return {
                    ruleId: x.id,
                    isValid: x.isValid,
                    matchErrors: x.matchErrors,
                    matchWarnings: x.matchWarnings,
                    efficientInfos: x.efficientInfos,
                    ruleInfo: x.ruleInfo,
                    associatedPresentableId: x.presentableInfo?.presentableId
                };
            })
        };
    }
    /**
     * 导入展品到测试资源库(排除掉已经操作过的),目前不导入依赖树授权树信息
     * @param nodeId
     * @param userInfo
     * @param excludedPresentableIds
     * @param themeTestRuleMatchInfo
     */
    async saveUnOperantPresentableToTestResources(nodeId, userInfo, excludedPresentableIds, themeTestRuleMatchInfo) {
        let skip = 0;
        const limit = 50;
        const condition = { nodeId, createDate: { $lt: new Date() } };
        if (!(0, lodash_1.isEmpty)(excludedPresentableIds)) {
            condition['_id'] = { $nin: excludedPresentableIds };
        }
        const projection = ['presentableId', 'tags', 'onlineStatus', 'coverImages', 'presentableName', 'presentableTitle', 'resourceInfo', 'version', 'resolveResources'];
        while (true) {
            const presentables = await this.presentableService.find(condition, projection.join(' '), {
                skip, limit, sort: { createDate: -1 }
            });
            if ((0, lodash_1.isEmpty)(presentables)) {
                break;
            }
            const presentableVersionIds = presentables.map(x => this.presentableCommonChecker.generatePresentableVersionId(x.presentableId, x.version));
            const presentableVersionInfos = await this.presentableVersionService.find({ presentableVersionId: { $in: presentableVersionIds } });
            const presentableVersionMap = new Map(presentableVersionInfos.map(x => [x.presentableId, x]));
            const allResourceIds = (0, lodash_1.chain)(presentableVersionInfos).map(x => x.dependencyTree).flatten().map(x => x.resourceId).uniq().value();
            const resourceMap = await this.outsideApiService.getResourceListByIds(allResourceIds, { projection: 'resourceId,userId,resourceVersions' }).then(list => {
                return new Map(list.map(x => [x.resourceId, x]));
            });
            const testResourceTreeInfos = [];
            const testResources = presentables.map(x => this.presentableInfoMapToTestResource(x, presentableVersionMap.get(x.presentableId), resourceMap.get(x.resourceInfo.resourceId), nodeId, userInfo, themeTestRuleMatchInfo));
            for (const testResource of testResources) {
                const testResourceTreeInfo = {
                    nodeId,
                    testResourceId: testResource.testResourceId,
                    testResourceName: testResource.testResourceName,
                    resourceType: testResource.resourceType,
                    authTree: this.convertPresentableAuthTreeToTestResourceAuthTree(presentableVersionMap.get(testResource.associatedPresentableId).authTree, resourceMap),
                    dependencyTree: this.convertPresentableDependencyTreeToTestResourceDependencyTree(testResource.testResourceId, presentableVersionMap.get(testResource.associatedPresentableId).dependencyTree)
                };
                testResource.resolveResources = this.getTestResourceResolveResources(testResourceTreeInfo.authTree, userInfo, null, presentables.find(x => x.presentableId === testResource.associatedPresentableId));
                testResourceTreeInfos.push(testResourceTreeInfo);
            }
            await this.nodeTestResourceProvider.insertMany(testResources);
            await this.nodeTestResourceTreeProvider.insertMany(testResourceTreeInfos);
            skip += 50;
        }
    }
    /**
     * 设置主题
     * @param themeTestRuleMatchInfo
     */
    async setThemeTestResource(themeTestRuleMatchInfo) {
        if (!themeTestRuleMatchInfo || !themeTestRuleMatchInfo.isValid || !themeTestRuleMatchInfo.ruleInfo.candidate) {
            return;
        }
        const updateModel = {
            'stateInfo.themeInfo.isActivatedTheme': 1,
            'stateInfo.themeInfo.ruleId': themeTestRuleMatchInfo.id,
            '$push': { rules: { ruleId: themeTestRuleMatchInfo.id, operations: ['activateTheme'] } }
        };
        await this.nodeTestResourceProvider.updateOne({ testResourceId: themeTestRuleMatchInfo.ruleInfo.candidate.name }, updateModel);
    }
    /**
     * 规则匹配结果转换为测试资源实体
     * @param testRuleMatchInfo
     * @param nodeId
     * @param userInfo
     */
    testRuleMatchInfoMapToTestResource(testRuleMatchInfo, nodeId, userInfo) {
        const { id, testResourceOriginInfo, ruleInfo, onlineStatusInfo, tagInfo, titleInfo, themeInfo, coverInfo, attrInfo, efficientInfos, replaceRecords, matchWarnings, operationAndActionRecords, } = testRuleMatchInfo;
        const testResourceInfo = {
            nodeId, ruleId: id, userId: userInfo.userId,
            associatedPresentableId: testRuleMatchInfo.presentableInfo?.presentableId ?? '',
            resourceType: testResourceOriginInfo.resourceType,
            testResourceId: this.testNodeGenerator.generateTestResourceId(nodeId, testResourceOriginInfo),
            testResourceName: ruleInfo.exhibitName,
            originInfo: testResourceOriginInfo, operationAndActionRecords,
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
                    title: titleInfo?.title ?? testRuleMatchInfo.presentableInfo?.presentableTitle ?? testResourceOriginInfo.name.substring(testResourceOriginInfo.name.indexOf('/') + 1),
                    ruleId: titleInfo?.source ?? 'default'
                },
                coverInfo: {
                    coverImages: coverInfo?.coverImages ?? testResourceOriginInfo.coverImages,
                    ruleId: coverInfo?.source ?? 'default'
                },
                propertyInfo: {
                    testResourceProperty: [...testRuleMatchInfo.propertyMap.values()] ?? [],
                    ruleId: attrInfo?.source ?? 'default'
                },
                themeInfo: {
                    isActivatedTheme: themeInfo?.isActivatedTheme ?? 0,
                    ruleId: themeInfo?.ruleId ?? 'default'
                },
                replaceInfo: {
                    replaceRecords: replaceRecords ?? [],
                    ruleId: (replaceRecords ?? []).length ? id : 'default'
                }
            },
            rules: [{
                    ruleId: id, operations: efficientInfos.map(x => x.type)
                }],
            matchWarnings: matchWarnings ?? [],
            resolveResourceSignStatus: 0,
        };
        testResourceInfo.dependencyTree = this.flattenTestResourceDependencyTree(testResourceInfo.testResourceId, testRuleMatchInfo.entityDependencyTree);
        return testResourceInfo;
    }
    /**
     * 展品信息转换为测试资源实体
     * @param presentableInfo
     * @param presentableVersionInfo
     * @param resourceInfo
     * @param nodeId
     * @param userInfo
     * @param themeTestRuleMatchInfo
     */
    presentableInfoMapToTestResource(presentableInfo, presentableVersionInfo, resourceInfo, nodeId, userInfo, themeTestRuleMatchInfo) {
        // 是否存在有效的激活主题规则
        const hasValidThemeRule = themeTestRuleMatchInfo?.isValid && themeTestRuleMatchInfo?.ruleInfo?.candidate?.name;
        const presentableIsActiveTheme = (0, lodash_1.first)(presentableInfo.resourceInfo.resourceType) === '主题' && presentableInfo.onlineStatus === 1;
        const isMatched = themeTestRuleMatchInfo?.isValid && themeTestRuleMatchInfo?.ruleInfo?.candidate?.name === presentableInfo.resourceInfo.resourceId;
        const testResourceOriginInfo = {
            id: presentableInfo.resourceInfo.resourceId,
            ownerUserId: presentableInfo.resourceInfo.resourceOwnerId,
            name: presentableInfo.resourceInfo.resourceName,
            type: test_node_interface_1.TestResourceOriginType.Resource,
            resourceType: presentableInfo.resourceInfo.resourceType,
            version: presentableInfo.version,
            versions: resourceInfo ? resourceInfo.resourceVersions.map(x => x.version) : [],
            coverImages: resourceInfo?.coverImages ?? []
        };
        const operationAndActionRecords = [];
        if (isMatched) {
            operationAndActionRecords.push({
                type: test_node_interface_1.TestNodeOperationEnum.ActivateTheme, data: {
                    exhibitName: themeTestRuleMatchInfo.ruleInfo.exhibitName
                }
            });
        }
        return {
            nodeId, operationAndActionRecords, userId: userInfo.userId,
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
                    isActivatedTheme: isMatched ? 1 : hasValidThemeRule ? 0 : presentableIsActiveTheme ? 1 : 0,
                    ruleId: isMatched ? themeTestRuleMatchInfo.id : 'default'
                },
                replaceInfo: {
                    replaceRecords: [],
                    ruleId: 'default'
                }
            },
            // resolveResources: presentableInfo.resolveResources as ResolveResourceInfo[],
            resolveResourceSignStatus: presentableInfo.resolveResources.some(x => !x.contracts.length) ? 2 : 1,
            rules: isMatched ? [{ ruleId: themeTestRuleMatchInfo.id, operations: ['activate_theme'] }] : [],
            matchWarnings: []
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
            const { id, name, type, version, versionId, dependencies, resourceType } = dependencyInfo; // replaceRecords
            results.push({
                nid, id, name, type, deep, version, versionId, parentNid, resourceType
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
     * 获取测试资源解决的资源
     * @param authTree
     * @param userInfo
     * @param existingResolveResources
     * @param presentableInfo
     */
    getTestResourceResolveResources(authTree, userInfo, existingResolveResources, presentableInfo) {
        const resolveResourceMap = new Map((existingResolveResources ?? presentableInfo?.resolveResources ?? []).map(x => [x.resourceId, x.contracts]));
        return authTree.filter(x => x.deep === 1).map(m => Object({
            resourceId: m.id,
            resourceName: m.name,
            type: m.type,
            isSelf: m.type === test_node_interface_1.TestResourceOriginType.Object ? true : m.name.startsWith(userInfo.username),
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
            readonlyPropertyMap.set(key, { key, type: 'readonlyText', value, authority: 1, remark: '' });
        }
        for (const resourceCustomProperty of presentableVersionInfo.resourceCustomPropertyDescriptors ?? []) {
            const { key, defaultValue, type, remark } = resourceCustomProperty;
            if (readonlyPropertyMap.has(key)) {
                continue;
            }
            if (type === 'readonlyText') {
                readonlyPropertyMap.set(key, { key, value: defaultValue, type, authority: 1, remark });
            }
            else {
                editablePropertyMap.set(key, {
                    key, value: defaultValue, type,
                    candidateItems: resourceCustomProperty.candidateItems,
                    authority: 2, remark
                });
            }
        }
        for (const { key, value, remark } of presentableVersionInfo.presentableRewriteProperty ?? []) {
            if (readonlyPropertyMap.has(key)) {
                continue;
            }
            const editableProperty = editablePropertyMap.get(key);
            if (!editableProperty) {
                editablePropertyMap.set(key, { key, type: 'editableText', authority: 6, value, remark });
                continue;
            }
            editableProperty.remark = remark;
            if (editableProperty.type === 'select' && !editableProperty.candidateItems?.includes(value)) {
                continue;
            }
            editableProperty.value = value;
        }
        return [...readonlyPropertyMap.values(), ...editablePropertyMap.values()];
    }
    async clearNodeTestResources(nodeId) {
        const tasks = [];
        tasks.push(this.nodeTestResourceProvider.deleteMany({ nodeId }));
        tasks.push(this.nodeTestResourceTreeProvider.deleteMany({ nodeId }));
        return await Promise.all(tasks);
    }
};
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", test_rule_handler_1.TestRuleHandler)
], MatchTestRuleEventHandler.prototype, "testRuleHandler", void 0);
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", Object)
], MatchTestRuleEventHandler.prototype, "testNodeGenerator", void 0);
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", Object)
], MatchTestRuleEventHandler.prototype, "nodeTestRuleProvider", void 0);
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", Object)
], MatchTestRuleEventHandler.prototype, "nodeTestResourceProvider", void 0);
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", Object)
], MatchTestRuleEventHandler.prototype, "nodeTestResourceTreeProvider", void 0);
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", Object)
], MatchTestRuleEventHandler.prototype, "nodeProvider", void 0);
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", Object)
], MatchTestRuleEventHandler.prototype, "presentableService", void 0);
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", Object)
], MatchTestRuleEventHandler.prototype, "outsideApiService", void 0);
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", Object)
], MatchTestRuleEventHandler.prototype, "presentableVersionService", void 0);
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", presentable_common_checker_1.PresentableCommonChecker)
], MatchTestRuleEventHandler.prototype, "presentableCommonChecker", void 0);
MatchTestRuleEventHandler = __decorate([
    (0, midway_1.provide)()
], MatchTestRuleEventHandler);
exports.MatchTestRuleEventHandler = MatchTestRuleEventHandler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWF0Y2gtdGVzdC1ydWxlLWV2ZW50LWhhbmRsZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvZXZlbnQtaGFuZGxlci9tYXRjaC10ZXN0LXJ1bGUtZXZlbnQtaGFuZGxlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7QUFBQSxtQ0FBdUM7QUFDdkMsZ0VBZ0JnQztBQVloQyxtQ0FBb0Q7QUFDcEQsa0NBQWdEO0FBRWhELHFGQUE4RTtBQUM5RSxtRUFBNEQ7QUFHNUQsSUFBYSx5QkFBeUIsR0FBdEMsTUFBYSx5QkFBeUI7SUFHbEMsZUFBZSxDQUFrQjtJQUVqQyxpQkFBaUIsQ0FBQztJQUVsQixvQkFBb0IsQ0FBc0M7SUFFMUQsd0JBQXdCLENBQXNDO0lBRTlELDRCQUE0QixDQUEwQztJQUV0RSxZQUFZLENBQThCO0lBRTFDLGtCQUFrQixDQUFzQjtJQUV4QyxpQkFBaUIsQ0FBcUI7SUFFdEMseUJBQXlCLENBQTZCO0lBRXRELHdCQUF3QixDQUEyQjtJQUVuRDs7Ozs7T0FLRztJQUNILEtBQUssQ0FBQyxNQUFNLENBQUMsTUFBYyxFQUFFLFFBQXlCLEVBQUUsbUJBQTRCLEtBQUs7UUFFckYsTUFBTSxzQkFBc0IsR0FBRyxFQUFFLENBQUM7UUFDbEMsTUFBTSx1QkFBdUIsR0FBMEIsRUFBRSxDQUFDO1FBQzFELE1BQU0sZ0JBQWdCLEdBQUcsTUFBTSxJQUFJLENBQUMsb0JBQW9CLENBQUMsT0FBTyxDQUFDLEVBQUMsTUFBTSxFQUFDLENBQUMsQ0FBQztRQUMzRSxNQUFNLGlCQUFpQixHQUFHLENBQUMsSUFBSSxJQUFJLEVBQUUsQ0FBQyxPQUFPLEVBQUUsR0FBRyxnQkFBZ0IsRUFBRSxVQUFVLENBQUMsT0FBTyxFQUFFLEdBQUcsS0FBSyxDQUFDLENBQUM7UUFDbEcsSUFBSSxDQUFDLGdCQUFnQixJQUFJLGdCQUFnQixDQUFDLE1BQU0sS0FBSyw4QkFBdUIsQ0FBQyxPQUFPLElBQUksaUJBQWlCLEVBQUU7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