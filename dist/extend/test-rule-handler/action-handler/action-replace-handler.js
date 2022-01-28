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
exports.ActionReplaceHandler = void 0;
const semver_1 = require("semver");
const midway_1 = require("midway");
const lodash_1 = require("lodash");
const test_node_interface_1 = require("../../../test-node-interface");
const import_object_entity_handler_1 = require("../import/import-object-entity-handler");
const import_resource_entity_handler_1 = require("../import/import-resource-entity-handler");
const test_rule_checker_1 = require("../test-rule-checker");
let ActionReplaceHandler = class ActionReplaceHandler {
    ctx;
    testRuleChecker;
    importObjectEntityHandler;
    importResourceEntityHandler;
    outsideApiService;
    /**
     * 执行替换操作
     * @param ctx
     * @param testRuleInfo
     * @param action
     */
    async handle(ctx, testRuleInfo, action) {
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
    async recursionReplace(ctx, testRuleInfo, action, rootDependencies, dependencies, parents) {
        if ((0, lodash_1.isEmpty)(dependencies ?? [])) {
            return;
        }
        for (let i = 0, j = dependencies.length; i < j; i++) {
            const currDependencyInfo = dependencies[i];
            const currPathChain = parents.concat([(0, lodash_1.pick)(currDependencyInfo, ['name', 'type', 'version'])]);
            if (!this.checkRuleScopeIsMatched(action.content.scopes, currPathChain)) {
                continue;
            }
            const replacerInfo = await this.matchReplacer(ctx, testRuleInfo, action, currDependencyInfo);
            if (!replacerInfo) {
                await this.recursionReplace(ctx, testRuleInfo, action, rootDependencies, currDependencyInfo.dependencies, currPathChain);
                continue;
            }
            // 替换者的依赖树
            const replacerDependencyTree = await this.getEntityDependencyTree(replacerInfo.type, replacerInfo.id, replacerInfo.version).then(lodash_1.first);
            replacerDependencyTree.versionRange = replacerInfo.versionRange;
            // 自己替换自己是被允许的,不用做循环检测
            if (currDependencyInfo.id !== replacerInfo.id) {
                const { result, deep } = this.checkCycleDependency(ctx, rootDependencies, replacerDependencyTree);
                if (result) {
                    const msg = ctx.gettext(deep == 1 ? 'reflect_rule_pre_excute_error_duplicate_rely' : 'reflect_rule_pre_excute_error_circular_rely', replacerInfo.name);
                    testRuleInfo.matchErrors.push(msg);
                    continue;
                }
            }
            // 主资源被替换,需要把新的替换者信息保存起来
            if (currPathChain.length === 1 && (replacerInfo.id !== testRuleInfo.testResourceOriginInfo.id || replacerInfo.version !== testRuleInfo.testResourceOriginInfo.version)) {
                if (replacerInfo.type === test_node_interface_1.TestResourceOriginType.Object) {
                    this.testRuleChecker.fillEntityPropertyMap(testRuleInfo, replacerInfo['systemProperty'], replacerInfo['customPropertyDescriptors']);
                }
                else {
                    replacerInfo.versionRange = testRuleInfo.testResourceOriginInfo.versionRange;
                }
                testRuleInfo.testResourceOriginInfo = replacerInfo;
            }
            dependencies.splice(i, 1, replacerDependencyTree);
            testRuleInfo.replaceRecords.push({
                replaced: (0, lodash_1.pick)(currDependencyInfo, ['id', 'name', 'type', 'version', 'versionRange']),
                replacer: (0, lodash_1.pick)(replacerDependencyTree, ['id', 'name', 'type', 'version', 'versionRange'])
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
    async matchReplacer(ctx, testRuleInfo, action, targetInfo) {
        if (!this.entityIsMatched(action.content.replaced, targetInfo)) {
            return;
        }
        const { replacer } = action.content;
        const replacerIsObject = replacer.type === test_node_interface_1.TestResourceOriginType.Object;
        const replacerIsResource = replacer.type === test_node_interface_1.TestResourceOriginType.Resource;
        const replacerInfo = await this.getReplacerInfo(ctx, replacer);
        if (!replacerInfo) {
            const msg = ctx.gettext(replacerIsResource ? 'reflect_rule_pre_excute_error_resource_not_existed' : 'reflect_rule_pre_excute_error_object_not_existed', replacer.name);
            testRuleInfo.matchErrors.push(msg);
            return;
        }
        const resourceVersionInfo = replacerIsResource ? this.importResourceEntityHandler.matchResourceVersion(replacerInfo, replacer.versionRange) : null;
        if (replacerIsResource && !resourceVersionInfo) {
            testRuleInfo.matchErrors.push(ctx.gettext('reflect_rule_pre_excute_error_version_invalid', replacer.name, replacer.versionRange));
            return;
        }
        if (replacerIsObject && replacerInfo.userId !== ctx.userId) {
            testRuleInfo.matchErrors.push(ctx.gettext('reflect_rule_pre_excute_error_access_limited', replacer.name));
            return;
        }
        if (replacerIsObject && !replacerInfo.resourceType) {
            testRuleInfo.matchErrors.push(this.ctx.gettext('reflect_rule_pre_excute_error_no_resource_type', replacer.name));
            return;
        }
        if (replacerIsObject) {
            const objectInfo = replacerInfo;
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
            };
        }
        const resourceInfo = replacerInfo;
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
            systemProperty: resourceVersionInfo.systemProperty,
            customPropertyDescriptors: resourceVersionInfo.customPropertyDescriptors
        };
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
    checkRuleScopeIsMatched(candidateScopes, parents) {
        if ((0, lodash_1.isEmpty)(candidateScopes)) {
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
    entityIsMatched(candidateInfo, targetInfo) {
        if (candidateInfo.name !== targetInfo.name || candidateInfo.type !== targetInfo.type) {
            return false;
        }
        if (candidateInfo.type === test_node_interface_1.TestResourceOriginType.Object) {
            return true;
        }
        return (0, semver_1.satisfies)(targetInfo.version, candidateInfo.versionRange ?? '*');
    }
    /**
     * 检查重复依赖或者循环依赖(deep=1的循环依赖,否则为重复依赖)
     * @private
     */
    checkCycleDependency(ctx, dependencies, targetInfo, deep = 1) {
        if ((0, lodash_1.isEmpty)(dependencies)) {
            return { result: false, deep };
        }
        if (dependencies.some(x => x.id === targetInfo.id && x.type === targetInfo.type)) {
            return { result: true, deep };
        }
        if (deep > 50) { //内部限制最大依赖树深度
            return { result: false, deep, errorMsg: ctx.gettext('reflect_rule_pre_excute_error_exceed_rely_limit') };
        }
        const subDependencies = (0, lodash_1.chain)(dependencies).map(m => m.dependencies).flattenDeep().value();
        return this.checkCycleDependency(ctx, subDependencies, targetInfo, deep + 1);
    }
    /**
     * 获取替换对象信息
     * @param ctx
     * @param replacer
     * @private
     */
    async getReplacerInfo(ctx, replacer) {
        return replacer.type === test_node_interface_1.TestResourceOriginType.Object
            ? this.outsideApiService.getObjectInfo(replacer.name)
            : this.outsideApiService.getResourceInfo(replacer.name, { projection: 'resourceId,userId,coverImages,resourceName,resourceType,resourceVersions,latestVersion' });
    }
    /**
     * 获取依赖树
     * @param entityType
     * @param entityId
     * @param entityVersion
     * @private
     */
    async getEntityDependencyTree(entityType, entityId, entityVersion) {
        if (entityType === test_node_interface_1.TestResourceOriginType.Resource) {
            return this.importResourceEntityHandler.getResourceDependencyTree(entityId, entityVersion);
        }
        return this.importObjectEntityHandler.getObjectDependencyTree(entityId);
    }
};
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", Object)
], ActionReplaceHandler.prototype, "ctx", void 0);
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", test_rule_checker_1.TestRuleChecker)
], ActionReplaceHandler.prototype, "testRuleChecker", void 0);
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", import_object_entity_handler_1.ImportObjectEntityHandler)
], ActionReplaceHandler.prototype, "importObjectEntityHandler", void 0);
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", import_resource_entity_handler_1.ImportResourceEntityHandler)
], ActionReplaceHandler.prototype, "importResourceEntityHandler", void 0);
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", Object)
], ActionReplaceHandler.prototype, "outsideApiService", void 0);
ActionReplaceHandler = __decorate([
    (0, midway_1.provide)()
], ActionReplaceHandler);
exports.ActionReplaceHandler = ActionReplaceHandler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWN0aW9uLXJlcGxhY2UtaGFuZGxlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3NyYy9leHRlbmQvdGVzdC1ydWxlLWhhbmRsZXIvYWN0aW9uLWhhbmRsZXIvYWN0aW9uLXJlcGxhY2UtaGFuZGxlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7QUFBQSxtQ0FBaUM7QUFDakMsbUNBQXVDO0FBQ3ZDLG1DQUFtRDtBQUVuRCxzRUFLc0M7QUFFdEMseUZBQWlGO0FBQ2pGLDZGQUFxRjtBQUNyRiw0REFBcUQ7QUFHckQsSUFBYSxvQkFBb0IsR0FBakMsTUFBYSxvQkFBb0I7SUFHN0IsR0FBRyxDQUFpQjtJQUVwQixlQUFlLENBQWtCO0lBRWpDLHlCQUF5QixDQUE0QjtJQUVyRCwyQkFBMkIsQ0FBOEI7SUFFekQsaUJBQWlCLENBQXFCO0lBRXRDOzs7OztPQUtHO0lBQ0gsS0FBSyxDQUFDLE1BQU0sQ0FBQyxHQUFtQixFQUFFLFlBQStCLEVBQUUsTUFBOEI7UUFFN0YsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsUUFBUSxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUU7WUFDdEQsT0FBTyxLQUFLLENBQUM7U0FDaEI7UUFFRCxvQkFBb0I7UUFDcEIsSUFBSSxDQUFDLFlBQVksQ0FBQyxvQkFBb0IsRUFBRTtZQUNwQyxNQUFNLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxZQUFZLENBQUMsc0JBQXNCLENBQUMsSUFBSSxFQUFFLFlBQVksQ0FBQyxzQkFBc0IsQ0FBQyxFQUFFLEVBQUUsWUFBWSxDQUFDLHNCQUFzQixDQUFDLE9BQU8sQ0FBQztpQkFDNUosSUFBSSxDQUFDLGNBQWMsQ0FBQyxFQUFFLENBQUMsWUFBWSxDQUFDLG9CQUFvQixHQUFHLGNBQWMsQ0FBQyxDQUFDO1NBQ25GO1FBRUQsWUFBWSxDQUFDLGNBQWMsR0FBRyxZQUFZLENBQUMsY0FBYyxJQUFJLEVBQUUsQ0FB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