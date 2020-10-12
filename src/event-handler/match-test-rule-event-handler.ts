import {inject, provide} from 'midway';
import {
    BaseTestRuleInfo,
    FlattenTestResourceDependencyTree,
    FlattenTestResourceAuthTree,
    IMatchTestRuleEventHandler,
    NodeTestRuleInfo,
    ResolveResourceInfo,
    TestNodeOperationEnum,
    TestResourceDependencyTree,
    TestResourceInfo,
    TestResourceOriginType,
    TestRuleMatchInfo,
    TestRuleMatchResult
} from '../test-node-interface';
import {
    FlattenPresentableAuthTree,
    FlattenPresentableDependencyTree,
    IOutsideApiService,
    IPresentableService,
    IPresentableVersionService,
    PresentableInfo, PresentableVersionInfo,
    ResourceInfo
} from "../interface";
import {chain, chunk, first, isEmpty} from "lodash";
import {NodeTestRuleMatchStatus} from "../enum";

@provide()
export class MatchTestRuleEventHandler implements IMatchTestRuleEventHandler {

    @inject()
    testRuleHandler;
    @inject()
    testNodeGenerator;
    @inject()
    nodeTestRuleProvider;
    @inject()
    nodeTestResourceProvider;
    @inject()
    nodeTestResourceTreeProvider;
    @inject()
    presentableService: IPresentableService;
    @inject()
    outsideApiService: IOutsideApiService;
    @inject()
    presentableVersionService: IPresentableVersionService;
    @inject()
    presentableCommonChecker;

    /**
     * 开始规则测试匹配事件
     * @param nodeTestRuleInfo
     */
    async handle(nodeId: number) {

        const operatedPresentableIds = [];
        let allTestRuleMatchResults: TestRuleMatchResult[] = [];
        const nodeTestRuleInfo: NodeTestRuleInfo = await this.nodeTestRuleProvider.findOne({nodeId});
        if (!nodeTestRuleInfo || nodeTestRuleInfo.status !== NodeTestRuleMatchStatus.Pending) {
            return;
        }

        try {
            const task1 = this.nodeTestResourceProvider.deleteMany({nodeId: nodeTestRuleInfo.nodeId});
            const task2 = this.nodeTestResourceTreeProvider.deleteMany({nodeId: nodeTestRuleInfo.nodeId});
            await Promise.all([task1, task2]);

            // 按批次(每50条)匹配规则对应的测试资源,处理完尽早释放掉占用的内存
            for (const testRules of chunk(nodeTestRuleInfo.testRules.map(x => x.ruleInfo), 50)) {
                await this.matchAndSaveTestResourceInfos(testRules, nodeId, nodeTestRuleInfo.userId).then(testRuleMatchResults => {
                    allTestRuleMatchResults = [...allTestRuleMatchResults, ...testRuleMatchResults];
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
            await this.nodeTestRuleProvider.updateOne({nodeId}, {
                status: NodeTestRuleMatchStatus.Completed, testRules: nodeTestRuleInfo.testRules
            });
        } catch (e) {
            console.log(e);
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

        const testRuleMatchInfos: TestRuleMatchInfo[] = await this.testRuleHandler.main(nodeId, ruleInfos);

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
        let page = 1;
        const pageSize = 50;
        const condition = {nodeId, createDate: {$lt: new Date()}};
        if (!isEmpty(excludedPresentableIds)) {
            condition['_id'] = {$nin: excludedPresentableIds};
        }
        const projection = ['presentableId', 'tag', 'onlineStatus', 'coverImages', 'presentableName', 'resourceInfo', 'version', 'resolveResources'];
        while (true) {
            const presentables = await this.presentableService.findList(condition, page++, pageSize, projection, {createDate: -1});
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
                })
            }
            await this.nodeTestResourceProvider.insertMany(testResources);
            await this.nodeTestResourceTreeProvider.insertMany(testResourceTreeInfos);
        }
    }

    /**
     * 规则匹配结果转换为测试资源实体
     * @param testRuleMatchInfo
     * @param nodeId
     * @param userId
     */
    testRuleMatchInfoMapToTestResource(testRuleMatchInfo: TestRuleMatchInfo, nodeId: number, userId: number): TestResourceInfo {

        const {id, testResourceOriginInfo, ruleInfo, onlineStatus, tags, entityDependencyTree} = testRuleMatchInfo;
        const testResourceInfo: TestResourceInfo = {
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
        testResourceInfo.dependencyTree = this.FlattenTestResourceDependencyTree(testResourceInfo.testResourceId, testRuleMatchInfo.entityDependencyTree);
        testResourceInfo.resolveResources = testResourceInfo.dependencyTree.filter(x => x.userId !== userId && x.deep === 1 && x.type === TestResourceOriginType.Resource).map(x => {
            return {
                resourceId: x.id,
                resourceName: x.name,
                contracts: []
            }
        })
        // 如果根级资源的版本被替换掉了,则整个测试资源的版本重置为被替换之后的版本
        if (testResourceOriginInfo.type === TestResourceOriginType.Resource && !isEmpty(entityDependencyTree)) {
            testResourceInfo.originInfo.version = first(entityDependencyTree).version;
        }
        return testResourceInfo;
    }

    /**
     * 展品信息转换为测试资源实体
     * @param presentableInfo
     * @param resourceInfo
     * @param nodeId
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
        const testResourceInfo: TestResourceInfo = {
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
            resolveResources: presentableInfo.resolveResources as ResolveResourceInfo[]
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
    FlattenTestResourceDependencyTree(testResourceId: string, dependencyTree: TestResourceDependencyTree[], parentNid: string = '', results: FlattenTestResourceDependencyTree[] = [], deep: number = 1): FlattenTestResourceDependencyTree[] {
        for (const dependencyInfo of dependencyTree) {
            const nid = this.testNodeGenerator.generateDependencyNodeId(deep === 1 ? testResourceId : null);
            const {id, fileSha1, name, type, version, versionId, dependencies, resourceType, replaced} = dependencyInfo;
            results.push({fileSha1, nid, id, name, type, deep, version, versionId, parentNid, resourceType, replaced});
            this.FlattenTestResourceDependencyTree(testResourceId, dependencies ?? [], nid, results, deep + 1);
        }
        return results;
    }

    /**
     * 展品依赖树转换成测试资源依赖树
     * @param testResourceId
     * @param FlattenTestResourceDependencyTree
     */
    convertPresentableDependencyTreeToTestResourceDependencyTree(testResourceId: string, FlattenTestResourceDependencyTree: FlattenPresentableDependencyTree[]): FlattenTestResourceDependencyTree[] {
        const nid = this.testNodeGenerator.generateDependencyNodeId(testResourceId);
        for (const dependencyInfo of FlattenTestResourceDependencyTree) {
            if (dependencyInfo.deep === 2) {
                dependencyInfo.parentNid = nid;
            }
        }
        FlattenTestResourceDependencyTree.find(x => x.deep === 1).nid = nid;

        return FlattenTestResourceDependencyTree.map(item => {
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
     *
     * @param authTree 平铺的授权树
     * @param existingResolveResources 之前已经解决过的记录
     * @param presentableInfo 展品信息
     * @private
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