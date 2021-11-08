import {v4} from 'uuid';
import {provide} from 'midway';
import {satisfies} from 'semver';
import {
    FlattenTestResourceDependencyTree, FlattenTestResourceAuthTree,
    TestResourceDependencyTree, TestResourceOriginInfo, TestResourceOriginType, TestResourceAuthTree, TestResourceInfo
} from '../test-node-interface';
import {ResourceInfo} from '../interface';
import {first, isEmpty, isString} from 'lodash';
import {CryptoHelper} from 'egg-freelog-base';

@provide()
export class TestNodeGenerator {

    readonly dependencyNodeIdLength = 8;

    /**
     * 生成测试资源ID
     * @param nodeId
     * @param originInfo
     */
    generateTestResourceId(nodeId: number, originInfo: TestResourceOriginInfo): string {
        return CryptoHelper.md5(`freelog_test_resourceId_generate#nodeId_${nodeId}#id_${originInfo.id}#type_${originInfo.type}`);
    }

    /**
     * 生成规则ID
     * @param nodeId
     * @param ruleText
     */
    generateTestRuleId(nodeId: number, ruleText: string): string {
        return CryptoHelper.md5(`${nodeId}-${ruleText}`);
    }

    /**
     * 生存依赖树节点ID
     * @param textId
     */
    generateDependencyNodeId(textId?: string): string {
        let fullText;
        if (isString(textId) && textId.length >= this.dependencyNodeIdLength) {
            fullText = textId;
        } else {
            fullText = v4().replace(/-/g, '');
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
    convertTestResourceAuthTree(flattenAuthTree: FlattenTestResourceAuthTree[], startNid: string = '', maxDeep: number = 100, isContainRootNode: boolean = true): TestResourceAuthTree[] {

        const startedAuthTree = startNid ? flattenAuthTree.filter(x => x.nid === startNid) : flattenAuthTree.filter(x => x.deep === 1);
        if (isEmpty(startedAuthTree)) {
            return [];
        }

        maxDeep = isContainRootNode ? maxDeep : maxDeep + 1;

        function recursionBuildAuthTree(dependencies: FlattenTestResourceAuthTree[], currDeep: number = 1): TestResourceAuthTree[] {
            if (isEmpty(dependencies) || currDeep++ >= maxDeep) {
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

        return isContainRootNode ? convertedAuthTree : first(convertedAuthTree).children;
    }

    /**
     * 生成依赖树
     * @param dependencyTree
     * @param startNid
     * @param maxDeep
     * @param isContainRootNode
     */
    generateTestResourceDependencyTree(dependencyTree: FlattenTestResourceDependencyTree[], startNid: string = '', maxDeep: number = 100, isContainRootNode: boolean = true): TestResourceDependencyTree[] {

        const targetDependencyInfo = startNid ? dependencyTree.find(x => x.nid === startNid) : dependencyTree.find(x => x.deep === 1);
        if (!targetDependencyInfo) {
            return [];
        }
        maxDeep = isContainRootNode ? maxDeep : maxDeep + 1;

        function recursionBuildDependencyTree(dependencies: FlattenTestResourceDependencyTree[], currDeep: number = 1): TestResourceDependencyTree[] {
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
                    fileSha1: item.fileSha1,
                    // replaced: item.replaced,
                    dependencies: recursionBuildDependencyTree(dependencyTree.filter(x => x.parentNid === item.nid), currDeep)
                };
            });
        }

        const convertedDependencyTree = recursionBuildDependencyTree([targetDependencyInfo]);

        return isContainRootNode ? convertedDependencyTree : first(convertedDependencyTree)?.dependencies;
    }

    /**
     * 通过测试资源依赖树生成测试资源授权树
     * @param dependencyTree 拍平的依赖树信息
     * @param resourceMap 此处传入资源MAP主要是为了提高性能,方便更大批量的查询,减少查询次数
     */
    generateTestResourceAuthTree(dependencyTree: FlattenTestResourceDependencyTree[], resourceMap: Map<string, ResourceInfo>) {
        for (const dependencyInfo of dependencyTree) {
            if (dependencyInfo.type === TestResourceOriginType.Resource) {
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
    filterTestResourceDependencyTree(dependencyTree: FlattenTestResourceDependencyTree[], dependentEntityId: string, dependentEntityVersionRange: string) {

        const matchedIdSet: Set<string> = new Set();
        const testResourceDependencyTree = this.generateTestResourceDependencyTree(dependencyTree, null, 999, true);

        function entityIsMatched(dependencyInfo: TestResourceDependencyTree) {
            return dependencyInfo.id === dependentEntityId && (dependencyInfo.type === TestResourceOriginType.Object || !dependentEntityVersionRange || satisfies(dependencyInfo.version, dependentEntityVersionRange));
        }

        function recursionSetMatchResult(dependencies: TestResourceDependencyTree[]): boolean {
            if (isEmpty(dependencies)) {
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

        function recursionBuildDependencyTree(dependencies: TestResourceDependencyTree[]) {
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
    _findResolver(dependencyTree: FlattenTestResourceDependencyTree[], parent: FlattenTestResourceDependencyTree, target: FlattenTestResourceDependencyTree, resourceMap: Map<string, ResourceInfo>): FlattenTestResourceDependencyTree {
        if (!parent || target.type === TestResourceOriginType.Object) {
            return null;
        }
        const grandfather = dependencyTree.find(x => x.nid === parent.parentNid);
        if (parent.type === TestResourceOriginType.Object) {
            return this._findResolver(dependencyTree, grandfather, target, resourceMap);
        }
        const {baseUpcastResources} = resourceMap.get(parent.id);
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
    _buildAuthTree(dependencyTree: FlattenTestResourceDependencyTree[], results: FlattenTestResourceAuthTree[] = [], parent: FlattenTestResourceDependencyTree = null, deep = 1): FlattenTestResourceAuthTree[] {
        for (const dependencyInfo of dependencyTree) {
            if (dependencyInfo['resolver']?.nid !== parent?.nid) {
                continue;
            }
            const {nid, id, name, userId, type, version, versionId} = dependencyInfo;
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
    _calculateTestResourceProperty(testResource: TestResourceInfo) {
        const testResourceProperty: any = {};
        testResource.stateInfo.propertyInfo.testResourceProperty.forEach(({key, value}) => {
            testResourceProperty[key] = value;
        });
        return testResourceProperty;
    }
}
