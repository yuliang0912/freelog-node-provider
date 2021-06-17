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
        await this._recursionReplace(testRuleInfo.entityDependencyTree, [], replaceRecords);
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
     * @param dependencies
     * @param parents
     * @param records
     */
    async _recursionReplace(dependencies, parents, records) {
        if (lodash_1.isEmpty(dependencies ?? [])) {
            return;
        }
        for (let i = 0, j = dependencies.length; i < j; i++) {
            const currTreeNodeInfo = dependencies[i];
            const currPathChain = parents.concat([lodash_1.pick(currTreeNodeInfo, ['name', 'type', 'version'])]);
            const replacerInfo = await this._matchReplacer(currTreeNodeInfo, currPathChain);
            if (!replacerInfo) {
                await this._recursionReplace(currTreeNodeInfo.dependencies, currPathChain, records);
                continue;
            }
            // 自己替换自己是被允许的,不用做循环检测
            if (currTreeNodeInfo.id !== replacerInfo.id) {
                const { result, deep } = this._checkCycleDependency(dependencies, replacerInfo);
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
        if (deep > 100) { //内部限制最大依赖树深度
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3B0aW9uLXJlcGxhY2UtaGFuZGxlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9leHRlbmQvdGVzdC1ydWxlLWhhbmRsZXIvb3B0aW9uLXJlcGxhY2UtaGFuZGxlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7QUFBQSxtQ0FBaUM7QUFDakMsbUNBQXVDO0FBQ3ZDLG1DQUFtRDtBQUVuRCxtRUFFbUM7QUFHbkMsSUFBYSxvQkFBb0IsR0FBakMsTUFBYSxvQkFBb0I7SUFXN0I7OztPQUdHO0lBQ0gsS0FBSyxDQUFDLE1BQU0sQ0FBQyxZQUErQjtRQUV4QyxJQUFJLENBQUMsWUFBWSxDQUFDLE9BQU8sSUFBSSxnQkFBTyxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLE9BQU8sRUFBRSxLQUFLLENBQUMsQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsRUFBRTtZQUNqSSxPQUFPO1NBQ1Y7UUFFRCxJQUFJLENBQUMsaUJBQWlCLEdBQUcsWUFBWSxDQUFDO1FBRXRDLE1BQU0sY0FBYyxHQUFHLEVBQUUsQ0FBQztRQUMxQixNQUFNLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxZQUFZLENBQUMsb0JBQW9CLEVBQUUsRUFBRSxFQUFFLGNBQWMsQ0FBQyxDQUFDO1FBQ3BGLE1BQU0sY0FBYyxHQUFHLGNBQUssQ0FBQyxZQUFZLENBQUMsb0JBQW9CLENBQUMsQ0FBQztRQUNoRSxnQ0FBZ0M7UUFDaEMsSUFBSSxjQUFjLENBQUMsRUFBRSxLQUFLLFlBQVksQ0FBQyxzQkFBc0IsQ0FBQyxFQUFFLElBQUksY0FBYyxDQUFDLElBQUksS0FBSyxZQUFZLENBQUMsc0JBQXNCLENBQUMsSUFBSSxJQUFJLGNBQWMsQ0FBQyxJQUFJLEtBQUssNENBQXNCLENBQUMsUUFBUSxFQUFFO1lBQzdMLFlBQVksQ0FBQyxzQkFBc0IsQ0FBQyxPQUFPLEdBQUcs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