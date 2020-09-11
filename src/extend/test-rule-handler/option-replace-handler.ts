import {satisfies} from 'semver';
import {inject, provide} from "midway";
import {isEmpty, pick, chain} from "lodash";
import {IOutsideApiService, ObjectStorageInfo, ResourceInfo} from "../../interface";
import {
    CandidateInfo, TestRuleMatchInfo, TestResourceDependencyTree, TestResourceOriginType, TestRuleEfficientInfo
} from "../../test-node-interface";

@provide()
export class OptionReplaceHandler {

    @inject()
    importObjectEntityHandler;
    @inject()
    importResourceEntityHandler;
    @inject()
    outsideApiService: IOutsideApiService;

    testRuleMatchInfo: TestRuleMatchInfo;
    private replaceOptionEfficientCountInfo: TestRuleEfficientInfo = {type: 'replace', count: 0};

    /**
     * 执行替换操作
     * @param testRuleInfo
     */
    async handle(testRuleInfo: TestRuleMatchInfo) {

        if (!testRuleInfo.isValid || isEmpty(testRuleInfo.ruleInfo.replaces) || !['alter', 'add'].includes(testRuleInfo.ruleInfo.operation)) {
            return;
        }

        this.testRuleMatchInfo = testRuleInfo;
        this.testRuleMatchInfo.efficientCountInfos.push(this.replaceOptionEfficientCountInfo);

        await this._recursionReplace(testRuleInfo.entityDependencyTree, []);
    }

    /**
     * 递归替换依赖树
     * @param dependencies
     * @param parents
     * @private
     */
    async _recursionReplace(dependencies: TestResourceDependencyTree[], parents: { name: string, type: string, version?: string }[]) {
        if (isEmpty(dependencies ?? [])) {
            return;
        }
        for (let i = 0, j = dependencies.length; i < j; i++) {
            const currTreeNodeInfo = dependencies[i];
            const currPathChain = parents.concat([pick(currTreeNodeInfo, ['name', 'type', 'version'])]);
            const replacerInfo = await this._matchReplacer(currTreeNodeInfo, currPathChain);
            if (!replacerInfo) {
                await this._recursionReplace(currTreeNodeInfo.dependencies, currPathChain);
                continue;
            }
            const {result, deep} = this._checkCycleDependency(dependencies, replacerInfo);
            if (result) {
                this.testRuleMatchInfo.isValid = false;
                this.testRuleMatchInfo.matchErrors.push(`规则作用于${this.testRuleMatchInfo.ruleInfo.presentableName}时,检查到${deep == 1 ? "重复" : "循环"}依赖,无法替换`);
                continue;
            }
            dependencies.splice(i, 1, replacerInfo);
        }
    }

    /**
     * 匹配替换对象,此函数会在替换之后的结果上做多次替换.具体需要看规则的定义.即支持A=>B,B=>C,C=>D. 综合替换之后的结果为A替换成D.最终返回D以及D的依赖信息.
     * 然后上游调用者会把A以及A的所有依赖信息移除,替换成D以及D的依赖信息.然后在新的依赖树下递归调用后续的规则
     * @param targetInfo
     * @param ruleInfo
     * @param parents
     * @private
     */
    async _matchReplacer(targetInfo: TestResourceDependencyTree, parents = []): Promise<TestResourceDependencyTree> {

        let latestTestResourceDependencyTree = targetInfo;
        for (const replaceObjectInfo of this.testRuleMatchInfo.ruleInfo.replaces) {

            const {replaced, replacer, scopes} = replaceObjectInfo;
            if (!this._checkRuleScopeIsMatched(scopes, parents) || !this._entityIsMatched(replaced, latestTestResourceDependencyTree)) {
                continue;
            }

            const replacerInfo = await this._getReplacerInfo(replacer);
            if (!replacerInfo) {
                this.testRuleMatchInfo.isValid = false;
                this.testRuleMatchInfo.matchErrors.push(`替换品名称${replacer.name}无效,未找到对应的对象`);
                return;
            }

            const resourceVersionInfo = replacer.type === TestResourceOriginType.Resource ? this.importResourceEntityHandler.matchResourceVersion(replacerInfo as ResourceInfo, replacer.versionRange) : null;
            if (replacer.type === TestResourceOriginType.Resource && !resourceVersionInfo) {
                this.testRuleMatchInfo.isValid = false;
                this.testRuleMatchInfo.matchErrors.push(`替换品版本${replacer.versionRange}无效`);
                return;
            }

            // 代码执行到此,说明已经匹配成功,然后接着再结果的基础上进行再次匹配,直到替换完所有的
            this.replaceOptionEfficientCountInfo.count++;
            latestTestResourceDependencyTree = {
                id: replacerInfo[replacer.type === TestResourceOriginType.Resource ? 'resourceId' : 'objectId'],
                name: replacer.name,
                type: replacer.type,
                resourceType: replacerInfo.resourceType,
                version: resourceVersionInfo?.version,
                versionId: resourceVersionInfo?.versionId,
                dependencies: []
            }
        }

        if (!this.replaceOptionEfficientCountInfo.count) {
            return;
        }
        // 返回被替换之后的新的依赖树(已包含自身)
        return latestTestResourceDependencyTree.type === TestResourceOriginType.Object
            ? await this.importObjectEntityHandler.getObjectDependencyTree(latestTestResourceDependencyTree.id)
            : await this.importResourceEntityHandler.getResourceDependencyTree(latestTestResourceDependencyTree.id, latestTestResourceDependencyTree.version)
    }

