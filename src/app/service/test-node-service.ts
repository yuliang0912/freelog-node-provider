import {isEmpty, first} from 'lodash';
import {provide, inject} from 'midway';
// import {ApplicationError} from 'egg-freelog-base';
import {
    BaseTestRuleInfo, TestNodeOperationEnum, TestResourceDependencyTree,
    TestResourceInfo, TestResourceOriginInfo,
    TestResourceOriginType, TestRuleMatchInfo
} from "../../test-node-interface";
import {md5} from 'egg-freelog-base/app/extend/helper/crypto_helper';
import {IOutsideApiService, IPresentableService, PresentableInfo, ResourceInfo} from "../../interface";

@provide()
export class TestNodeService {

    @inject()
    ctx;
    @inject()
    nodeProvider;
    @inject()
    testRuleHandler;
    @inject()
    presentableService: IPresentableService;
    @inject()
    outsideApiService: IOutsideApiService;

    /**
     * 匹配规则并且保存结果
     * @param nodeId
     * @param testRuleText
     */
    async matchAndSaveNodeTestRule(nodeId: number, testRuleText: string): Promise<TestResourceInfo[]> {

        const testRuleMatchInfos = await this._compileAndMatchTestRule(nodeId, testRuleText);

        const matchedNodeTestResources = testRuleMatchInfos.filter(x => x.isValid && ['alter', 'add'].includes(x.ruleInfo.operation))
            .map(testRuleMatchInfo => this._testRuleMatchInfoMapToTestResource(testRuleMatchInfo, nodeId));
        const unOperantNodeTestResources = await this.getUnOperantPresentables(nodeId, testRuleMatchInfos);

        return [...matchedNodeTestResources, ...unOperantNodeTestResources];
    }

    /**
     * 获取未操作的展品
     * @param nodeId
     * @param testRuleMatchInfos
     */
    async getUnOperantPresentables(nodeId: number, testRuleMatchInfos: TestRuleMatchInfo[]): Promise<TestResourceInfo[]> {
        const existingPresentableIds = testRuleMatchInfos.filter(x => x.isValid && x.ruleInfo.operation == TestNodeOperationEnum.Alter && x.presentableInfo).map(x => x.presentableInfo.presentableId);
        const unOperantPresentables = await this.presentableService.find({nodeId, _id: {$nin: existingPresentableIds}});
        const resourceMap: Map<string, ResourceInfo> = await this.outsideApiService.getResourceListByIds(unOperantPresentables.map(x => x.resourceInfo.resourceId), {projection: 'resourceId,coverImages,resourceVersions,intro'}).then(list => {
            return new Map(list.map(x => [x.resourceId, x]));
        });
        return unOperantPresentables.map(presentable => this._presentableInfoMapToTestResource(presentable, resourceMap.get(presentable.resourceInfo.resourceId), nodeId));
    }

    /**
     * 规则匹配结果转换为测试资源实体
     * @param testRuleMatchInfo
     * @param nodeId
     */
    _testRuleMatchInfoMapToTestResource(testRuleMatchInfo: TestRuleMatchInfo, nodeId: number): TestResourceInfo {

        const {id, testResourceOriginInfo, ruleInfo, onlineStatus, tags, entityDependencyTree} = testRuleMatchInfo;
        const testResourceInfo: TestResourceInfo = {
            nodeId,
            ruleId: id,
            userId: this.ctx.userId,
            intro: testResourceOriginInfo.intro ?? '',
            associatedPresentableId: testRuleMatchInfo.presentableInfo?.presentableId ?? '',
            resourceType: testResourceOriginInfo.resourceType,
            testResourceId: this._generateTestResourceId(nodeId, testResourceOriginInfo),
            testResourceName: ruleInfo.presentableName,
            coverImages: testResourceOriginInfo.coverImages ?? [],
            originInfo: testResourceOriginInfo,
            differenceInfo: {
                onlineStatusInfo: {
                    isOnline: onlineStatus?.status ?? 0,
                    ruleId: onlineStatus?.source ?? 'default'
                },
                userDefinedTagInfo: {
                    tags: tags?.tags ?? [],
                    ruleId: tags?.source ?? 'default'
                }
            }
        };
        // 如果根级资源的版本被替换掉了,则整个测试资源的版本重置为被替换之后的版本
        if (testResourceOriginInfo.type === TestResourceOriginType.Resource && !isEmpty(entityDependencyTree)) {
            testResourceInfo.originInfo.version = first(entityDependencyTree).version;
        }
        return testResourceInfo;
    }

