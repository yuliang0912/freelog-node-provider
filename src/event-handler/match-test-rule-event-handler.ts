import {inject, provide} from 'midway';
import {
    BaseTestRuleInfo,
    FlattenTestResourceAuthTree,
    FlattenTestResourceDependencyTree,
    IMatchTestRuleEventHandler,
    NodeTestRuleInfo,
    ResolveResourceInfo,
    TestNodeOperationEnum,
    TestResourceDependencyTree,
    TestResourceInfo, TestResourceOriginInfo,
    TestResourceOriginType, TestResourcePropertyInfo,
    TestResourceTreeInfo,
    TestRuleMatchInfo,
    TestRuleMatchResult
} from '../test-node-interface';
import {
    FlattenPresentableAuthTree,
    FlattenPresentableDependencyTree,
    IOutsideApiService,
    IPresentableService,
    IPresentableVersionService, NodeInfo,
    PresentableInfo,
    PresentableVersionInfo,
    ResourceInfo
} from '../interface';
import {chain, chunk, isEmpty} from 'lodash';
import {NodeTestRuleMatchStatus} from '../enum';
import {FreelogUserInfo, IMongodbOperation, ResourceTypeEnum} from 'egg-freelog-base';
import {PresentableCommonChecker} from '../extend/presentable-common-checker';
import {TestRuleHandler} from '../extend/test-rule-handler';

@provide()
export class MatchTestRuleEventHandler implements IMatchTestRuleEventHandler {

    @inject()
    testRuleHandler: TestRuleHandler;
    @inject()
    testNodeGenerator;
    @inject()
    nodeTestRuleProvider: IMongodbOperation<NodeTestRuleInfo>;
    @inject()
    nodeTestResourceProvider: IMongodbOperation<TestResourceInfo>;
    @inject()
    nodeTestResourceTreeProvider: IMongodbOperation<TestResourceTreeInfo>;
    @inject()
    nodeProvider: IMongodbOperation<NodeInfo>;
    @inject()
    presentableService: IPresentableService;
    @inject()
    outsideApiService: IOutsideApiService;
    @inject()
    presentableVersionService: IPresentableVersionService;
    @inject()
    presentableCommonChecker: PresentableCommonChecker;

