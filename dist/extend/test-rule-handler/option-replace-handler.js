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
    constructor() {
        this.replaceOptionEfficientCountInfo = { type: 'replace', count: 0 };
    }
    /**
     * 执行替换操作
     * @param testRuleInfo
     */
    async handle(testRuleInfo) {
        if (!testRuleInfo.isValid || lodash_1.isEmpty(testRuleInfo.ruleInfo.replaces) || !['alter', 'add'].includes(testRuleInfo.ruleInfo.operation)) {
            return;
        }
        this.testRuleMatchInfo = testRuleInfo;
        this.testRuleMatchInfo.efficientInfos.push(this.replaceOptionEfficientCountInfo);
        await this._recursionReplace(testRuleInfo.entityDependencyTree, []);
    }
    /**
     * 递归替换依赖树
     * @param dependencies
     * @param parents
     * @private
     */
    async _recursionReplace(dependencies, parents) {
        if (lodash_1.isEmpty(dependencies ?? [])) {
            return;
        }
        for (let i = 0, j = dependencies.length; i < j; i++) {
            const currTreeNodeInfo = dependencies[i];
            const currPathChain = parents.concat([lodash_1.pick(currTreeNodeInfo, ['name', 'type', 'version'])]);
            const replacerInfo = await this._matchReplacer(currTreeNodeInfo, currPathChain);
            if (!replacerInfo) {
                await this._recursionReplace(currTreeNodeInfo.dependencies, currPathChain);
                continue;
            }
            const { result, deep } = this._checkCycleDependency(dependencies, replacerInfo);
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
    async _matchReplacer(targetInfo, parents = []) {
        let latestTestResourceDependencyTree = targetInfo;
        for (const replaceObjectInfo of this.testRuleMatchInfo.ruleInfo.replaces) {
            const { replaced, replacer, scopes } = replaceObjectInfo;
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
            this.replaceOptionEfficientCountInfo.count++;
            latestTestResourceDependencyTree = {
                id: replacerInfo[replacer.type === test_node_interface_1.TestResourceOriginType.Resource ? 'resourceId' : 'objectId'],
                name: replacer.name,
                type: replacer.type,
                resourceType: replacerInfo.resourceType,
                version: resourceVersionInfo?.version,
                versionId: resourceVersionInfo?.versionId,
                dependencies: []
            };
        }
        if (!this.replaceOptionEfficientCountInfo.count) {
            return;
        }
        // 返回被替换之后的新的依赖树(已包含自身)
        return latestTestResourceDependencyTree.type === test_node_interface_1.TestResourceOriginType.Object
            ? await this.importObjectEntityHandler.getObjectDependencyTree(latestTestResourceDependencyTree.id).then(lodash_1.first)
            : await this.importResourceEntityHandler.getResourceDependencyTree(latestTestResourceDependencyTree.id, latestTestResourceDependencyTree.version).then(lodash_1.first);
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
     * @param dependInfo
     * @returns {boolean|*}
     * @private
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
        //如果只有一个元素,自己替换自己的不同版本可以被允许,检测的目的是防止多个依赖一致
        if (dependencies.length > 1 && dependencies.some(x => x.id === targetInfo.id && x.type === targetInfo.type)) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3B0aW9uLXJlcGxhY2UtaGFuZGxlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9leHRlbmQvdGVzdC1ydWxlLWhhbmRsZXIvb3B0aW9uLXJlcGxhY2UtaGFuZGxlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7QUFBQSxtQ0FBaUM7QUFDakMsbUNBQXVDO0FBQ3ZDLG1DQUFtRDtBQUVuRCxtRUFFbUM7QUFHbkMsSUFBYSxvQkFBb0IsR0FBakMsTUFBYSxvQkFBb0I7SUFBakM7UUFVWSxvQ0FBK0IsR0FBMEIsRUFBQyxJQUFJLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUMsQ0FBQztJQW9MakcsQ0FBQztJQWxMRzs7O09BR0c7SUFDSCxLQUFLLENBQUMsTUFBTSxDQUFDLFlBQStCO1FBRXhDLElBQUksQ0FBQyxZQUFZLENBQUMsT0FBTyxJQUFJLGdCQUFPLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsT0FBTyxFQUFFLEtBQUssQ0FBQyxDQUFDLFFBQVEsQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxFQUFFO1lBQ2pJLE9BQU87U0FDVjtRQUVELElBQUksQ0FBQyxpQkFBaUIsR0FBRyxZQUFZLENBQUM7UUFDdEMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLCtCQUErQixDQUFDLENBQUM7UUFFakYsTUFBTSxJQUFJLENBQUMsaUJBQWlCLENBQUMsWUFBWSxDQUFDLG9CQUFvQixFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBQ3hFLENBQUM7SUFFRDs7Ozs7T0FLRztJQUNILEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxZQUEwQyxFQUFFLE9BQTJEO1FBQzNILElBQUksZ0JBQU8sQ0FBQyxZQUFZLElBQUksRUFBRSxDQUFDLEVBQUU7WUFDN0IsT0FBTztTQUNWO1FBQ0QsS0FBSyxJQUFJ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