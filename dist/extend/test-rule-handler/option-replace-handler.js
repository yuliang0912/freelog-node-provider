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
exports.OptionReplaceHandler = void 0;
const semver_1 = require("semver");
const midway_1 = require("midway");
const lodash_1 = require("lodash");
const test_node_interface_1 = require("../../test-node-interface");
let OptionReplaceHandler = class OptionReplaceHandler {
    /**
     * 执行替换操作
     * @param testRuleInfo
     */
    async handle(testRuleInfo) {
        if (!testRuleInfo.isValid || lodash_1.isEmpty(testRuleInfo.ruleInfo.replaces) || !['alter', 'add'].includes(testRuleInfo.ruleInfo.operation)) {
            return;
        }
        this.testRuleMatchInfo = testRuleInfo;
        const replaceRecords = [];
        await this._recursionReplace(testRuleInfo.entityDependencyTree, testRuleInfo.entityDependencyTree, [], replaceRecords);
        const rootDependency = lodash_1.first(testRuleInfo.entityDependencyTree);
        // 如果测试资源通过规则替换了版本,则修改测试资源对应的版本号
        if (rootDependency.id === testRuleInfo.testResourceOriginInfo.id && rootDependency.type === testRuleInfo.testResourceOriginInfo.type && rootDependency.type === test_node_interface_1.TestResourceOriginType.Resource) {
            testRuleInfo.testResourceOriginInfo.version = rootDependency.version ?? testRuleInfo.testResourceOriginInfo.version;
        }
        // 替换合计生效次数
        this.testRuleMatchInfo.efficientInfos.push({
            type: 'replace', count: replaceRecords.length
        });
        testRuleInfo.replaceRecords = replaceRecords;
    }
    /**
     * 递归替换依赖树
     * @param rootDependencies
     * @param dependencies
     * @param parents
     * @param records
     */
    async _recursionReplace(rootDependencies, dependencies, parents, records) {
        if (lodash_1.isEmpty(dependencies ?? [])) {
            return;
        }
        for (let i = 0, j = dependencies.length; i < j; i++) {
            const currTreeNodeInfo = dependencies[i];
            const currPathChain = parents.concat([lodash_1.pick(currTreeNodeInfo, ['name', 'type', 'version'])]);
            const replacerInfo = await this._matchReplacer(currTreeNodeInfo, currPathChain);
            if (!replacerInfo) {
                await this._recursionReplace(rootDependencies, currTreeNodeInfo.dependencies, currPathChain, records);
                continue;
            }
            // 自己替换自己是被允许的,不用做循环检测
            if (currTreeNodeInfo.id !== replacerInfo.id) {
                const { result, deep } = this._checkCycleDependency(rootDependencies, replacerInfo);
                if (result) {
                    this.testRuleMatchInfo.isValid = false;
                    this.testRuleMatchInfo.matchErrors.push(`规则作用于${this.testRuleMatchInfo.ruleInfo.exhibitName}时,检查到${deep == 1 ? '重复' : '循环'}依赖,无法替换`);
                    continue;
                }
            }
            if (replacerInfo.replaceRecords?.length) {
                records.push(...replacerInfo.replaceRecords);
            }
            dependencies.splice(i, 1, replacerInfo);
        }
    }
    /**
     * 匹配替换对象,此函数会在替换之后的结果上做多次替换.具体需要看规则的定义.即支持A=>B,B=>C,C=>D. 综合替换之后的结果为A替换成D.最终返回D以及D的依赖信息.
     * 然后上游调用者会把A以及A的所有依赖信息移除,替换成D以及D的依赖信息.然后在新的依赖树下递归调用后续的规则
     * @param targetInfo
     * @param parents
     */
    async _matchReplacer(targetInfo, parents) {
        const replaceRecords = [];
        let latestTestResourceDependencyTree = targetInfo;
        for (const replaceObjectInfo of this.testRuleMatchInfo.ruleInfo.replaces) {
            const { replaced, replacer, scopes } = replaceObjectInfo;
            if (replaceObjectInfo.efficientCount === undefined) {
                replaceObjectInfo.efficientCount = 0;
            }
            if (!this._checkRuleScopeIsMatched(scopes, parents) || !this._entityIsMatched(replaced, latestTestResourceDependencyTree)) {
                continue;
            }
            const replacerInfo = await this._getReplacerInfo(replacer);
            if (!replacerInfo) {
                this.testRuleMatchInfo.isValid = false;
                this.testRuleMatchInfo.matchErrors.push(`替换品名称${replacer.name}无效,未找到对应的对象`);
                return;
            }
            const resourceVersionInfo = replacer.type === test_node_interface_1.TestResourceOriginType.Resource ? this.importResourceEntityHandler.matchResourceVersion(replacerInfo, replacer.versionRange) : null;
            if (replacer.type === test_node_interface_1.TestResourceOriginType.Resource && !resourceVersionInfo) {
                this.testRuleMatchInfo.isValid = false;
                this.testRuleMatchInfo.matchErrors.push(`替换品版本${replacer.versionRange}无效`);
                return;
            }
            // 代码执行到此,说明已经匹配成功,然后接着再结果的基础上进行再次匹配,直到替换完所有的
            const replaceRecordInfo = {
                replaced: lodash_1.pick(latestTestResourceDependencyTree, ['id', 'name', 'type', 'version'])
            };
            latestTestResourceDependencyTree = {
                id: replacerInfo[replacer.type === test_node_interface_1.TestResourceOriginType.Resource ? 'resourceId' : 'objectId'],
                name: replacer.name,
                type: replacer.type,
                resourceType: replacerInfo.resourceType,
                version: resourceVersionInfo?.version,
                versionId: resourceVersionInfo?.versionId,
                fileSha1: resourceVersionInfo.fileSha1,
                dependencies: []
            };
            replaceRecordInfo.replacer = lodash_1.pick(latestTestResourceDependencyTree, ['id', 'name', 'type', 'version']);
            replaceRecords.push(replaceRecordInfo);
            // 单个替换统计生效次数
            replaceObjectInfo.efficientCount += 1;
        }
        if (!replaceRecords.length) {
            return;
        }
        // 返回被替换之后的新的依赖树(已包含自身)
        const replacer = latestTestResourceDependencyTree.type === test_node_interface_1.TestResourceOriginType.Object
            ? await this.importObjectEntityHandler.getObjectDependencyTree(latestTestResourceDependencyTree.id).then(lodash_1.first)
            : await this.importResourceEntityHandler.getResourceDependencyTree(latestTestResourceDependencyTree.id, latestTestResourceDependencyTree.version).then(lodash_1.first);
        replacer.replaceRecords = replaceRecords;
        return replacer;
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
    _checkRuleScopeIsMatched(scopes, parents) {
        if (lodash_1.isEmpty(scopes)) {
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
     * @param targetInfo
     */
    _entityIsMatched(scopeInfo, targetInfo) {
        if (scopeInfo.name !== targetInfo.name || scopeInfo.type !== targetInfo.type) {
            return false;
        }
        if (scopeInfo.type === test_node_interface_1.TestResourceOriginType.Object) {
            return true;
        }
        return semver_1.satisfies(targetInfo.version, scopeInfo.versionRange ?? '*');
    }
    /**
     * 检查重复依赖或者循环依赖(deep=1的循环依赖,否则为重复依赖)
     * @private
     */
    _checkCycleDependency(dependencies, targetInfo, deep = 1) {
        if (lodash_1.isEmpty(dependencies)) {
            return { result: false, deep };
        }
        if (dependencies.some(x => x.id === targetInfo.id && x.type === targetInfo.type)) {
            return { result: true, deep };
        }
        if (deep > 50) { //内部限制最大依赖树深度
            return { result: false, deep, errorMsg: '依赖的嵌套层级过大' };
        }
        const subDependencies = lodash_1.chain(dependencies).map(m => m.dependencies).flattenDeep().value();
        return this._checkCycleDependency(subDependencies, targetInfo, deep + 1);
    }
    /**
     * 获取替换对象信息
     * @param replacer
     * @private
     */
    async _getReplacerInfo(replacer) {
        return replacer.type === test_node_interface_1.TestResourceOriginType.Object
            ? this.outsideApiService.getObjectInfo(replacer.name)
            : this.outsideApiService.getResourceInfo(replacer.name, { projection: 'resourceId,resourceName,resourceType,resourceVersions,latestVersion' });
    }
};
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], OptionReplaceHandler.prototype, "importObjectEntityHandler", void 0);
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], OptionReplaceHandler.prototype, "importResourceEntityHandler", void 0);
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], OptionReplaceHandler.prototype, "outsideApiService", void 0);
OptionReplaceHandler = __decorate([
    midway_1.provide()
], OptionReplaceHandler);
exports.OptionReplaceHandler = OptionReplaceHandler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3B0aW9uLXJlcGxhY2UtaGFuZGxlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9leHRlbmQvdGVzdC1ydWxlLWhhbmRsZXIvb3B0aW9uLXJlcGxhY2UtaGFuZGxlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7QUFBQSxtQ0FBaUM7QUFDakMsbUNBQXVDO0FBQ3ZDLG1DQUFtRDtBQUVuRCxtRUFFbUM7QUFHbkMsSUFBYSxvQkFBb0IsR0FBakMsTUFBYSxvQkFBb0I7SUFXN0I7OztPQUdHO0lBQ0gsS0FBSyxDQUFDLE1BQU0sQ0FBQyxZQUErQjtRQUV4QyxJQUFJLENBQUMsWUFBWSxDQUFDLE9BQU8sSUFBSSxnQkFBTyxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLE9BQU8sRUFBRSxLQUFLLENBQUMsQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsRUFBRTtZQUNqSSxPQUFPO1NBQ1Y7UUFFRCxJQUFJLENBQUMsaUJBQWlCLEdBQUcsWUFBWSxDQUFDO1FBRXRDLE1BQU0sY0FBYyxHQUFHLEVBQUUsQ0FBQztRQUMxQixNQUFNLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxZQUFZLENBQUMsb0JBQW9CLEVBQUUsWUFBWSxDQUFDLG9CQUFvQixFQUFFLEVBQUUsRUFBRSxjQUFjLENBQUMsQ0FBQztRQUN2SCxNQUFNLGNBQWMsR0FBRyxjQUFLLENBQUMsWUFBWSxDQUFDLG9CQUFvQixDQUFDLENBQUM7UUFDaEUsZ0NBQWdDO1FBQ2hDLElBQUksY0FBYyxDQUFDLEVBQUUsS0FBSyxZQUFZLENBQUMsc0JBQXNCLENBQUMsRUFBRSxJQUFJLGNBQWMsQ0FBQyxJQUFJLEtBQUssWUFBWSxDQUFDLHNCQUFzQixDQUFDLElBQUksSUFBSSxjQUFjLENBQUMsSUFBSSxLQUFLLDRDQUFzQixDQUFDLFFBQVEsRUFBRTtZQUM3TCxZQUFZLENBQUMs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