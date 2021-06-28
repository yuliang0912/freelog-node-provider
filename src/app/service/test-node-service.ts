import {inject, provide} from 'midway';
import {
    IMatchTestRuleEventHandler, ITestNodeService,
    NodeTestRuleInfo, ResolveResourceInfo,
    TestResourceInfo, TestResourceTreeInfo, TestRuleMatchInfo
} from '../../test-node-interface';
import {IOutsideApiService} from '../../interface';
import {NodeTestRuleMatchStatus} from '../../enum';
import {assign, chain, differenceBy, isEmpty} from 'lodash';
import {ApplicationError, PageResult, FreelogContext, IMongodbOperation} from 'egg-freelog-base';
import {TestRuleHandler} from '../../extend/test-rule-handler';

@provide()
export class TestNodeService implements ITestNodeService {

    @inject()
    ctx: FreelogContext;
    @inject()
    testRuleHandler: TestRuleHandler;
    @inject()
    testNodeGenerator;
    @inject()
    outsideApiService: IOutsideApiService;
    @inject()
    matchTestRuleEventHandler: IMatchTestRuleEventHandler;
    @inject()
    nodeTestRuleProvider: IMongodbOperation<NodeTestRuleInfo>;
    @inject()
    nodeTestResourceProvider: IMongodbOperation<TestResourceInfo>;
    @inject()
    nodeTestResourceTreeProvider: IMongodbOperation<TestResourceTreeInfo>;

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

    async searchTestResourceTreeInfos(nodeId: number, keywords: string): Promise<TestResourceTreeInfo[]> {
        const searchRegexp = new RegExp(keywords, 'i');

        return this.nodeTestResourceTreeProvider.aggregate([
            {$match: {nodeId}},
            {$unwind: '$dependencyTree'},
            {$match: {'dependencyTree.name': searchRegexp}},
            {$group: {_id: null, dependencyTree: {$push: '$dependencyTree'}}},
            {$project: {dependencyTree: 1, _id: 0}}
        ]);
    }

    async findIntervalResourceList(condition: object, skip: number, limit: number, projection: string[], sort?: object): Promise<PageResult<TestResourceInfo>> {
        return this.nodeTestResourceProvider.findIntervalList(condition, skip, limit, projection?.join(' '), sort);
    }

    /**
     * 获取测试规则预执行结果
     * @param nodeId
     * @param testRuleText
     */
    async preExecutionNodeTestRule(nodeId: number, testRuleText: string): Promise<TestRuleMatchInfo[]> {
        const {errors, rules} = this.testRuleHandler.compileTestRule(testRuleText);
        if (errors?.length) {
            throw new ApplicationError('测试节点策略编辑失败', {errors});
        }
        return this.testRuleHandler.main(nodeId, rules);
    }

    /**
     * 匹配规则并且保存结果
     * @param nodeId
     * @param testRuleText
     */
    async matchAndSaveNodeTestRule(nodeId: number, testRuleText: string): Promise<NodeTestRuleInfo> {

        const {errors, rules} = this.testRuleHandler.compileTestRule(testRuleText);
        if (errors?.length) {
            throw new ApplicationError('测试节点策略编辑失败', {errors});
        }
        const nodeTestRuleInfo: NodeTestRuleInfo = {
            nodeId,
            ruleText: testRuleText,
            userId: this.ctx.userId,
            status: NodeTestRuleMatchStatus.ToBePending,
            testRules: rules.map(ruleInfo => Object({
                id: this.testNodeGenerator.generateTestRuleId(nodeId, ruleInfo.text),
                ruleInfo,
                matchErrors: [],
                efficientInfos: []
            }))
        };

        const nodeTestRule = await this.nodeTestRuleProvider.findOneAndUpdate({nodeId}, nodeTestRuleInfo, {new: true}).then(data => {
            return data ?? this.nodeTestRuleProvider.create(nodeTestRuleInfo);
        });
        this.matchTestRuleEventHandler.handle(nodeId, true).then();

        return new Promise<NodeTestRuleInfo>((resolve) => {
            setTimeout(function () {
                resolve(nodeTestRule);
            }, 50);
        });
    }

    /**
     * 尝试匹配规则
     * @param nodeId
     * @param isMandatoryMatch
     */
    async tryMatchNodeTestRule(nodeId: number, isMandatoryMatch: boolean) {

        const nodeTestRuleInfo = await this.nodeTestRuleProvider.findOne({nodeId});
        if (!nodeTestRuleInfo) {
            return this.matchAndSaveNodeTestRule(nodeId, '');
        }
        this.matchTestRuleEventHandler.handle(nodeId, isMandatoryMatch).then();
        return new Promise<NodeTestRuleInfo>((resolve) => {
            setTimeout(function () {
                resolve(nodeTestRuleInfo);
            }, 50);
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
            throw new ApplicationError(this.ctx.gettext('node-test-resolve-release-invalid-error'), {invalidResolves});
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
}
