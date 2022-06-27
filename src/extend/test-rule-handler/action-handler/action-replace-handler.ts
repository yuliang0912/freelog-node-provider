import {satisfies} from 'semver';
import {inject, provide} from 'midway';
import {chain, first, isEmpty, pick} from 'lodash';
import {IOutsideApiService, ObjectStorageInfo, ResourceInfo} from '../../../interface';
import {
    Action, ScopePathChain,
    CandidateInfo, ContentReplace, IActionHandler,
    TestResourceDependencyTree, TestResourceOriginInfo,
    TestResourceOriginType, TestRuleMatchInfo, ActionOperationEnum
} from '../../../test-node-interface';
import {FreelogContext} from 'egg-freelog-base';
import {ImportObjectEntityHandler} from '../import/import-object-entity-handler';
import {ImportResourceEntityHandler} from '../import/import-resource-entity-handler';
import {TestRuleChecker} from '../test-rule-checker';

@provide()
export class ActionReplaceHandler implements IActionHandler<ContentReplace> {

    @inject()
    ctx: FreelogContext;
    @inject()
    testRuleChecker: TestRuleChecker;
    @inject()
    importObjectEntityHandler: ImportObjectEntityHandler;
    @inject()
    importResourceEntityHandler: ImportResourceEntityHandler;
    @inject()
    outsideApiService: IOutsideApiService;

    /**
     * 执行替换操作
     * @param ctx
     * @param testRuleInfo
     * @param action
     */
    async handle(ctx: FreelogContext, testRuleInfo: TestRuleMatchInfo, action: Action<ContentReplace>) {

        if (!action.content.replaced || !action.content.replacer) {
            return false;
        }

        // 如果还没有依赖树,则直接查询依赖树
        if (!testRuleInfo.entityDependencyTree) {
            await this.getEntityDependencyTree(testRuleInfo.testResourceOriginInfo.type, testRuleInfo.testResourceOriginInfo.id, testRuleInfo.testResourceOriginInfo.version)
                .then(dependencyTree => testRuleInfo.entityDependencyTree = dependencyTree);
        }

        testRuleInfo.replaceRecords = testRuleInfo.replaceRecords ?? [];
        await this.recursionReplace(ctx, testRuleInfo, action, testRuleInfo.entityDependencyTree, testRuleInfo.entityDependencyTree, []);

        testRuleInfo.operationAndActionRecords.push({
            type: ActionOperationEnum.Replace, data: {
                exhibitName: testRuleInfo.ruleInfo.exhibitName,
                replaced: action.content.replaced,
                replacer: action.content.replacer,
                scopes: action.content.scopes
                // replaceCount: testRuleInfo.replaceRecords.find(x => x.replaced).length
            }
        });

        return true;
    }

    /**
     * 递归替换依赖树
     * @param ctx
     * @param testRuleInfo
     * @param action
     * @param rootDependencies
     * @param dependencies
     * @param parents
     */
    private async recursionReplace(ctx: FreelogContext, testRuleInfo: TestRuleMatchInfo, action: Action<ContentReplace>, rootDependencies: TestResourceDependencyTree[], dependencies: TestResourceDependencyTree[], parents: ScopePathChain[]) {

        if (isEmpty(dependencies ?? [])) {
            return;
        }

        for (let i = 0, j = dependencies.length; i < j; i++) {
            const currDependencyInfo = dependencies[i];
            const currPathChain = parents.concat([pick(currDependencyInfo, ['name', 'type', 'version'])]);
            if (!this.checkRuleScopeIsMatched(action.content.scopes, currPathChain)) {
                continue;
            }
            const replacerInfo = await this.matchReplacer(ctx, testRuleInfo, action, currDependencyInfo);
            if (!replacerInfo) {
                await this.recursionReplace(ctx, testRuleInfo, action, rootDependencies, currDependencyInfo.dependencies, currPathChain);
                continue;
            }

            // 替换者的依赖树
            const replacerDependencyTree = await this.getEntityDependencyTree(replacerInfo.type, replacerInfo.id, replacerInfo.version).then(first);
            replacerDependencyTree.versionRange = replacerInfo.versionRange;

            // 自己替换自己是被允许的,不用做循环检测
            if (currDependencyInfo.id !== replacerInfo.id) {
                const {result, deep} = this.checkCycleDependency(ctx, rootDependencies, replacerDependencyTree);
                if (result) {
                    action.errorMsg = ctx.gettext(deep == 1 ? 'reflect_rule_pre_excute_error_circular_rely' : 'reflect_rule_pre_excute_error_duplicate_rely', replacerInfo.name);
                    testRuleInfo.matchErrors.push(action.errorMsg);
                    continue;
                }
            }
            // 主资源被替换,需要把新的替换者信息保存起来
            if (currPathChain.length === 1 && (replacerInfo.id !== testRuleInfo.testResourceOriginInfo.id || replacerInfo.version !== testRuleInfo.testResourceOriginInfo.version)) {
                if (replacerInfo.type === TestResourceOriginType.Resource) {
                    replacerInfo.versionRange = testRuleInfo.testResourceOriginInfo.versionRange;
                    const versionInfo = await this.outsideApiService.getResourceVersionInfo(replacerInfo.versionId, ['systemProperty', 'customPropertyDescriptors']);
                    replacerInfo['systemProperty'] = versionInfo.systemProperty;
                    replacerInfo['customPropertyDescriptors'] = versionInfo.customPropertyDescriptors;
                }
                testRuleInfo.propertyMap.clear();
                this.testRuleChecker.fillEntityPropertyMap(testRuleInfo, replacerInfo['systemProperty'], replacerInfo['customPropertyDescriptors']);
                testRuleInfo.testResourceOriginInfo = replacerInfo;
            }
            dependencies.splice(i, 1, replacerDependencyTree);

            testRuleInfo.replaceRecords.push({
                replaced: pick(currDependencyInfo, ['id', 'name', 'type', 'version', 'versionRange']),
                replacer: pick(replacerDependencyTree, ['id', 'name', 'type', 'version', 'versionRange'])
            });
        }
    }

