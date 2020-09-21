"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestNodeGenerator = void 0;
const midway_1 = require("midway");
const test_node_interface_1 = require("../test-node-interface");
const crypto_helper_1 = require("egg-freelog-base/app/extend/helper/crypto_helper");
const lodash_1 = require("lodash");
const uuid_1 = require("uuid");
const semver_1 = require("semver");
let TestNodeGenerator = class TestNodeGenerator {
    constructor() {
        this.dependencyNodeIdLength = 12;
    }
    /**
     * 生成测试资源ID
     * @param nodeId
     * @param originInfo
     */
    generateTestResourceId(nodeId, originInfo) {
        return crypto_helper_1.md5(`${nodeId}-${originInfo.id}-${originInfo.type}`);
    }
    /**
     * 生成规则ID
     * @param nodeId
     * @param ruleText
     */
    generateTestRuleId(nodeId, ruleText) {
        return crypto_helper_1.md5(`${nodeId}-${ruleText}`);
    }
    /**
     * 生存依赖树节点ID
     * @param textId
     */
    generateDependencyNodeId(textId) {
        let fullText = '';
        if (lodash_1.isString(textId) && textId.length >= this.dependencyNodeIdLength) {
            fullText = textId;
        }
        else {
            fullText = uuid_1.v4().replace(/-/g, '');
        }
        return fullText.substr(0, this.dependencyNodeIdLength);
    }
    /**
     * 生成依赖树
     * @param dependencyTree
     * @param startNid
     * @param maxDeep
     * @param isContainRootNode
     */
    generateTestResourceDependencyTree(dependencyTree, startNid = "", maxDeep = 100, isContainRootNode = true) {
        const targetDependencyInfo = startNid ? dependencyTree.find(x => x.nid === startNid) : dependencyTree.find(x => x.deep === 1);
        if (!targetDependencyInfo) {
            return [];
        }
        maxDeep = isContainRootNode ? maxDeep : maxDeep + 1;
        function recursionBuildDependencyTree(dependencies, currDeep = 1) {
            if (!dependencies.length || currDeep++ >= maxDeep) {
                return [];
            }
            return dependencies.map(item => {
                return {
                    id: item.id,
                    name: item.name,
                    nid: item.nid,
                    type: item.type,
                    resourceType: item.resourceType,
                    version: item.version,
                    versionId: item.versionId,
                    dependencies: recursionBuildDependencyTree(dependencyTree.filter(x => x.parentNid === item.nid), currDeep)
                };
            });
        }
        const convertedDependencyTree = recursionBuildDependencyTree([targetDependencyInfo]);
        return isContainRootNode ? convertedDependencyTree : lodash_1.first(convertedDependencyTree)?.dependencies;
    }
    /**
     * 通过测试资源依赖树生成测试资源授权树
     * @param dependencyTree 拍平的依赖树信息
     * @param resourceMap 此处传入资源MAP主要是为了提高性能,方便更大批量的查询,减少查询次数
     */
    generateTestResourceAuthTree(dependencyTree, resourceMap) {
        for (const dependencyInfo of dependencyTree) {
            if (dependencyInfo.type === test_node_interface_1.TestResourceOriginType.Resource) {
                dependencyInfo.userId = resourceMap.get(dependencyInfo.id)?.userId ?? 0;
            }
            const parent = dependencyTree.find(x => x.nid == dependencyInfo.parentNid);
            dependencyInfo['resolver'] = this._findResolver(dependencyTree, parent, dependencyInfo, resourceMap);
        }
        return this._buildAuthTree(dependencyTree);
    }
    /**
     * 过滤测试资源依赖树.截止到指定的依赖项以及其依赖项的所有上游依赖
     * @param dependencyTree
     * @param dependentEntityId
     * @param dependentEntityVersionRange
     */
    filterTestResourceDependencyTree(dependencyTree, dependentEntityId, dependentEntityVersionRange) {
        const matchedIdSet = new Set();
        const testResourceDependencyTree = this.generateTestResourceDependencyTree(dependencyTree, null, 999, true);
        function entityIsMatched(dependencyInfo) {
            return dependencyInfo.id === dependentEntityId && (dependencyInfo.type === test_node_interface_1.TestResourceOriginType.Object || !dependentEntityVersionRange || semver_1.satisfies(dependencyInfo.version, dependentEntityVersionRange));
        }
        function recursionSetMatchResult(dependencies) {
            if (lodash_1.isEmpty(dependencies)) {
                return false;
            }
            for (let i = 0, j = dependencies.length; i < j; i++) {
                let dependencyInfo = dependencies[i];
                //自身匹配或者子依赖有匹配的
                if (entityIsMatched(dependencyInfo) || recursionSetMatchResult(dependencyInfo.dependencies)) {
                    matchedIdSet.add(dependencyInfo.nid);
                    return true;
                }
                //当前依赖的全部子依赖全部遍历完依然没有匹配的,则当前依赖不匹配
                if (i + 1 === j) {
                    return false;
                }
            }
        }
        function recursionBuildDependencyTree(dependencies) {
            return dependencies.filter(x => matchedIdSet.has(x.nid)).map(item => {
                return {
                    id: item.id,
                    name: item.name,
                    type: item.type,
                    version: item.version,
                    dependencies: recursionBuildDependencyTree(item.dependencies)
                };
            });
        }
        recursionSetMatchResult(testResourceDependencyTree);
        return recursionBuildDependencyTree(testResourceDependencyTree);
    }
    /**
     * 沿着依赖链往下游查找目标资源的解决方信息(乙方)
     * @param dependencyTree
     * @param parent
     * @param target
     * @param resourceMap
     * @private
     */
    _findResolver(dependencyTree, parent, target, resourceMap) {
        if (!parent || target.type === test_node_interface_1.TestResourceOriginType.Object) {
            return null;
        }
        const grandfather = dependencyTree.find(x => x.nid === parent.parentNid);
        if (parent.type === test_node_interface_1.TestResourceOriginType.Object) {
            return this._findResolver(dependencyTree, grandfather, target, resourceMap);
        }
        const { baseUpcastResources } = resourceMap.get(parent.id);
        //如果上抛中有,则递归接着找,否则代表当前层解决
        if (baseUpcastResources.some(x => x.resourceId === target.id)) {
            return this._findResolver(dependencyTree, grandfather, target, resourceMap);
        }
        return parent;
    }
    /**
     * 构建授权树
     * @param dependencyTree
     * @param results
     * @param parent
     * @param deep
     * @private
     */
    _buildAuthTree(dependencyTree, results = [], parent = null, deep = 1) {
        for (const dependencyInfo of dependencyTree) {
            if (dependencyInfo['resolver']?.nid !== parent?.nid) {
                continue;
            }
            const { nid, id, name, userId, type, version, versionId, resourceType } = dependencyInfo;
            results.push({
                id, nid, name, userId, type, version, versionId,
                resourceType, deep, parentNid: parent?.nid ?? ''
            });
            this._buildAuthTree(dependencyTree, results, dependencyInfo, deep + 1);
        }
        return results;
    }
};
TestNodeGenerator = __decorate([
    midway_1.provide()
], TestNodeGenerator);
exports.TestNodeGenerator = TestNodeGenerator;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdC1ub2RlLWdlbmVyYXRvci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9leHRlbmQvdGVzdC1ub2RlLWdlbmVyYXRvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUFBQSxtQ0FBK0I7QUFDL0IsZ0VBTWdDO0FBQ2hDLG9GQUFvRTtBQUNwRSxtQ0FBZ0Q7QUFDaEQsK0JBQXdCO0FBRXhCLG1DQUFpQztBQUdqQyxJQUFhLGlCQUFpQixHQUE5QixNQUFhLGlCQUFpQjtJQUE5QjtRQUVhLDJCQUFzQixHQUFHLEVBQUUsQ0FBQztJQXdMekMsQ0FBQztJQXRMRzs7OztPQUlHO0lBQ0gsc0JBQXNCLENBQUMsTUFBYyxFQUFFLFVBQWtDO1FBQ3JFLE9BQU8sbUJBQUcsQ0FBQyxHQUFHLE1BQU0sSUFBSSxVQUFVLENBQUMsRUFBRSxJQUFJLFVBQVUsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDO0lBQ2hFLENBQUM7SUFFRDs7OztPQUlHO0lBQ0gsa0JBQWtCLENBQUMsTUFBYyxFQUFFLFFBQWdCO1FBQy9DLE9BQU8sbUJBQUcsQ0FBQyxHQUFHLE1BQU0sSUFBSSxRQUFRLEVBQUUsQ0FBQyxDQUFDO0lBQ3hDLENBQUM7SUFFRDs7O09BR0c7SUFDSCx3QkFBd0IsQ0FBQyxNQUFlO1FBQ3BDLElBQUksUUFBUSxHQUFHLEVBQUUsQ0FBQTtRQUNqQixJQUFJLGlCQUFRLENBQUMsTUFBTSxDQUFDLElBQUksTUFBTSxDQUFDLE1BQU0sSUFBSSxJQUFJLENBQUMsc0JBQXNCLEVBQUU7WUFDbEUsUUFBUSxHQUFHLE1BQU0sQ0FBQztTQUNyQjthQUFNO1lBQ0gsUUFBUSxHQUFHLFNBQUUsRUFBRSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUM7U0FDckM7UUFDRCxPQUFPLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO0lBQzNELENBQUM7SUFFRDs7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