import {satisfies} from 'semver';
import {INodeService} from '../../interface';
import {controller, inject, get, post, put, provide} from 'midway';
import {ITestNodeService, TestResourceInfo, TestResourceOriginType} from '../../test-node-interface';
import {isString, isArray, isUndefined, pick, chain, uniq, first, isEmpty} from 'lodash';
import {
    IdentityTypeEnum, ArgumentError, FreelogContext, IJsonSchemaValidate, visitorIdentityValidator
} from 'egg-freelog-base';

@provide()
@controller('/v2/testNodes')
export class TestNodeController {

    @inject()
    ctx: FreelogContext;
    @inject()
    nodeCommonChecker;
    @inject()
    testNodeGenerator;
    @inject()
    nodeService: INodeService;
    @inject()
    testNodeService: ITestNodeService;
    @inject()
    resolveResourcesValidator: IJsonSchemaValidate;

    // 查看节点测试规则
    @get('/:nodeId/rules')
    @visitorIdentityValidator(IdentityTypeEnum.LoginUser | IdentityTypeEnum.InternalClient)
    async showTestRuleInfo() {

        const {ctx} = this;
        const nodeId = ctx.checkParams('nodeId').toInt().gt(0).value;
        ctx.validateParams();

        await this.testNodeService.findNodeTestRuleInfoById(nodeId).then(ctx.success);
    }

    // 创建节点测试规则
    @post('/:nodeId/rules')
    @visitorIdentityValidator(IdentityTypeEnum.LoginUser)
    async createTestRule() {

        const {ctx} = this;
        const nodeId = ctx.checkParams('nodeId').toInt().gt(0).value;
        const testRuleText = ctx.checkBody('testRuleText').exist().type('string').decodeURIComponent().value;
        ctx.validateParams();

        const nodeInfo = await this.nodeService.findById(nodeId);
        this.nodeCommonChecker.nullObjectAndUserAuthorizationCheck(nodeInfo);

        await this.testNodeService.matchAndSaveNodeTestRule(nodeId, testRuleText ?? '').then(ctx.success);
    }

    // 更新节点测试规则
    @put('/:nodeId/rules')
    @visitorIdentityValidator(IdentityTypeEnum.LoginUser)
    async updateTestRule() {

        const {ctx} = this;
        const nodeId = ctx.checkParams('nodeId').exist().toInt().gt(0).value;
        const additionalTestRule = ctx.checkBody('additionalTestRule').exist().type('string').decodeURIComponent().value;
        ctx.validateParams();

        const nodeInfo = await this.nodeService.findById(nodeId);
        this.nodeCommonChecker.nullObjectAndUserAuthorizationCheck(nodeInfo);

        const nodeTestRule = await this.testNodeService.findNodeTestRuleInfoById(nodeId, 'ruleText');
        const currentRuleText = additionalTestRule + '   ' + (nodeTestRule?.ruleText ?? '');

        await this.testNodeService.matchAndSaveNodeTestRule(nodeId, currentRuleText).then(ctx.success);
    }

    // 规则改动之后数据结构有变动,会强制重新匹配一次
    @get('/test')
    async test() {
        //const nodeTestRuleProvider = this.testNodeService['nodeTestRuleProvider'];
        // const nodeTestRule = await nodeTestRuleProvider.find({}, 'nodeId ruleText');
        // for (const item of nodeTestRule) {
        //     await this.testNodeService.matchAndSaveNodeTestRule(item.nodeId, item.ruleText ?? '');
        // }
        //
        // const nodes = await this.nodeService.find({});
        // for (const nodeInfo of nodes) {
        //     await nodeTestRuleProvider.updateOne({nodeId: nodeInfo.nodeId}, {userId: nodeInfo.ownerUserId});
        // }
        // const nodeTestResourceProvider = this.testNodeService['nodeTestResourceProvider'];
        // const testResources = await nodeTestResourceProvider.find({});
        // console.log(testResources.length);
        // for (const item1 of testResources) {
        //     const nodeInfo = nodes.find(x => x.nodeId === item1.nodeId);
        //     if (!nodeInfo) {
        //         continue;
        //     }
        //     await nodeTestResourceProvider.updateOne({testResourceId: item1.testResourceId}, {userId: nodeInfo.ownerUserId});
        // }
        // this.ctx.success(nodeTestRule.length);
    }

