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
    TestResourceInfo,
    TestResourceOriginType,
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
} from "../interface";
import {assign, chain, chunk, first, isEmpty, omit} from "lodash";
import {NodeTestRuleMatchStatus} from "../enum";
import {IMongodbOperation} from "egg-freelog-base";
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
     * @param isMandatoryMatch 是否强制匹配
     */
    async handle(nodeId: number, isMandatoryMatch: boolean = false) {

        const operatedPresentableIds = [];
        const allTestRuleMatchResults: TestRuleMatchResult[] = [];
        const nodeTestRuleInfo = await this.nodeTestRuleProvider.findOne({nodeId});
        if (!nodeTestRuleInfo) {
            return;
        }
        // 如果非强制化匹配的,并且上次匹配时间小于1分钟,则直接使用上次匹配结果
        if (!isMandatoryMatch && nodeTestRuleInfo.status === NodeTestRuleMatchStatus.Completed && (new Date().getTime() - nodeTestRuleInfo.matchResultDate.getTime() < 60000)) {
            return;
        }

        try {
            const task1 = this.nodeTestResourceProvider.deleteMany({nodeId});
            const task2 = this.nodeTestResourceTreeProvider.deleteMany({nodeId});
            const task3 = nodeTestRuleInfo.status !== NodeTestRuleMatchStatus.Pending ? this.nodeTestRuleProvider.updateOne({nodeId}, {status: NodeTestRuleMatchStatus.Pending}) : undefined;
            await Promise.all([task1, task2, task3]);

            // 按批次(每50条)匹配规则对应的测试资源,处理完尽早释放掉占用的内存
            for (const testRules of chunk(nodeTestRuleInfo.testRules.map(x => x.ruleInfo), 50)) {
                await this.matchAndSaveTestResourceInfos(testRules, nodeId, nodeTestRuleInfo.userId).then(testRuleMatchResults => {
                    allTestRuleMatchResults.push(...testRuleMatchResults);
                })
            }

            for (const matchResult of allTestRuleMatchResults) {
                const testRuleInfo = nodeTestRuleInfo.testRules.find(x => x.id === matchResult.ruleId) ?? {};
                if (!matchResult.isValid) {
                    testRuleInfo.matchErrors = matchResult.matchErrors;
                } else {
                    testRuleInfo.efficientInfos = matchResult.efficientInfos;
                }
                if (matchResult.associatedPresentableId) {
                    operatedPresentableIds.push(matchResult.associatedPresentableId);
                }
            }

            await this.saveUnOperantPresentableToTestResources(nodeId, nodeTestRuleInfo.userId, operatedPresentableIds);

            const activeThemeRuleInfo = nodeTestRuleInfo.testRules.find(x => x.ruleInfo.operation === TestNodeOperationEnum.ActivateTheme);
            const themeTestResourceInfo = await this.testRuleHandler.matchThemeRule(nodeId, activeThemeRuleInfo);
            
            await this.nodeTestRuleProvider.updateOne({nodeId}, {
                status: NodeTestRuleMatchStatus.Completed,
                testRules: nodeTestRuleInfo.testRules,
                themeId: themeTestResourceInfo?.testResourceId ?? '',
                matchResultDate: new Date()
            });
        } catch (e) {
            console.log('节点测试规则匹配异常', e);
            await this.nodeTestRuleProvider.updateOne({nodeId}, {status: NodeTestRuleMatchStatus.Failed});
        }
    }

    /**
     * 匹配测试资源
     * @param ruleInfos
     * @param nodeId
     * @param userId
     */
    async matchAndSaveTestResourceInfos(ruleInfos: BaseTestRuleInfo[], nodeId: number, userId: number): Promise<TestRuleMatchResult[]> {

        if (isEmpty(ruleInfos)) {
            return;
        }

        const testRuleMatchInfos = await this.testRuleHandler.main(nodeId, ruleInfos);

        const matchedNodeTestResources: TestResourceInfo[] = testRuleMatchInfos.filter(x => x.isValid && [TestNodeOperationEnum.Alter, TestNodeOperationEnum.Add].includes(x.ruleInfo.operation))
            .map(testRuleMatchInfo => this.testRuleMatchInfoMapToTestResource(testRuleMatchInfo, nodeId, userId));

        const resourceMap = new Map<string, ResourceInfo>();
        const existingTestResourceMap = new Map<string, TestResourceInfo>();
        const allResourceIds = chain(matchedNodeTestResources).map(x => x.dependencyTree).flatten().filter(x => x.type === TestResourceOriginType.Resource).map(x => x.id).value();
        for (const resourceIds of chunk(allResourceIds, 200)) {
            await this.outsideApiService.getResourceListByIds(resourceIds, {projection: "resourceId,baseUpcastResources,userId"}).then(list => {
                list.forEach(resource => resourceMap.set(resource.resourceId, resource));
            })
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
            })
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
            }
        });
    }

    /**
     * 导入展品到测试资源库(排除掉已经操作过的),目前不导入依赖树授权树信息
     * @param nodeId
     * @param userId
     * @param excludedPresentableIds
     */
    async saveUnOperantPresentableToTestResources(nodeId: number, userId: number, excludedPresentableIds: string[]): Promise<void> {
        let skip = 0;
        const limit = 50;
        const condition = {nodeId, createDate: {$lt: new Date()}};
        if (!isEmpty(excludedPresentableIds)) {
            condition['_id'] = {$nin: excludedPresentableIds};
        }
        const projection = ['presentableId', 'tag', 'onlineStatus', 'coverImages', 'presentableName', 'presentableTitle', 'resourceInfo', 'version', 'resolveResources'];
        while (true) {
            const presentables = await this.presentableService.find(condition, projection.join(' '), {
                skip, limit, sort: {createDate: -1}
            })
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
    testRuleMatchInfoMapToTestResource(testRuleMatchInfo: TestRuleMatchInfo, nodeId: number, userId: number): TestResourceInfo {

        const {id, testResourceOriginInfo, ruleInfo, onlineStatusInfo, tagInfo, titleInfo, coverInfo, attrInfo, entityDependencyTree} = testRuleMatchInfo;
        const testResourceInfo: TestResourceInfo = {
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
                }
            },
            rules: {
                ruleId: testRuleMatchInfo.id,
                operations: testRuleMatchInfo.efficientInfos.map(x => x.type)
            },
            resolveResourceSignStatus: 0,
        };
        testResourceInfo.dependencyTree = this.flattenTestResourceDependencyTree(testResourceInfo.testResourceId, testRuleMatchInfo.entityDependencyTree);
        testResourceInfo.resolveResources = testResourceInfo.dependencyTree.filter(x => x.userId !== userId && x.deep === 1 && x.type === TestResourceOriginType.Resource).map(x => {
            return {
                resourceId: x.id,
                resourceName: x.name,
                contracts: []
            }
        });
        // 如果根级资源的版本被替换掉了,则整个测试资源的版本重置为被替换之后的版本
        if (testResourceOriginInfo.type === TestResourceOriginType.Resource && !isEmpty(entityDependencyTree)) {
            testResourceInfo.originInfo.version = first(entityDependencyTree).version;
        }
        return testResourceInfo;
    }

    /**
     * 获取测试资源的meta属性
     * @param testRuleMatchInfo
     */
    getTestResourceProperty(testRuleMatchInfo: TestRuleMatchInfo) {
        const resourceCustomReadonlyInfo: any = {};
        const resourceCustomEditableInfo: any = {};
        const presentableRewriteInfo: any = {};
        const testRuleRewriteInfo: any = {};
        testRuleMatchInfo.testResourceOriginInfo.customPropertyDescriptors?.forEach(({key, defaultValue, type}) => {
            if (type === 'readonlyText') {
                resourceCustomReadonlyInfo[key] = defaultValue;
            } else {
                resourceCustomEditableInfo[key] = defaultValue;
            }
        });
        testRuleMatchInfo.presentableRewriteProperty?.forEach(({key, value}) => {
            presentableRewriteInfo[key] = value;
        });
        testRuleMatchInfo.ruleInfo.attrs?.forEach(({key, operation, value}) => {
            if (operation === 'add') {
                testRuleRewriteInfo[key] = value;
            }
        });
        // 属性优先级为: 1.系统属性 2:资源定义的不可编辑的属性 3:展品重写的属性 4:资源自定义的可编辑属性
        const testResourceProperty = assign(resourceCustomEditableInfo, presentableRewriteInfo, resourceCustomReadonlyInfo, testRuleMatchInfo.testResourceOriginInfo.systemProperty);
        const omitKeys = testRuleMatchInfo.ruleInfo.attrs?.filter(x => x.operation === 'delete').map(x => x.key);

        return omit(testResourceProperty, omitKeys);
    }

    /**
     * 展品信息转换为测试资源实体
     * @param presentableInfo
     * @param resourceInfo
     * @param nodeId
     * @param userId
     */
    presentableInfoMapToTestResource(presentableInfo: PresentableInfo, resourceInfo: ResourceInfo, nodeId: number, userId: number): TestResourceInfo {
        const testResourceOriginInfo = {
            id: presentableInfo.resourceInfo.resourceId,
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
                    testResourceProperty: [],
                    ruleId: 'default'
                },
                themeInfo: {
                    isActivatedTheme: 0,
                    ruleId: 'default'
                }
            },
            resolveResources: presentableInfo.resolveResources as ResolveResourceInfo[],
            resolveResourceSignStatus: presentableInfo.resolveResources.some(x => !x.contracts.length) ? 2 : 1,
            rules: {
                ruleId: '', operations: []
            }
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
            const {id, fileSha1, name, type, version, versionId, dependencies, resourceType, replaced} = dependencyInfo;
            results.push({fileSha1, nid, id, name, type, deep, version, versionId, parentNid, resourceType, replaced});
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
            }
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
            }
        });
    }

    /**
     * 平铺的授权树
     * @param authTree
     * @param userId
     * @param existingResolveResources
     * @param presentableInfo
     */
    getTestResourceResolveResources(authTree: FlattenTestResourceAuthTree[], userId: number, existingResolveResources?: ResolveResourceInfo[], presentableInfo?: PresentableInfo) {
        // 自己的资源无需授权,自己的object也无需授权(只能测试自己的object).
        const resolveResourceMap = new Map((existingResolveResources ?? presentableInfo?.resolveResources ?? []).map(x => [x.resourceId, x.contracts]));
        return authTree.filter(x => x.deep === 1 && x.type === TestResourceOriginType.Resource && x.userId !== userId).map(m => Object({
            resourceId: m.id,
            resourceName: m.name,
            contracts: resolveResourceMap.get(m.id) ?? []
        }));
    }
}
