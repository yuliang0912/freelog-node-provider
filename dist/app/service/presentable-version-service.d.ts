import { FreelogContext } from 'egg-freelog-base';
import { FlattenPresentableDependencyTree, IOutsideApiService, IPresentableVersionService, PresentableInfo, FlattenPresentableAuthTree, PresentableDependencyTree, PresentableVersionInfo, ResourceDependencyTree, PresentableResolveResource, PresentableAuthTree } from '../../interface';
export declare class PresentableVersionService implements IPresentableVersionService {
    ctx: FreelogContext;
    presentableProvider: any;
    outsideApiService: IOutsideApiService;
    presentableVersionProvider: any;
    presentableCommonChecker: any;
    findById(presentableId: string, version: string, ...args: any[]): Promise<PresentableVersionInfo>;
    findByIds(presentableVersionIds: string[], ...args: any[]): Promise<PresentableVersionInfo[]>;
    findOne(condition: object, ...args: any[]): Promise<PresentableVersionInfo>;
    find(condition: object, ...args: any[]): Promise<PresentableVersionInfo[]>;
    updatePresentableRewriteProperty(presentableInfo: PresentableInfo, presentableRewriteProperty: any[]): Promise<boolean>;
    createOrUpdatePresentableVersion(presentableInfo: PresentableInfo, resourceVersionId: string): Promise<PresentableVersionInfo>;
    /**
     * 平铺结构的授权树转换为递归结构的授权树
     * @param presentableInfo
     * @param flattenAuthTree
     */
    getRelationTree(presentableInfo: PresentableInfo, versionInfo: PresentableVersionInfo, flattenDependencies: FlattenPresentableDependencyTree[]): Promise<{
        resourceId: string;
        resourceName: string;
        resourceType: string;
        versionRanges: any[];
        versions: string[];
        children: import("../../interface").ResolveResource[];
    }[]>;
    /**
     * 平铺结构的授权树转换为递归结构的授权树
     * @param presentableInfo
     * @param flattenAuthTree
     */
    convertPresentableAuthTreeWithContracts(presentableInfo: PresentableInfo, flattenAuthTree: FlattenPresentableAuthTree[]): Promise<PresentableAuthTree[][]>;
    /**
     * 平铺结构的依赖树转换为递归结构的依赖树
     * @param flattenDependencies
     * @param startNid
     * @param isContainRootNode
     * @param maxDeep
     */
    convertPresentableDependencyTree(flattenDependencies: FlattenPresentableDependencyTree[], startNid: string, isContainRootNode?: boolean, maxDeep?: number): PresentableDependencyTree[];
    /**
     * 构建presentable授权树
     * @param presentableInfo
     * @param dependencyTree
     * @param allVersionIds
     */
    _buildPresentableAuthTree(presentableInfo: PresentableInfo, dependencyTree: ResourceDependencyTree[], allVersionIds: string[]): Promise<PresentableResolveResource[]>;
    /**
     * 获取授权树
     * @param dependencies
     * @param resourceVersionId
     * @param resourceVersionMap
     */
    _getResourceAuthTree(dependencies: ResourceDependencyTree[], resourceVersionId: string, resourceVersionMap: any): any;
    /**
     * 获取presentable解决的发行(需要包含具体的版本信息)
     * @param presentableInfo
     * @param rootDependency
     */
    _getPresentableResolveResources(presentableInfo: PresentableInfo, rootDependency: ResourceDependencyTree): PresentableResolveResource[];
    /**
     * 从依赖树中递归获取发行的所有版本信息
     * @param dependencies
     * @param resourceInfo
     * @param list
     */
    _findResourceVersionFromDependencyTree(dependencies: any, resourceInfo: any, list?: any[]): any[];
    /**
     * 生成随机字符串
     * @param length
     * @private
     */
    _generateRandomStr(length?: number): any;
    /**
     * 综合计算获得版本的最终属性
     * @param resourceSystemProperty
     * @param resourceCustomPropertyDescriptors
     * @param presentableRewriteProperty
     * @returns {Promise<void>}
     */
    _calculatePresentableVersionProperty(resourceSystemProperty: object, resourceCustomPropertyDescriptors: Array<any>, presentableRewriteProperty: Array<any>): any;
    /**
     * 平铺依赖树
     * @param presentableId
     * @param resourceDependencyTree
     */
    _flattenDependencyTree(presentableId: string, resourceDependencyTree: ResourceDependencyTree[]): FlattenPresentableDependencyTree[];
    /**
     * 平铺授权树
     * @param presentableResolveResources
     */
    _flattenPresentableAuthTree(presentableResolveResources: any): FlattenPresentableAuthTree[];
}