    // 节点测试规则预执行
    @post('/:nodeId/rules/preExecution')
    @visitorIdentityValidator(IdentityTypeEnum.LoginUser)
    async testRulePreExecution() {

        const {ctx} = this;
        const nodeId = ctx.checkParams('nodeId').toInt().gt(0).value;
        const testRuleText = ctx.checkBody('testRuleText').exist().type('string').decodeURIComponent().value;
        ctx.validateParams();

        const nodeInfo = await this.nodeService.findById(nodeId);
        this.nodeCommonChecker.nullObjectAndUserAuthorizationCheck(nodeInfo);

        const ruleMatchedInfos = await this.testNodeService.preExecutionNodeTestRule(nodeId, testRuleText ?? '');

        ctx.success(ruleMatchedInfos.map(x => pick(x, ['id', 'isValid', 'matchErrors', 'efficientInfos', 'effectiveMatchCount', 'ruleInfo'])));
    }

    // 重新匹配节点测试规则
    @post('/:nodeId/rules/rematch')
    @visitorIdentityValidator(IdentityTypeEnum.LoginUser)
    async rematchTestRule() {
        const {ctx} = this;
        const nodeId = ctx.checkParams('nodeId').toInt().gt(0).value;
        const isMandatoryMatch = ctx.checkBody('isMandatoryMatch').optional().toInt().in([0, 1]).default(0).value;
        ctx.validateParams();

        const nodeInfo = await this.nodeService.findById(nodeId);
        this.nodeCommonChecker.nullObjectAndUserAuthorizationCheck(nodeInfo);

        await this.testNodeService.tryMatchNodeTestRule(nodeId, isMandatoryMatch).then();

        ctx.success(true);
    }

    // 查询节点下的所有测试资源
    @get('/:nodeId/testResources')
    @visitorIdentityValidator(IdentityTypeEnum.LoginUser)
    async testResources() {

        const {ctx} = this;
        const nodeId = ctx.checkParams('nodeId').exist().toInt().gt(0).value;
        const skip = ctx.checkQuery('skip').optional().toInt().default(0).ge(0).value;
        const limit = ctx.checkQuery('limit').optional().toInt().default(10).gt(0).lt(101).value;
        const sort = ctx.checkQuery('sort').optional().value;
        const keywords = ctx.checkQuery('keywords').optional().type('string').len(1, 100).value;
        const tags = ctx.checkQuery('tags').optional().toSplitArray().len(1, 20).value;
        const resourceType = ctx.checkQuery('resourceType').optional().isResourceType().value;
        const onlineStatus = ctx.checkQuery('onlineStatus').optional().toInt().default(1).in([0, 1, 2]).value;
        const projection = ctx.checkQuery('projection').optional().toSplitArray().default([]).value;
        const omitResourceType = ctx.checkQuery('omitResourceType').optional().isResourceType().value;
        ctx.validateParams();

        const nodeInfo = await this.nodeService.findById(nodeId);
        this.nodeCommonChecker.nullObjectAndUserAuthorizationCheck(nodeInfo);

        const condition: any = {nodeId};
        if (isString(resourceType)) { //resourceType 与 omitResourceType互斥
            condition.resourceType = resourceType;
        } else if (isString(omitResourceType)) {
            condition.resourceType = {$ne: omitResourceType};
        }
        if (isArray(tags)) {
            condition['stateInfo.tagInfo.tags'] = {$in: tags};
        }
        if (onlineStatus === 1 || onlineStatus === 0) {
            condition['stateInfo.onlineStatusInfo.onlineStatus'] = onlineStatus;
        }
        if (isString(keywords)) {
            const searchExp = {$regex: keywords, $options: 'i'};
            condition.$or = [{testResourceName: searchExp}, {'stateInfo.titleInfo.title': searchExp}, {'originInfo.name': searchExp}];
        }

        await this.testNodeService.findIntervalResourceList(condition, skip, limit, projection, sort).then(ctx.success);
    }