    /**
     * presentable转换为测试资源实体
     * @param presentableInfo
     * @param resourceInfo
     * @param nodeId
     */
    _presentableInfoMapToTestResource(presentableInfo: PresentableInfo, resourceInfo: ResourceInfo, nodeId: number): TestResourceInfo {
        const testResourceOriginInfo = {
            id: presentableInfo.resourceInfo.resourceId,
            name: presentableInfo.resourceInfo.resourceName,
            type: TestResourceOriginType.Resource,
            resourceType: presentableInfo.resourceInfo.resourceType,
            version: presentableInfo.version,
            versions: resourceInfo ? resourceInfo.resourceVersions.map(x => x.version) : [], // 容错处理
            coverImages: resourceInfo.coverImages ?? [],
        };
        const testResourceInfo: TestResourceInfo = {
            nodeId,
            userId: this.ctx.userId,
            intro: resourceInfo.intro ?? '',
            associatedPresentableId: presentableInfo.presentableId,
            resourceType: presentableInfo.resourceInfo.resourceType,
            testResourceId: this._generateTestResourceId(nodeId, testResourceOriginInfo),
            testResourceName: presentableInfo.presentableName,
            coverImages: testResourceOriginInfo.coverImages,
            originInfo: testResourceOriginInfo,
            differenceInfo: {
                onlineStatusInfo: {
                    isOnline: presentableInfo.onlineStatus,
                    ruleId: 'default'
                },
                userDefinedTagInfo: {
                    tags: presentableInfo.tags,
                    ruleId: 'default'
                }
            }
        };
        return testResourceInfo;
    }

    async _compileAndMatchTestRule(nodeId: number, testRuleText: string): Promise<TestRuleMatchInfo[]> {

        // const {errors, rules} = this.testRuleHandler.compileTestRule(testRuleText);
        // if (!isEmpty(errors)) {
        //     throw new ApplicationError(this.ctx.gettext('node-test-rule-compile-failed'), {errors})
        // }
        // if (!isEmpty(rules)) {
        //     return [];
        // }

        const ruleInfos: BaseTestRuleInfo[] = [];
        ruleInfos.push({
            text: "alter hello  do \\n set_tags tag1,tag2\\n   show\\nend",
            tags: ["tag1", "tag2"],
            replaces: [],
            online: true,
            operation: TestNodeOperationEnum.Alter,
            presentableName: "hello"
        });
        ruleInfos.push({
            text: "add  $yuliang/my-first-resource3@^1.0.0   as import_test_resource \\ndo\\nend",
            tags: ["tag1", "tag2"],
            replaces: [],
            online: null,
            operation: TestNodeOperationEnum.Add,
            presentableName: 'import_test_resource',
            candidate: {
                name: "yuliang/my-first-resource3",
                versionRange: "^1.0.0",
                type: TestResourceOriginType.Resource
            }
        });
        ruleInfos.push({
            text: "add   #yuliang/2a  as object_1 \\ndo  \\n  set_tags reset  \\n  replace #yuliang/readme2 with #yuliang/readme3  \\n   hide \\nend",
            tags: ["tag1", "tag2"],
            replaces: [
                {
                    replaced: {
                        name: "yuliang/my-resource-1",
                        type: TestResourceOriginType.Resource
                    },
                    replacer: {
                        name: "yuliang/my-first-resource4",
                        type: TestResourceOriginType.Resource
                    },
                    scopes: []
                }
            ],
            online: null,
            operation: TestNodeOperationEnum.Add,
            presentableName: "object_1",
            candidate: {
                name: "yuliang/2a",
                type: TestResourceOriginType.Object
            }
        });


        return this.testRuleHandler.main(nodeId, ruleInfos.reverse());
    }

    async _generateTestResourceAuthTree(dependencyTree: TestResourceDependencyTree[]) {
        //1200
    }

    /**
     * 生成测试资源ID
     * @param nodeId
     * @param originInfo
     * @private
     */
    _generateTestResourceId(nodeId: number, originInfo: TestResourceOriginInfo) {
        return md5(`${nodeId}-${originInfo.id}-${originInfo.type}`);
    }
}