    /**
     * 开始规则测试匹配事件
     * @param nodeId
     * @param userInfo
     * @param isMandatoryMatch 是否强制匹配
     */
    async handle(nodeId: number, userInfo: FreelogUserInfo, isMandatoryMatch: boolean = false) {

        const operatedPresentableIds = [];
        const allTestRuleMatchResults: TestRuleMatchResult[] = [];
        const nodeTestRuleInfo = await this.nodeTestRuleProvider.findOne({nodeId});
        const isLessThan1Minute = (new Date().getTime() - nodeTestRuleInfo?.updateDate.getTime() < 60000);
        if (!nodeTestRuleInfo || nodeTestRuleInfo.status === NodeTestRuleMatchStatus.Pending && isLessThan1Minute) {
            return;
        }
        // 如果非强制化匹配的,并且上次匹配时间小于1分钟,则直接使用上次匹配结果
        if (!isMandatoryMatch && nodeTestRuleInfo.status === NodeTestRuleMatchStatus.Completed && isLessThan1Minute) {
            return;
        }
        try {
            const tasks = [];
            if (nodeTestRuleInfo.status !== NodeTestRuleMatchStatus.Pending) {
                tasks.push(this.nodeTestRuleProvider.updateOne({nodeId}, {
                    status: NodeTestRuleMatchStatus.Pending, matchErrorMsg: ''
                }));
            }
            tasks.push(this.nodeTestResourceProvider.deleteMany({nodeId}));
            tasks.push(this.nodeTestResourceTreeProvider.deleteMany({nodeId}));
            await Promise.all(tasks);

            // 按批次(每50条)匹配规则对应的测试资源,处理完尽早释放掉占用的内存
            let themeTestRuleMatchInfo: TestRuleMatchInfo = null;
            for (const testRules of chunk(nodeTestRuleInfo.testRules.map(x => x.ruleInfo), 200)) {
                await this.matchAndSaveTestResourceInfos(testRules, nodeId, userInfo).then(testRuleMatchResult => {
                    if (testRuleMatchResult.themeTestRuleMatchInfo) {
                        themeTestRuleMatchInfo = testRuleMatchResult.themeTestRuleMatchInfo;
                    }
                    allTestRuleMatchResults.push(...testRuleMatchResult.testRuleMatchInfos);
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
            await this.saveUnOperantPresentableToTestResources(nodeId, nodeTestRuleInfo.userId, operatedPresentableIds, themeTestRuleMatchInfo);

            let themeTestResourceId = themeTestRuleMatchInfo?.ruleInfo?.candidate ? this.testNodeGenerator.generateTestResourceId(nodeId, {
                id: themeTestRuleMatchInfo.ruleInfo.candidate.name, type: themeTestRuleMatchInfo.ruleInfo.candidate.type
            } as TestResourceOriginInfo) : '';

            if (!themeTestResourceId) {
                const themeTestResource = await this.nodeTestResourceProvider.findOne({
                    nodeId, 'stateInfo.themeInfo.isActivatedTheme': 1
                }, 'testResourceId');
                if (themeTestResource) {
                    themeTestResourceId = themeTestResource.testResourceId;
                }
            }

            await this.nodeTestRuleProvider.updateOne({nodeId}, {
                status: NodeTestRuleMatchStatus.Completed,
                testRules: nodeTestRuleInfo.testRules,
                themeId: themeTestResourceId,
                matchResultDate: new Date()
            });
            await this.nodeProvider.updateOne({nodeId}, {
                nodeTestThemeId: themeTestResourceId
            });
        } catch (e) {
            console.log('节点测试规则匹配异常', e);
            await this.nodeTestRuleProvider.updateOne({nodeId}, {
                status: NodeTestRuleMatchStatus.Failed, matchErrorMsg: e.toString()
            });
        }
    }

    /**
     * 匹配测试资源
     * @param ruleInfos
     * @param nodeId
     * @param userInfo
     */
    async matchAndSaveTestResourceInfos(ruleInfos: BaseTestRuleInfo[], nodeId: number, userInfo: FreelogUserInfo,): Promise<{ themeTestRuleMatchInfo: TestRuleMatchInfo, testRuleMatchInfos: TestRuleMatchResult[] }> {

        if (isEmpty(ruleInfos)) {
            return;
        }

        const testRuleMatchInfos = await this.testRuleHandler.main(nodeId, ruleInfos);
        const matchedNodeTestResources = chain(testRuleMatchInfos).filter(x => x.isValid && [TestNodeOperationEnum.Alter, TestNodeOperationEnum.Add].includes(x.ruleInfo.operation))
            .map(testRuleMatchInfo => this.testRuleMatchInfoMapToTestResource(testRuleMatchInfo, nodeId, userInfo)).uniqBy(data => data.testResourceId).value();

        const resourceMap = new Map<string, ResourceInfo>();
        const existingTestResourceMap = new Map<string, TestResourceInfo>();
        const allResourceIds = chain(matchedNodeTestResources).map(x => x.dependencyTree).flatten().filter(x => x.type === TestResourceOriginType.Resource).map(x => x.id).value();
        for (const resourceIds of chunk(allResourceIds, 200)) {
            await this.outsideApiService.getResourceListByIds(resourceIds, {projection: 'resourceId,baseUpcastResources,userId'}).then(list => {
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

        await this.nodeTestResourceProvider.insertMany(matchedNodeTestResources);
        await this.nodeTestResourceTreeProvider.insertMany(testResourceTreeInfos);

        return {
            themeTestRuleMatchInfo: testRuleMatchInfos.find(x => x.ruleInfo.operation === TestNodeOperationEnum.ActivateTheme),
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
     * @param userId
     * @param excludedPresentableIds
     * @param themeTestRuleMatchInfo
     */
    async saveUnOperantPresentableToTestResources(nodeId: number, userId: number, excludedPresentableIds: string[], themeTestRuleMatchInfo: TestRuleMatchInfo): Promise<void> {
        let skip = 0;
        const limit = 50;
        const condition = {nodeId, createDate: {$lt: new Date()}};
        if (!isEmpty(excludedPresentableIds)) {
            condition['_id'] = {$nin: excludedPresentableIds};
        }
        const projection = ['presentableId', 'tags', 'onlineStatus', 'coverImages', 'presentableName', 'presentableTitle', 'resourceInfo', 'version', 'resolveResources'];
        while (true) {
            const presentables = await this.presentableService.find(condition, projection.join(' '), {
                skip, limit, sort: {createDate: -1}
            });
            if (isEmpty(presentables)) {
                break;
            }
            const presentableVersionIds = presentables.map(x => this.presentableCommonChecker.generatePresentableVersionId(x.presentableId, x.version));
            const presentableVersionInfos = await this.presentableVersionService.find({presentableVersionId: {$in: presentableVersionIds}});
            const presentableVersionMap: Map<string, PresentableVersionInfo> = new Map(presentableVersionInfos.map(x => [x.presentableId, x]));
            const allResourceIds = chain(presentableVersionInfos).map(x => x.dependencyTree).flatten().map(x => x.resourceId).uniq().value();
            const resourceMap: Map<string, ResourceInfo> = await this.outsideApiService.getResourceListByIds(allResourceIds, {projection: 'resourceId,userId,resourceVersions'}).then(list => {
                return new Map(list.map(x => [x.resourceId, x]));
            });

            const testResourceTreeInfos = [];
            const testResources = presentables.map(x => this.presentableInfoMapToTestResource(x, presentableVersionMap.get(x.presentableId), resourceMap.get(x.resourceInfo.resourceId), nodeId, userId, themeTestRuleMatchInfo));
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
     * @param themeTestRuleMatchInfo
     */
    async setThemeTestResource(themeTestRuleMatchInfo: TestRuleMatchInfo) {

        if (!themeTestRuleMatchInfo || !themeTestRuleMatchInfo.isValid || !themeTestRuleMatchInfo.ruleInfo.candidate) {
            return;
        }

        const updateModel = {
            'stateInfo.themeInfo.isActivatedTheme': 1,
            'stateInfo.themeInfo.ruleId': themeTestRuleMatchInfo.id,
            '$push': {rules: {ruleId: themeTestRuleMatchInfo.id, operations: ['activateTheme']}}
        };
        await this.nodeTestResourceProvider.updateOne({testResourceId: themeTestRuleMatchInfo.ruleInfo.candidate.name}, updateModel);
    }

    /**
     * 规则匹配结果转换为测试资源实体
     * @param testRuleMatchInfo
     * @param nodeId
     * @param userInfo
     */
    testRuleMatchInfoMapToTestResource(testRuleMatchInfo: TestRuleMatchInfo, nodeId: number, userInfo: FreelogUserInfo): TestResourceInfo {

        const {id, testResourceOriginInfo, ruleInfo, onlineStatusInfo, tagInfo, titleInfo, themeInfo, coverInfo, attrInfo, efficientInfos, replaceRecords} = testRuleMatchInfo;
        const testResourceInfo: TestResourceInfo = {
            nodeId, ruleId: id, userId: userInfo.userId,
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
                    title: titleInfo?.title ?? testRuleMatchInfo.presentableInfo?.presentableTitle ?? testResourceOriginInfo.name,
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
        testResourceInfo.resolveResources = testResourceInfo.dependencyTree.filter(x => x.deep === 1 && x.type === TestResourceOriginType.Resource && !x.name.startsWith(`${userInfo.username}/`)).map(x => {
            return {
                resourceId: x.id,
                resourceName: x.name,
                contracts: []
            };
        });
        return testResourceInfo;
    }

    /**
     * 展品信息转换为测试资源实体
     * @param presentableInfo
     * @param presentableVersionInfo
     * @param resourceInfo
     * @param nodeId
     * @param userId
     * @param themeTestRuleMatchInfo
     */
    presentableInfoMapToTestResource(presentableInfo: PresentableInfo, presentableVersionInfo: PresentableVersionInfo, resourceInfo: ResourceInfo, nodeId: number, userId: number, themeTestRuleMatchInfo: TestRuleMatchInfo): TestResourceInfo {

        // 是否存在有效的激活主题规则
        const hasValidThemeRule = themeTestRuleMatchInfo?.isValid && themeTestRuleMatchInfo?.ruleInfo?.candidate?.name;
        const presentableIsActiveTheme = presentableInfo.resourceInfo.resourceType === ResourceTypeEnum.THEME && presentableInfo.onlineStatus === 1;
        const isMatched = themeTestRuleMatchInfo?.isValid && themeTestRuleMatchInfo?.ruleInfo?.candidate?.name === presentableInfo.resourceInfo.resourceId;

        const testResourceOriginInfo = {
            id: presentableInfo.resourceInfo.resourceId,
            ownerUserId: presentableInfo.resourceInfo.resourceOwnerId,
            name: presentableInfo.resourceInfo.resourceName,
            type: TestResourceOriginType.Resource,
            resourceType: presentableInfo.resourceInfo.resourceType,
            version: presentableInfo.version,
            versions: resourceInfo ? resourceInfo.resourceVersions.map(x => x.version) : [], // 容错处理
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
                    isActivatedTheme: isMatched ? 1 : hasValidThemeRule ? 0 : presentableIsActiveTheme ? 1 : 0,
                    ruleId: isMatched ? themeTestRuleMatchInfo.id : 'default'
                },
                replaceInfo: {
                    replaceRecords: [],
                    ruleId: 'default'
                }
            },
            resolveResources: presentableInfo.resolveResources as ResolveResourceInfo[],
            resolveResourceSignStatus: presentableInfo.resolveResources.some(x => !x.contracts.length) ? 2 : 1,
            rules: isMatched ? [{ruleId: themeTestRuleMatchInfo.id, operations: ['activate_theme']}] : []
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
    flattenTestResourceDependencyTree(testResourceId: string, dependencyTree: TestResourceDependencyTree[], parentNid: string = '', results: FlattenTestResourceDependencyTree[] = [], deep: number = 1): FlattenTestResourceDependencyTree[] {
        for (const dependencyInfo of dependencyTree) {
            const nid = this.testNodeGenerator.generateDependencyNodeId(deep === 1 ? testResourceId : null);
            const {id, name, type, version, versionId, dependencies, resourceType} = dependencyInfo; // replaceRecords
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
    convertPresentableDependencyTreeToTestResourceDependencyTree(testResourceId: string, flattenTestResourceDependencyTree: FlattenPresentableDependencyTree[]): FlattenTestResourceDependencyTree[] {
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
                type: TestResourceOriginType.Resource,
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
    convertPresentableAuthTreeToTestResourceAuthTree(flattenAuthTree: FlattenPresentableAuthTree[], resourceMap: Map<string, ResourceInfo>): FlattenTestResourceAuthTree[] {
        return flattenAuthTree.map(item => {
            return {
                nid: item.nid,
                id: item.resourceId,
                name: item.resourceName,
                type: TestResourceOriginType.Resource,
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
     * @param userInfo
     * @param existingResolveResources
     * @param presentableInfo
     */
    getTestResourceResolveResources(authTree: FlattenTestResourceAuthTree[], userInfo: FreelogUserInfo, existingResolveResources?: ResolveResourceInfo[], presentableInfo?: PresentableInfo) {
        // 自己的资源无需授权,自己的object也无需授权(只能测试自己的object).
        const resolveResourceMap = new Map((existingResolveResources ?? presentableInfo?.resolveResources ?? []).map(x => [x.resourceId, x.contracts]));
        return authTree.filter(x => x.deep === 1 && x.type === TestResourceOriginType.Resource && !x.name.startsWith(`${userInfo.username}/`)).map(m => Object({
            resourceId: m.id,
            resourceName: m.name,
            contracts: resolveResourceMap.get(m.id) ?? []
        }));
    }

    /**
     * 展品版本信息
     * @param presentableVersionInfo
     */
    getPresentablePropertyInfo(presentableVersionInfo: PresentableVersionInfo) {
        const readonlyPropertyMap = new Map<string, TestResourcePropertyInfo>();
        const editablePropertyMap = new Map<string, TestResourcePropertyInfo>();

        // 以下4个for循环需要严格遵守顺序.属性的优先级分别为1.系统属性 2:资源定义的不可编辑的属性 3:测试规则规定的属性 4:展品重写的属性 5:资源自定义的可编辑属性.
        for (const [key, value] of Object.entries(presentableVersionInfo.resourceSystemProperty ?? {})) {
            readonlyPropertyMap.set(key, {key, value, authority: 1, remark: ''});
        }
        for (const {key, defaultValue, remark, type} of presentableVersionInfo.resourceCustomPropertyDescriptors ?? []) {
            if (readonlyPropertyMap.has(key)) {
                continue;
            }
            if (type === 'readonlyText') {
                readonlyPropertyMap.set(key, {key, value: defaultValue, authority: 1, remark});
            } else {
                editablePropertyMap.set(key, {key, value: defaultValue, authority: 2, remark});
            }
        }
        for (const {key, value, remark} of presentableVersionInfo.presentableRewriteProperty ?? []) {
            if (readonlyPropertyMap.has(key)) {
                continue;
            }
            editablePropertyMap.set(key, {key, authority: 6, value, remark});
        }
        return [...readonlyPropertyMap.values(), ...editablePropertyMap.values()];
    }
}