    // 根据源资源获取测试资源.例如通过发行名称或者发行ID获取测试资源.API不再提供单一查询
    @get('/:nodeId/testResources/list')
    @visitorIdentityValidator(IdentityTypeEnum.LoginUser)
    async testResourceList() {

        const {ctx} = this;
        const nodeId = ctx.checkParams('nodeId').exist().toInt().gt(0).value;
        const entityType = ctx.checkQuery('entityType').optional().in([TestResourceOriginType.Resource, TestResourceOriginType.Object]).value;
        const entityIds = ctx.checkQuery('entityIds').optional().isSplitMongoObjectId().toSplitArray().len(1, 100).value;
        const entityNames = ctx.checkQuery('entityNames').optional().toSplitArray().len(1, 100).value;
        const testResourceNames = ctx.checkQuery('testResourceNames').optional().toSplitArray().len(1, 100).value;
        const projection: string[] = ctx.checkQuery('projection').optional().toSplitArray().default([]).value;
        ctx.validateParams();

        if ([entityType, entityIds, entityNames, testResourceNames].every(isUndefined)) {
            throw new ArgumentError('params-required-validate-failed', 'entityType,entityIds,entityNames,testResourceNames');
        }

        const nodeInfo = await this.nodeService.findById(nodeId);
        this.nodeCommonChecker.nullObjectAndUserAuthorizationCheck(nodeInfo);

        const condition = {nodeId};
        if (entityType) {
            condition['originInfo.type'] = entityType;
        }
        if (isArray(entityIds)) {
            condition['originInfo.id'] = {$in: entityIds};
        }
        if (isArray(entityNames)) {
            condition['originInfo.name'] = {$in: entityNames};
        }
        if (isArray(testResourceNames)) {
            condition['testResourceName'] = {$in: testResourceNames.map(x => decodeURIComponent(x))};
        }
        await this.testNodeService.findTestResources(condition, projection.join(' ')).then(ctx.success);
    }

    // 查看测试资源详情
    @get('/:nodeId/testResources/detail')
    @visitorIdentityValidator(IdentityTypeEnum.LoginUser)
    async showTestResourceDetail() {

        const {ctx} = this;
        const nodeId = ctx.checkParams('nodeId').exist().toInt().gt(0).value;
        const testResourceId = ctx.checkQuery('testResourceId').ignoreParamWhenEmpty().isMd5().value;
        const testResourceName = ctx.checkQuery('testResourceName').ignoreParamWhenEmpty().len(1, 128).value;
        ctx.validateParams();

        const condition = {nodeId} as Partial<TestResourceInfo>;
        if (testResourceId) {
            condition.testResourceId = testResourceId;
        }
        if (isString(testResourceName)) {
            condition.testResourceName = testResourceName;
        }
        if (!Object.keys(condition).length) {
            throw new ArgumentError(this.ctx.gettext('params-required-validate-failed'));
        }
        await this.testNodeService.findOneTestResource(condition).then(ctx.success);
    }

    // 查看测试资源详情
    @get('/testResources/:testResourceId')
    @visitorIdentityValidator(IdentityTypeEnum.LoginUser)
    async showTestResource() {

        const {ctx} = this;
        const testResourceId = ctx.checkParams('testResourceId').exist().isMd5().value;
        ctx.validateParams();

        await this.testNodeService.findOneTestResource({testResourceId}).then(ctx.success);
    }

