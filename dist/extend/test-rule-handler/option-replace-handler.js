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
    ctx;
    importObjectEntityHandler;
    importResourceEntityHandler;
    outsideApiService;
    /**
     * 执行替换操作
     * @param testRuleInfo
     */
    async handle(testRuleInfo) {
        if (!testRuleInfo.isValid || (0, lodash_1.isEmpty)(testRuleInfo.ruleInfo.replaces) || !['alter', 'add'].includes(testRuleInfo.ruleInfo.operation)) {
            return;
        }
        const replaceRecords = [];
        await this._recursionReplace(testRuleInfo, testRuleInfo.entityDependencyTree, testRuleInfo.entityDependencyTree, [], replaceRecords);
        // 替换合计生效次数
        testRuleInfo.efficientInfos.push({
            type: 'replace', count: replaceRecords.length
        });
        testRuleInfo.replaceRecords = replaceRecords;
    }
    /**
     * 递归替换依赖树
     * @param testRuleInfo
     * @param rootDependencies
     * @param dependencies
     * @param parents
     * @param records
     */
    async _recursionReplace(testRuleInfo, rootDependencies, dependencies, parents, records) {
        if ((0, lodash_1.isEmpty)(dependencies ?? [])) {
            return;
        }
        for (let i = 0, j = dependencies.length; i < j; i++) {
            const currTreeNodeInfo = dependencies[i];
            const currPathChain = parents.concat([(0, lodash_1.pick)(currTreeNodeInfo, ['name', 'type', 'version'])]);
            const replacerInfo = await this._matchReplacer(testRuleInfo, currTreeNodeInfo, currPathChain);
            if (!replacerInfo) {
                await this._recursionReplace(testRuleInfo, rootDependencies, currTreeNodeInfo.dependencies, currPathChain, records);
                continue;
            }
            // 自己替换自己是被允许的,不用做循环检测
            if (currTreeNodeInfo.id !== replacerInfo.id) {
                const { result, deep } = this._checkCycleDependency(rootDependencies, replacerInfo);
                if (result) {
                    const msg = this.ctx.gettext(deep == 1 ? 'reflect_rule_pre_excute_error_duplicate_rely' : 'reflect_rule_pre_excute_error_circular_rely', replacerInfo.name);
                    testRuleInfo.matchErrors.push(msg);
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
     * @param testRuleInfo
     * @param targetInfo
     * @param parents
     */
    async _matchReplacer(testRuleInfo, targetInfo, parents) {
        const replaceRecords = [];
        let latestTestResourceDependencyTree = targetInfo;
        for (const replaceObjectInfo of testRuleInfo.ruleInfo.replaces) {
            const { replaced, replacer, scopes } = replaceObjectInfo;
            if (replaceObjectInfo.efficientCount === undefined) {
                replaceObjectInfo.efficientCount = 0;
            }
            if (!this._checkRuleScopeIsMatched(scopes, parents) || !this._entityIsMatched(replaced, latestTestResourceDependencyTree)) {
                continue;
            }
            const replacerIsResource = replacer.type === test_node_interface_1.TestResourceOriginType.Resource;
            const replacerInfo = await this._getReplacerInfo(replacer);
            if (!replacerInfo) {
                const msg = this.ctx.gettext(replacerIsResource ? 'reflect_rule_pre_excute_error_resource_not_existed' : 'reflect_rule_pre_excute_error_object_not_existed', replacer.name);
                testRuleInfo.matchErrors.push(msg);
                return;
            }
            const resourceVersionInfo = replacerIsResource ? this.importResourceEntityHandler.matchResourceVersion(replacerInfo, replacer.versionRange) : null;
            if (replacerIsResource && !resourceVersionInfo) {
                testRuleInfo.matchErrors.push(this.ctx.gettext('reflect_rule_pre_excute_error_version_invalid', replacer.name, replacer.versionRange));
                return;
            }
            if (replacer.type === test_node_interface_1.TestResourceOriginType.Object && replacerInfo.userId !== this.ctx.userId) {
                testRuleInfo.matchErrors.push(this.ctx.gettext('reflect_rule_pre_excute_error_access_limited', replacer.name));
                return;
            }
            // 代码执行到此,说明已经匹配成功,然后接着再结果的基础上进行再次匹配,直到替换完所有的
            const replaceRecordInfo = {
                replaced: (0, lodash_1.pick)(latestTestResourceDependencyTree, ['id', 'name', 'type', 'version'])
            };
            latestTestResourceDependencyTree = {
                id: replacerInfo[replacerIsResource ? 'resourceId' : 'objectId'],
                name: replacer.name,
                type: replacer.type,
                versionRange: replacer.versionRange,
                resourceType: replacerInfo.resourceType,
                version: resourceVersionInfo?.version,
                versionId: resourceVersionInfo?.versionId,
                fileSha1: '',
                dependencies: []
            };
            latestTestResourceDependencyTree['replacerInfo'] = replacerInfo;
            replaceRecordInfo.replacer = (0, lodash_1.pick)(latestTestResourceDependencyTree, ['id', 'name', 'type', 'version']);
            replaceRecords.push(replaceRecordInfo);
            // 单个替换统计生效次数
            replaceObjectInfo.efficientCount += 1;
        }
        if ((0, lodash_1.isEmpty)(replaceRecords)) {
            return;
        }
        // 返回被替换之后的新的依赖树(已包含自身)
        const replacer = latestTestResourceDependencyTree.type === test_node_interface_1.TestResourceOriginType.Object
            ? await this.importObjectEntityHandler.getObjectDependencyTree(latestTestResourceDependencyTree.id).then(lodash_1.first)
            : await this.importResourceEntityHandler.getResourceDependencyTree(latestTestResourceDependencyTree.id, latestTestResourceDependencyTree.version).then(lodash_1.first);
        replacer.versionRange = latestTestResourceDependencyTree.versionRange;
        replacer.replaceRecords = replaceRecords;
        // 主资源被替换,需要把新的替换者信息保存起来
        if (parents.length === 1 && (replacer.id !== testRuleInfo.testResourceOriginInfo.id || replacer.version !== testRuleInfo.testResourceOriginInfo.version)) {
            const rootResourceReplacer = {
                id: replacer.id,
                name: replacer.name,
                type: replacer.type,
                versions: replacer.versions,
                versionRange: replacer.versionRange,
                resourceType: replacer.resourceType,
                version: replacer.version
            };
            if (replacer.type === test_node_interface_1.TestResourceOriginType.Object) {
                const objectInfo = latestTestResourceDependencyTree['replacerInfo'];
                rootResourceReplacer.systemProperty = objectInfo.systemProperty;
                rootResourceReplacer.customPropertyDescriptors = objectInfo.customPropertyDescriptors;
            }
            testRuleInfo.rootResourceReplacer = rootResourceReplacer;
        }
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
        if ((0, lodash_1.isEmpty)(scopes)) {
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
        return (0, semver_1.satisfies)(targetInfo.version, scopeInfo.versionRange ?? '*');
    }
    /**
     * 检查重复依赖或者循环依赖(deep=1的循环依赖,否则为重复依赖)
     * @private
     */
    _checkCycleDependency(dependencies, targetInfo, deep = 1) {
        if ((0, lodash_1.isEmpty)(dependencies)) {
            return { result: false, deep };
        }
        if (dependencies.some(x => x.id === targetInfo.id && x.type === targetInfo.type)) {
            return { result: true, deep };
        }
        if (deep > 50) { //内部限制最大依赖树深度
            return { result: false, deep, errorMsg: this.ctx.gettext('reflect_rule_pre_excute_error_exceed_rely_limit') };
        }
        const subDependencies = (0, lodash_1.chain)(dependencies).map(m => m.dependencies).flattenDeep().value();
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
    (0, midway_1.inject)(),
    __metadata("design:type", Object)
], OptionReplaceHandler.prototype, "ctx", void 0);
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", Object)
], OptionReplaceHandler.prototype, "importObjectEntityHandler", void 0);
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", Object)
], OptionReplaceHandler.prototype, "importResourceEntityHandler", void 0);
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", Object)
], OptionReplaceHandler.prototype, "outsideApiService", void 0);
OptionReplaceHandler = __decorate([
    (0, midway_1.provide)()
], OptionReplaceHandler);
exports.OptionReplaceHandler = OptionReplaceHandler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3B0aW9uLXJlcGxhY2UtaGFuZGxlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9leHRlbmQvdGVzdC1ydWxlLWhhbmRsZXIvb3B0aW9uLXJlcGxhY2UtaGFuZGxlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7QUFBQSxtQ0FBaUM7QUFDakMsbUNBQXVDO0FBQ3ZDLG1DQUFtRDtBQUVuRCxtRUFLbUM7QUFJbkMsSUFBYSxvQkFBb0IsR0FBakMsTUFBYSxvQkFBb0I7SUFHN0IsR0FBRyxDQUFpQjtJQUVwQix5QkFBeUIsQ0FBQztJQUUxQiwyQkFBMkIsQ0FBQztJQUU1QixpQkFBaUIsQ0FBcUI7SUFFdEM7OztPQUdHO0lBQ0gsS0FBSyxDQUFDLE1BQU0sQ0FBQyxZQUErQjtRQUV4QyxJQUFJLENBQUMsWUFBWSxDQUFDLE9BQU8sSUFBSSxJQUFBLGdCQUFPLEVBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsT0FBTyxFQUFFLEtBQUssQ0FBQyxDQUFDLFFBQVEsQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxFQUFFO1lBQ2pJLE9BQU87U0FDVjtRQUVELE1BQU0sY0FBYyxHQUFHLEVBQUUsQ0FBQztRQUMxQixNQUFNLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxZQUFZLEVBQUUsWUFBWSxDQUFDLG9CQUFvQixFQUFFLFlBQVksQ0FBQyxvQkFBb0IsRUFBRSxFQUFFLEVBQUUsY0FBYyxDQUFDLENBQUM7UUFFckksV0FBVztRQUNYLFlBQVksQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDO1lBQzdCLElBQUksRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFFLGNBQWMsQ0FBQyxNQUFNO1NBQ2hELENBQUMsQ0FBQztRQUNILFlBQVksQ0FBQyxjQUFjLEdBQUcsY0FBYyxDQUFDO0lBQ2pELENBQUM7SUFFRDs7Ozs7OztPQU9HO0lBQ0gsS0FBSyxDQUFDLGlCQUFp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