    /**
     * 检查规则的作用域是否匹配
     * 1.scopes为空数组即代表全局替换.
     * 2.多个scopes中如果有任意一个scope满足条件即可
     * 3.作用域链路需要与依赖的实际链路一致.但是可以少于实际链路,即作用域链路与实际链路的前半部分完全匹配
     * @param scopes
     * @param parents
     * @private
     */
    _checkRuleScopeIsMatched(scopes: CandidateInfo[][], parents: any[]) {

        if (isEmpty(scopes)) {
            return true;
        }

        for (const subScopes of scopes) {
            const subScopesLength = subScopes.length;
            if (subScopesLength > parents.length) {
                continue;
            }
            for (let x = 0; x < subScopesLength; x++) {
                // 父级目录链有任意不匹配的项,则该条作用域匹配失败.跳出继续下一个作用域匹配
                if (!this._entityIsMatched(subScopes[x], parents[x])) {
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
     * @param scopeInfo
     * @param dependInfo
     * @returns {boolean|*}
     * @private
     */
    _entityIsMatched(scopeInfo: CandidateInfo, targetInfo: TestResourceDependencyTree): boolean {
        if (scopeInfo.name !== targetInfo.name || scopeInfo.type !== targetInfo.type) {
            return false;
        }
        if (scopeInfo.type === TestResourceOriginType.Object) {
            return true;
        }
        return satisfies(targetInfo.version, scopeInfo.versionRange ?? '*');
    }

    /**
     * 检查重复依赖或者循环依赖(deep=1的循环依赖,否则为重复依赖)
     * @private
     */
    _checkCycleDependency(dependencies: TestResourceDependencyTree[], targetInfo: TestResourceDependencyTree, deep = 1): { result: boolean, deep: number, errorMsg?: string } {
        if (isEmpty(dependencies)) {
            return {result: false, deep};
        }
        //如果只有一个元素,自己替换自己的不同版本可以被允许,检测的目的是防止多个依赖一致
        if (dependencies.length > 1 && dependencies.some(x => x.id === targetInfo.id && x.type === targetInfo.type)) {
            return {result: true, deep};
        }
        if (deep > 100) { //内部限制最大依赖树深度
            return {result: false, deep, errorMsg: '依赖的嵌套层级过大'};
        }
        const subDependencies = chain(dependencies).map(m => m.dependencies).flattenDeep().value();
        return this._checkCycleDependency(subDependencies, targetInfo, deep + 1);
    }

    /**
     * 获取替换对象信息
     * @param replacer
     * @private
     */
    async _getReplacerInfo(replacer): Promise<ResourceInfo | ObjectStorageInfo> {
        return replacer.type === TestResourceOriginType.Object
            ? this.outsideApiService.getObjectInfo(replacer.name)
            : this.outsideApiService.getResourceInfo(replacer.name, {projection: 'resourceId,resourceName,resourceType,resourceVersions,latestVersion'});
    }
}