    // 解决测试资源的依赖授权
    @put('/testResources/:testResourceId')
    @visitorIdentityValidator(IdentityTypeEnum.LoginUser)
    async updateTestResource() {

        const {ctx} = this;
        const testResourceId = ctx.checkParams('testResourceId').exist().isMd5().value;
        const resolveResources = ctx.checkBody('resolveResources').exist().isArray().len(1, 999).value;
        ctx.validateParams();

        const resolveResourcesValidateResult = this.resolveResourcesValidator.validate(resolveResources ?? []);
        if (!isEmpty(resolveResourcesValidateResult.errors)) {
            throw new ArgumentError(ctx.gettext('params-format-validate-failed', 'resolveResources'), {
                errors: resolveResourcesValidateResult.errors
            });
        }

        const testResourceInfo = await this.testNodeService.findOneTestResource({testResourceId});
        ctx.entityNullValueAndUserAuthorizationCheck(testResourceInfo, {
            msg: ctx.gettext('params-validate-failed', 'testResourceId')
        });

        await this.testNodeService.updateTestResource(testResourceInfo, resolveResources).then(ctx.success);
    }

    // 根据依赖项的ID和版本范围匹配测试资源信息
    @get('/:nodeId/testResources/searchByDependency')
    @visitorIdentityValidator(IdentityTypeEnum.LoginUser)
    async searchTestResources() {

        const {ctx} = this;
        const nodeId = ctx.checkParams('nodeId').exist().toInt().gt(0).value;
        const dependentEntityId = ctx.checkQuery('dependentEntityId').exist().isMongoObjectId().value;
        const dependentEntityVersionRange = ctx.checkQuery('dependentEntityVersionRange').optional().toVersionRange().value;
        const resourceType = ctx.checkQuery('resourceType').optional().isResourceType().value;
        const omitResourceType = ctx.checkQuery('omitResourceType').optional().isResourceType().value;
        ctx.validateParams();

        const isFilterVersionRange = isString(dependentEntityVersionRange) && dependentEntityVersionRange !== '*';

        let testResourceTreeInfos = await this.testNodeService.matchTestResourceTreeInfos(nodeId, dependentEntityId, resourceType, omitResourceType);
        if (isFilterVersionRange) {
            testResourceTreeInfos = testResourceTreeInfos.filter(item => item.dependencyTree.some(x => x.id === dependentEntityId && satisfies(dependentEntityVersionRange, x.version)));
        }

        if (isEmpty(testResourceTreeInfos)) {
            return ctx.success([]);
        }

        const testResourceIds = testResourceTreeInfos.map(x => x.testResourceId);
        const testResources = await this.testNodeService.findTestResources({testResourceId: {$in: testResourceIds}}, 'testResourceId testResourceName resourceType originInfo stateInfo.replaceInfo.rootResourceReplacer');

        ctx.success(testResources.map(x => {
            const entityInfo = x.stateInfo.replaceInfo?.rootResourceReplacer ?? x.originInfo;
            return {
                testResourceId: x.testResourceId,
                testResourceName: x.testResourceName,
                resourceType: x.resourceType,
                entityName: entityInfo.name,
                entityId: entityInfo.id,
                entityType: entityInfo.type
            };
        }));
    }

    // 查看测试资源的依赖树
    @get('/testResources/:testResourceId/dependencyTree')
    @visitorIdentityValidator(IdentityTypeEnum.LoginUser)
    async testResourceDependencyTree() {

        const {ctx} = this;
        const testResourceId = ctx.checkParams('testResourceId').exist().isMd5().value;
        const nid = ctx.checkQuery('nid').optional().type('string').value;
        const maxDeep = ctx.checkQuery('maxDeep').optional().toInt().default(100).lt(101).value;
        const isContainRootNode = ctx.checkQuery('isContainRootNode').optional().default(true).toBoolean().value;
        ctx.validateParams();

        const testResourceTreeInfo = await this.testNodeService.findOneTestResourceTreeInfo({testResourceId}, 'dependencyTree');
        if (!testResourceTreeInfo) {
            return [];
        }
        const dependencyTree = this.testNodeGenerator.generateTestResourceDependencyTree(testResourceTreeInfo.dependencyTree, nid, maxDeep, isContainRootNode);
        ctx.success(dependencyTree);
    }

