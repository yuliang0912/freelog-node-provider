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
            // if (dependencyInfo.type === TestResourceOriginType.Resource) {
            //     dependencyInfo.userId = resourceMap.get(dependencyInfo.id)?.userId ?? 0;
            // }
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
            const { nid, id, name, type, version, versionId } = dependencyInfo;
            results.push({
                id, nid, name, type, version, versionId, deep, parentNid: parent?.nid ?? ''
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