    /**
     * 匹配替换对象,此函数会在替换之后的结果上做多次替换.具体需要看规则的定义.即支持A=>B,B=>C,C=>D. 综合替换之后的结果为A替换成D.最终返回D以及D的依赖信息.
     * 然后上游调用者会把A以及A的所有依赖信息移除,替换成D以及D的依赖信息.然后在新的依赖树下递归调用后续的规则
     * @param ctx
     * @param testRuleInfo
     * @param action
     * @param targetInfo
     */
    private async matchReplacer(ctx: FreelogContext, testRuleInfo: TestRuleMatchInfo, action: Action<ContentReplace>, targetInfo: TestResourceDependencyTree): Promise<TestResourceOriginInfo> {

        if (!this.entityIsMatched(action.content.replaced, targetInfo)) {
            return;
        }

        const {replacer} = action.content;
        const replacerIsObject = replacer.type === TestResourceOriginType.Object;
        const replacerIsResource = replacer.type === TestResourceOriginType.Resource;
        const replacerInfo = await this.getReplacerInfo(ctx, replacer).catch(error => {
            return undefined;
        });
        if (!replacerInfo) {
            action.errorMsg = ctx.gettext(replacerIsResource ? 'reflect_rule_pre_excute_error_resource_not_existed' : 'reflect_rule_pre_excute_error_object_not_existed', replacer.name);
            testRuleInfo.matchErrors.push(action.errorMsg);
            return;
        }
        const resourceVersionInfo = replacerIsResource ? this.importResourceEntityHandler.matchResourceVersion(replacerInfo as ResourceInfo, replacer.versionRange) : null;
        if (replacerIsResource && !resourceVersionInfo) {
            action.errorMsg = ctx.gettext('reflect_rule_pre_excute_error_version_invalid', replacer.name, replacer.versionRange);
            testRuleInfo.matchErrors.push(action.errorMsg);
            return;
        }
        if (replacerIsObject && replacerInfo.userId !== ctx.userId) {
            action.errorMsg = ctx.gettext('reflect_rule_pre_excute_error_access_limited', replacer.name);
            testRuleInfo.matchErrors.push(action.errorMsg);
            return;
        }
        if (replacerIsObject && isEmpty(replacerInfo.resourceType ?? [])) {
            action.errorMsg = this.ctx.gettext('reflect_rule_pre_excute_error_no_resource_type', replacer.name);
            testRuleInfo.matchErrors.push(action.errorMsg);
            return;
        }
        if (replacerIsObject) {
            const objectInfo = replacerInfo as ObjectStorageInfo;
            return {
                id: objectInfo.objectId,
                name: objectInfo.objectName,
                type: replacer.type,
                version: null,
                versions: [],
                coverImages: [],
                resourceType: objectInfo.resourceType,
                ownerUserId: replacerInfo.userId,
                systemProperty: objectInfo.systemProperty,
                customPropertyDescriptors: objectInfo.customPropertyDescriptors
            } as TestResourceOriginInfo;
        }

        const resourceInfo = replacerInfo as ResourceInfo;
        return {
            id: resourceInfo.resourceId,
            name: resourceInfo.resourceName,
            type: replacer.type,
            resourceType: resourceInfo.resourceType,
            version: resourceVersionInfo.version,
            versionRange: replacer.versionRange,
            versions: resourceInfo.resourceVersions.map(x => x.version),
            coverImages: resourceInfo.coverImages,
            ownerUserId: replacerInfo.userId,
            versionId: resourceVersionInfo.versionId,
        } as TestResourceOriginInfo;
    }

