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
                testRules: nodeTestRuleInfo.testRules,
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
                    efficientInfos: x.efficientInfos,
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
        const { id, testResourceOriginInfo, ruleInfo, onlineStatusInfo, tagInfo, titleInfo, themeInfo, coverInfo, attrInfo, efficientInfos, replaceRecords, operationAndActionRecords } = testRuleMatchInfo;
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
            resolveResourceSignStatus: 0,
        };
        testResourceInfo.dependencyTree = this.flattenTestResourceDependencyTree(testResourceInfo.testResourceId, testRuleMatchInfo.entityDependencyTree);
        // 有单独的处理函数专用处理解决的资源.因为需要保留上一次的.还需要考虑自己的.
        // testResourceInfo.resolveResources = testResourceInfo.dependencyTree.filter(x => x.deep === 1 && x.type === TestResourceOriginType.Resource && !x.name.startsWith(`${userInfo.username}/`)).map(x => {
        //     return {
        //         resourceId: x.id,
        //         resourceName: x.name,
        //         contracts: []
        //     };
        // });
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
        const presentableIsActiveTheme = presentableInfo.resourceInfo.resourceType === egg_freelog_base_1.ResourceTypeEnum.THEME && presentableInfo.onlineStatus === 1;
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
        return {
            nodeId, userId: userInfo.userId,
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
            rules: isMatched ? [{ ruleId: themeTestRuleMatchInfo.id, operations: ['activate_theme'] }] : []
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWF0Y2gtdGVzdC1ydWxlLWV2ZW50LWhhbmRsZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvZXZlbnQtaGFuZGxlci9tYXRjaC10ZXN0LXJ1bGUtZXZlbnQtaGFuZGxlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7QUFBQSxtQ0FBdUM7QUFDdkMsZ0VBZ0JnQztBQVloQyxtQ0FBNkM7QUFDN0Msa0NBQWdEO0FBQ2hELHVEQUFzRjtBQUN0RixxRkFBOEU7QUFDOUUsbUVBQTREO0FBRzVELElBQWEseUJBQXlCLEdBQXRDLE1BQWEseUJBQXlCO0lBR2xDLGVBQWUsQ0FBa0I7SUFFakMsaUJBQWlCLENBQUM7SUFFbEIsb0JBQW9CLENBQXNDO0lBRTFELHdCQUF3QixDQUFzQztJQUU5RCw0QkFBNEIsQ0FBMEM7SUFFdEUsWUFBWSxDQUE4QjtJQUUxQyxrQkFBa0IsQ0FBc0I7SUFFeEMsaUJBQWlCLENBQXFCO0lBRXRDLHlCQUF5QixDQUE2QjtJQUV0RCx3QkFBd0IsQ0FBMkI7SUFFbkQ7Ozs7O09BS0c7SUFDSCxLQUFLLENBQUMsTUFBTSxDQUFDLE1BQWMsRUFBRSxRQUF5QixFQUFFLG1CQUE0QixLQUFLO1FBRXJGLE1BQU0sc0JBQXNCLEdBQUcsRUFBRSxDQUFDO1FBQ2xDLE1BQU0sdUJBQXVCLEdBQTBCLEVBQUUsQ0FBQztRQUMxRCxNQUFNLGdCQUFnQixHQUFHLE1BQU0sSUFBSSxDQUFDLG9CQUFvQixDQUFDLE9BQU8sQ0FBQyxFQUFDLE1BQU0sRUFBQyxDQUFDLENBQUM7UUFDM0UsTUFBTSxpQkFBaUIsR0FBRyxDQUFDLElBQUksSUFBSSxFQUFFLENBQUMsT0FBTyxFQUFFLEdBQUcsZ0JBQWdCLEVBQUUsVUFBVSxDQUFDLE9BQU8sRUFBRSxHQUFHLEtBQUssQ0FBQyxDQUFDO1FBQ2xHLElBQUksQ0FBQyxnQkFBZ0IsSUFBSSxnQkFBZ0IsQ0FBQyxNQUFNLEtBQUssOEJBQXVCLENBQUMsT0FBTyxJQUFJ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