    // 查看测试资源的授权树
    @get('/testResources/:testResourceId/authTree')
    @visitorIdentityValidator(IdentityTypeEnum.LoginUser)
    async testResourceAuthTree() {

        const {ctx} = this;
        const testResourceId = ctx.checkParams('testResourceId').exist().isMd5().value;
        const nid = ctx.checkQuery('nid').optional().type('string').len(12, 12).value;
        const maxDeep = ctx.checkQuery('maxDeep').optional().toInt().default(100).lt(101).value;
        const isContainRootNode = ctx.checkQuery('isContainRootNode').optional().default(true).toBoolean().value;
        ctx.validateParams();

        const testResourceTreeInfo = await this.testNodeService.findOneTestResourceTreeInfo({testResourceId}, 'authTree');
        if (!testResourceTreeInfo) {
            return [];
        }
        const dependencyTree = this.testNodeGenerator.convertTestResourceAuthTree(testResourceTreeInfo.authTree, nid, maxDeep, isContainRootNode);
        ctx.success(dependencyTree);
    }

    // 搜索节点全部测试资源的依赖树.返回包含该依赖的测试资源信息
    @get('/:nodeId/testResources/dependencyTree/search')
    @visitorIdentityValidator(IdentityTypeEnum.LoginUser)
    async searchTestResourceDependencyTree() {

        const {ctx} = this;
        const nodeId = ctx.checkParams('nodeId').exist().toInt().gt(0).value;
        const keywords = ctx.checkQuery('keywords').exist().type('string').value;
        const resourceType = ctx.checkQuery('resourceType').optional().isResourceType().value;
        const omitResourceType = ctx.checkQuery('omitResourceType').optional().isResourceType().value;
        ctx.validateParams();

        const searchResults = [];
        const nodeTestResourceDependencyTree = await this.testNodeService.searchTestResourceTreeInfos(nodeId, keywords, resourceType, omitResourceType);

        chain(nodeTestResourceDependencyTree).map(x => x.dependencyTree).flattenDeep().groupBy(x => x.id).forIn((values) => {
            const model = pick(first(values), ['id', 'name', 'type']);
            model['versions'] = uniq(values.filter(x => x.version).map(x => x.version));
            searchResults.push(model);
        }).value();

        ctx.success(searchResults);
    }

    // 过滤测试资源依赖树.只显示指定的依赖
    @get('/testResources/:testResourceId/dependencyTree/filter')
    @visitorIdentityValidator(IdentityTypeEnum.LoginUser)
    async filterTestResourceDependencyTree() {

        const {ctx} = this;
        const testResourceId = ctx.checkParams('testResourceId').exist().isMd5().value;
        const dependentEntityId = ctx.checkQuery('dependentEntityId').exist().isMongoObjectId().value;
        const dependentEntityVersionRange = ctx.checkQuery('dependentEntityVersionRange').optional().toVersionRange().value;
        ctx.validateParams();

        const testResourceTreeInfo = await this.testNodeService.findOneTestResourceTreeInfo({testResourceId}, 'dependencyTree');
        if (!testResourceTreeInfo) {
            return ctx.success([]);
        }

        const filteredDependencyTree = this.testNodeGenerator.filterTestResourceDependencyTree(testResourceTreeInfo.dependencyTree ?? [], dependentEntityId, dependentEntityVersionRange);

        ctx.success(filteredDependencyTree);
    }
}
