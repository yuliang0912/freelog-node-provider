import { FlattenTestResourceDependencyTree, FlattenTestResourceAuthTree, TestResourceDependencyTree, TestResourceOriginInfo } from '../test-node-interface';
import { ResourceInfo } from "../interface";
export declare class TestNodeGenerator {
    readonly dependencyNodeIdLength = 12;
    /**
     * 生成测试资源ID
     * @param nodeId
     * @param originInfo
     */
    generateTestResourceId(nodeId: number, originInfo: TestResourceOriginInfo): string;
    /**
     * 生成规则ID
     * @param nodeId
     * @param ruleText
     */
    generateTestRuleId(nodeId: number, ruleText: string): string;
    /**
     * 生存依赖树节点ID
     * @param textId
     */
    generateDependencyNodeId(textId?: string): string;
    /**
     * 生成依赖树
     * @param dependencyTree
     * @param startNid
     * @param maxDeep
     * @param isContainRootNode
     */
    generateTestResourceDependencyTree(dependencyTree: FlattenTestResourceDependencyTree[], startNid?: string, maxDeep?: number, isContainRootNode?: boolean): TestResourceDependencyTree[];
    /**
     * 通过测试资源依赖树生成测试资源授权树
     * @param dependencyTree 拍平的依赖树信息
     * @param resourceMap 此处传入资源MAP主要是为了提高性能,方便更大批量的查询,减少查询次数
     */
    generateTestResourceAuthTree(dependencyTree: FlattenTestResourceDependencyTree[], resourceMap: Map<string, ResourceInfo>): FlattenTestResourceAuthTree[];
    /**
     * 过滤测试资源依赖树.截止到指定的依赖项以及其依赖项的所有上游依赖
     * @param dependencyTree
     * @param dependentEntityId
     * @param dependentEntityVersionRange
     */
    filterTestResourceDependencyTree(dependencyTree: FlattenTestResourceDependencyTree[], dependentEntityId: string, dependentEntityVersionRange: string): any;
    /**
     * 沿着依赖链往下游查找目标资源的解决方信息(乙方)
     * @param dependencyTree
     * @param parent
     * @param target
     * @param resourceMap
     * @private
     */
    _findResolver(dependencyTree: FlattenTestResourceDependencyTree[], parent: FlattenTestResourceDependencyTree, target: FlattenTestResourceDependencyTree, resourceMap: Map<string, ResourceInfo>): FlattenTestResourceDependencyTree;
    /**
     * 构建授权树
     * @param dependencyTree
     * @param results
     * @param parent
     * @param deep
     * @private
     */
    _buildAuthTree(dependencyTree: FlattenTestResourceDependencyTree[], results?: FlattenTestResourceAuthTree[], parent?: FlattenTestResourceDependencyTree, deep?: number): FlattenTestResourceAuthTree[];
}
