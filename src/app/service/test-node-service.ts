import {inject, provide} from 'midway';
import {
    BaseTestRuleInfo,
    IMatchTestRuleEventHandler,
    ITestNodeService,
    NodeTestRuleInfo,
    ResolveResourceInfo,
    TestNodeOperationEnum,
    TestResourceInfo,
    TestResourceOriginType,
    TestResourceTreeInfo
} from "../../test-node-interface";
import {
    IOutsideApiService, IPresentableService, IPresentableVersionService, PageResult
} from "../../interface";
import {NodeTestRuleMatchStatus} from "../../enum";
import {assign, chain, differenceBy, isEmpty} from 'lodash';
import {ApplicationError} from 'egg-freelog-base';

@provide()
export class TestNodeService implements ITestNodeService {

    @inject()
    ctx;
    @inject()
    nodeProvider;
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
    matchTestRuleEventHandler: IMatchTestRuleEventHandler;

    async findOneTestResource(condition: object, ...args): Promise<TestResourceInfo> {
        return this.nodeTestResourceProvider.findOne(condition, ...args);
    }

    async findTestResources(condition: object, ...args): Promise<TestResourceInfo[]> {
        return this.nodeTestResourceProvider.find(condition, ...args);
    }

    async findNodeTestRuleInfoById(nodeId: number, ...args): Promise<NodeTestRuleInfo> {
        return this.nodeTestRuleProvider.findOne({nodeId}, ...args);
    }

    async testResourceCount(condition: object): Promise<number> {
        return this.nodeTestResourceProvider.count(condition);
    }

    async findOneTestResourceTreeInfo(condition: object, ...args): Promise<TestResourceTreeInfo> {
        return this.nodeTestResourceTreeProvider.findOne(condition, ...args);
    }

    async findTestResourceTreeInfos(condition: object, ...args): Promise<TestResourceTreeInfo[]> {
        return this.nodeTestResourceTreeProvider.find(condition, ...args);
    }

    async findTestResourcePageList(condition: object, page: number, pageSize: number, projection: string[], orderBy: object): Promise<PageResult<TestResourceInfo>> {
        let dataList = [];
        const totalItem = await this.testResourceCount(condition);
        if (totalItem > (page - 1) * pageSize) {
            dataList = await this.nodeTestResourceProvider.findPageList(condition, page, pageSize, projection.join(' '), orderBy ?? {_id: 1});
        }
        return {page, pageSize, totalItem, dataList};
    }

    /**
     * 匹配规则并且保存结果
     * @param nodeId
     * @param testRuleText
     */
    async matchAndSaveNodeTestRule(nodeId: number, testRuleText: string): Promise<NodeTestRuleInfo> {

        const testRules = this._compileAndMatchTestRule(nodeId, testRuleText);
        const nodeTestRuleInfo: NodeTestRuleInfo = {
            nodeId,
            ruleText: testRuleText,
            userId: this.ctx.userId,
            status: NodeTestRuleMatchStatus.Pending,
            testRules: testRules.map(ruleInfo => Object({
                id: this.testNodeGenerator.generateTestRuleId(nodeId, ruleInfo.text),
                ruleInfo,
                matchErrors: [],
                efficientInfos: []
            }))
        };

        return this.nodeTestRuleProvider.findOneAndUpdate({nodeId}, nodeTestRuleInfo, {new: true}).then(data => {
            return data ?? this.nodeTestRuleProvider.create(nodeTestRuleInfo);
        }).then(nodeTestRule => {
            this.matchTestRuleEventHandler.handle(nodeId);
            return nodeTestRule;
        });
    }

    /**
     * 更新测试资源
     * @param testResource
     * @param resolveResources
     */
    async updateTestResource(testResource: TestResourceInfo, resolveResources: ResolveResourceInfo[]): Promise<TestResourceInfo> {
        const invalidResolves = differenceBy(resolveResources, testResource.resolveResources, 'resourceId');
        if (!isEmpty(invalidResolves)) {
            throw new ApplicationError(this.ctx.gettext('node-test-resolve-release-invalid-error'), {invalidResolves})
        }
        const beSignSubjects = chain(resolveResources).map(({resourceId, contracts}) => contracts.map(({policyId}) => Object({
            subjectId: resourceId, policyId
        }))).flattenDeep().value();
        const contractMap = await this.outsideApiService.batchSignNodeContracts(testResource.nodeId, beSignSubjects).then(contracts => {
            return new Map<string, string>(contracts.map(x => [x.subjectId + x.policyId, x.contractId]));
        });
        resolveResources.forEach(resolveResource => resolveResource.contracts.forEach(item => {
            item.contractId = contractMap.get(resolveResource.resourceId + item.policyId) ?? '';
        }));

        const updateResolveResources = testResource.resolveResources.map(resolveResource => {
            const modifyResolveResource = resolveResources.find(x => x.resourceId === resolveResource.resourceId);
            return modifyResolveResource ? assign(resolveResource, modifyResolveResource) : resolveResource;
        });

        return this.nodeTestResourceProvider.findOneAndUpdate({testResourceId: testResource.testResourceId}, {
            resolveResources: updateResolveResources
        }, {new: true});
    }

    _compileAndMatchTestRule(nodeId: number, testRuleText: string): BaseTestRuleInfo[] {

        // const {errors, rules} = this.testRuleHandler.compileTestRule(testRuleText);
        // if (!isEmpty(errors)) {
        //     throw new ApplicationError(this.ctx.gettext('node-test-rule-compile-failed'), {errors})
        // }
        // if (!isEmpty(rules)) {
        //     return [];
        // }

        const ruleInfos: BaseTestRuleInfo[] = [];
        // ruleInfos.push({
        //     text: "alter hello  do \\n set_tags tag1,tag2\\n   show\\nend",
        //     tags: ["tag1", "tag2"],
        //     replaces: [],
        //     online: true,
        //     operation: TestNodeOperationEnum.Alter,
        //     presentableName: "hello"
        // });
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

        return ruleInfos.reverse();
    }
}