"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestNodeGenerator = void 0;
const uuid_1 = require("uuid");
const midway_1 = require("midway");
const semver_1 = require("semver");
const test_node_interface_1 = require("../test-node-interface");
const lodash_1 = require("lodash");
const egg_freelog_base_1 = require("egg-freelog-base");
let TestNodeGenerator = class TestNodeGenerator {
    dependencyNodeIdLength = 8;
    /**
     * 生成测试资源ID
     * @param nodeId
     * @param originInfo
     */
    generateTestResourceId(nodeId, originInfo) {
        return egg_freelog_base_1.CryptoHelper.md5(`freelog_test_resourceId_generate#nodeId_${nodeId}#id_${originInfo.id}#type_${originInfo.type}`);
    }
    /**
     * 生成规则ID
     * @param nodeId
     * @param ruleText
     */
    generateTestRuleId(nodeId, ruleText) {
        return egg_freelog_base_1.CryptoHelper.md5(`${nodeId}-${ruleText}`);
    }
    /**
     * 生存依赖树节点ID
     * @param textId
     */
    generateDependencyNodeId(textId) {
        let fullText;
        if ((0, lodash_1.isString)(textId) && textId.length >= this.dependencyNodeIdLength) {
            fullText = textId;
        }
        else {
            fullText = (0, uuid_1.v4)().replace(/-/g, '');
        }
        return fullText.substr(0, this.dependencyNodeIdLength);
    }
    /**
     * 转换测试资源授权树
     * @param flattenAuthTree
     * @param startNid
     * @param maxDeep
     * @param isContainRootNode
     */
    convertTestResourceAuthTree(flattenAuthTree, startNid = '', maxDeep = 100, isContainRootNode = true) {
        const startedAuthTree = startNid ? flattenAuthTree.filter(x => x.nid === startNid) : flattenAuthTree.filter(x => x.deep === 1);
        if ((0, lodash_1.isEmpty)(startedAuthTree)) {
            return [];
        }
        maxDeep = isContainRootNode ? maxDeep : maxDeep + 1;
        function recursionBuildAuthTree(dependencies, currDeep = 1) {
            if ((0, lodash_1.isEmpty)(dependencies) || currDeep++ >= maxDeep) {
                return [];
            }
            return dependencies.map(item => {
                return {
                    nid: item.nid,
                    id: item.id,
                    name: item.name,
                    type: item.type,
                    version: item.version,
                    versionId: item.versionId,
                    userId: item.userId,
                    children: recursionBuildAuthTree(flattenAuthTree.filter(x => x.parentNid === item.nid), currDeep + 1)
                };
            });
        }
        const convertedAuthTree = recursionBuildAuthTree(startedAuthTree);
        return isContainRootNode ? convertedAuthTree : (0, lodash_1.first)(convertedAuthTree).children;
    }
    /**
     * 生成依赖树
     * @param dependencyTree
     * @param startNid
     * @param maxDeep
     * @param isContainRootNode
     */
    generateTestResourceDependencyTree(dependencyTree, startNid = '', maxDeep = 100, isContainRootNode = true) {
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
                    // replaced: item.replaced,
                    dependencies: recursionBuildDependencyTree(dependencyTree.filter(x => x.parentNid === item.nid), currDeep)
                };
            });
        }
        const convertedDependencyTree = recursionBuildDependencyTree([targetDependencyInfo]);
        return isContainRootNode ? convertedDependencyTree : (0, lodash_1.first)(convertedDependencyTree)?.dependencies;
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
            return dependencyInfo.id === dependentEntityId && (dependencyInfo.type === test_node_interface_1.TestResourceOriginType.Object || !dependentEntityVersionRange || (0, semver_1.satisfies)(dependencyInfo.version, dependentEntityVersionRange));
        }
        function recursionSetMatchResult(dependencies) {
            if ((0, lodash_1.isEmpty)(dependencies)) {
                return false;
            }
            for (let i = 0, j = dependencies.length; i < j; i++) {
                let dependencyInfo = dependencies[i];
                if (entityIsMatched(dependencyInfo)) {
                    matchedIdSet.add(dependencyInfo.nid);
                    return true;
                }
                //自身匹配或者子依赖有匹配的
                if (recursionSetMatchResult(dependencyInfo.dependencies)) {
                    matchedIdSet.add(dependencyInfo.nid);
                    if (i + 1 < j) { // 最后一个则返回,否则需要把所有分支都遍历
                        continue;
                    }
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
            const { nid, id, name, userId, type, version, versionId } = dependencyInfo;
            results.push({
                id, nid, name, userId, type, version, versionId,
                deep, parentNid: parent?.nid ?? ''
            });
            this._buildAuthTree(dependencyTree, results, dependencyInfo, deep + 1);
        }
        return results;
    }
    /**
     * 计算测试资源属性
     * @param testResource
     */
    _calculateTestResourceProperty(testResource) {
        const testResourceProperty = {};
        testResource.stateInfo.propertyInfo.testResourceProperty.forEach(({ key, value }) => {
            testResourceProperty[key] = value;
        });
        return testResourceProperty;
    }
};
TestNodeGenerator = __decorate([
    (0, midway_1.provide)()
], TestNodeGenerator);
exports.TestNodeGenerator = TestNodeGenerator;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdC1ub2RlLWdlbmVyYXRvci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9leHRlbmQvdGVzdC1ub2RlLWdlbmVyYXRvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUFBQSwrQkFBd0I7QUFDeEIsbUNBQStCO0FBQy9CLG1DQUFpQztBQUNqQyxnRUFHZ0M7QUFFaEMsbUNBQWdEO0FBQ2hELHVEQUE4QztBQUc5QyxJQUFhLGlCQUFpQixHQUE5QixNQUFhLGlCQUFpQjtJQUVqQixzQkFBc0IsR0FBRyxDQUFDLENBQUM7SUFFcEM7Ozs7T0FJRztJQUNILHNCQUFzQixDQUFDLE1BQWMsRUFBRSxVQUFrQztRQUNyRSxPQUFPLCtCQUFZLENBQUMsR0FBRyxDQUFDLDJDQUEyQyxNQUFNLE9BQU8sVUFBVSxDQUFDLEVBQUUsU0FBUyxVQUFVLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQztJQUM3SCxDQUFDO0lBRUQ7Ozs7T0FJRztJQUNILGtCQUFrQixDQUFDLE1BQWMsRUFBRSxRQUFnQjtRQUMvQyxPQUFPLCtCQUFZLENBQUMsR0FBRyxDQUFDLEdBQUcsTUFBTSxJQUFJLFFBQVEsRUFBRSxDQUFDLENBQUM7SUFDckQsQ0FBQztJQUVEOzs7T0FHRztJQUNILHdCQUF3QixDQUFDLE1BQWU7UUFDcEMsSUFBSSxRQUFRLENBQUM7UUFDYixJQUFJLElBQUEsaUJBQVEsRUFBQyxNQUFNLENBQUMsSUFBSSxNQUFNLENBQUMsTUFBTSxJQUFJLElBQUksQ0FBQyxzQkFBc0IsRUFBRTtZQUNsRSxRQUFRLEdBQUcsTUFBTSxDQUFDO1NBQ3JCO2FBQU07WUFDSCxRQUFRLEdBQUcsSUFBQSxTQUFFLEdBQUUsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1NBQ3JDO1FBQ0QsT0FBTyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsc0JBQXNCLENBQUMsQ0FBQztJQUMzRCxDQUFDO0lB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