    /**
     * 检查规则的作用域是否匹配
     * 1.scopes为空数组即代表全局替换.
     * 2.多个scopes中如果有任意一个scope满足条件即可
     * 3.作用域链路需要与依赖的实际链路一致.但是可以少于实际链路,即作用域链路与实际链路的前半部分完全匹配
     * @param candidateScopes
     * @param parents
     * @private
     */
    private checkRuleScopeIsMatched(candidateScopes: CandidateInfo[][], parents: ScopePathChain[]) {

        if (isEmpty(candidateScopes)) {
            return true;
        }

        for (const subScopes of candidateScopes) {
            const subScopesLength = subScopes.length;
            if (subScopesLength > parents.length) {
                continue;
            }
            for (let x = 0; x < subScopesLength; x++) {
                // 父级目录链有任意不匹配的项,则该条作用域匹配失败.跳出继续下一个作用域匹配
                if (!this.entityIsMatched(subScopes[x], parents[x])) {
                    break;
                }
                // 当父级目录全部匹配,并且匹配到链路的尾部,则代表匹配成功.
                if (x === subScopesLength - 1) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * 检查依赖树节点对象与候选对象规则是否匹配
     * @param candidateInfo
     * @param targetInfo
     */
    private entityIsMatched(candidateInfo: CandidateInfo, targetInfo: ScopePathChain): boolean {
        if (candidateInfo.name !== targetInfo.name || candidateInfo.type !== targetInfo.type) {
            return false;
        }
        if (candidateInfo.type === TestResourceOriginType.Object) {
            return true;
        }
        return satisfies(targetInfo.version, candidateInfo.versionRange ?? '*');
    }

    /**
     * 检查重复依赖或者循环依赖(deep=1的循环依赖,否则为重复依赖)
     * @private
     */
    private checkCycleDependency(ctx: FreelogContext, dependencies: TestResourceDependencyTree[], targetInfo: TestResourceDependencyTree, deep = 1): { result: boolean, deep: number, errorMsg?: string } {
        if (isEmpty(dependencies)) {
            return {result: false, deep};
        }
        if (dependencies.some(x => x.id === targetInfo.id && x.type === targetInfo.type)) {
            return {result: true, deep};
        }
        if (deep > 50) { //内部限制最大依赖树深度
            return {result: false, deep, errorMsg: ctx.gettext('reflect_rule_pre_excute_error_exceed_rely_limit')};
        }
        const subDependencies = chain(dependencies).map(m => m.dependencies).flattenDeep().value();
        return this.checkCycleDependency(ctx, subDependencies, targetInfo, deep + 1);
    }

    /**
     * 获取替换对象信息
     * @param ctx
     * @param replacer
     * @private
     */
    private async getReplacerInfo(ctx: FreelogContext, replacer: CandidateInfo): Promise<ResourceInfo | ObjectStorageInfo> {
        return replacer.type === TestResourceOriginType.Object
            ? this.outsideApiService.getObjectInfo(replacer.name)
            : this.outsideApiService.getResourceInfo(replacer.name, {projection: 'resourceId,userId,coverImages,resourceName,resourceType,resourceVersions,latestVersion'});
    }

    /**
     * 获取依赖树
     * @param entityType
     * @param entityId
     * @param entityVersion
     * @private
     */
    private async getEntityDependencyTree(entityType: TestResourceOriginType, entityId: string, entityVersion?: string): Promise<TestResourceDependencyTree[]> {
        if (entityType === TestResourceOriginType.Resource) {
            return this.importResourceEntityHandler.getResourceDependencyTree(entityId, entityVersion);
        }
        return this.importObjectEntityHandler.getObjectDependencyTree(entityId);
    }
}
