import { FlattenPresentableDependencyTree, IOutsideApiService, IPresentableVersionService, PresentableInfo, FlattenPresentableAuthTree, PresentableDependencyTree, PresentableVersionInfo, ResourceDependencyTree, PresentableResolveResource, PresentableAuthTree } from '../../interface';
export declare class PresentableVersionService implements IPresentableVersionService {
    ctx: any;
    presentableProvider: any;
    outsideApiService: IOutsideApiService;
    presentableVersionProvider: any;
    presentableCommonChecker: any;
    findById(presentableId: string, version: string, ...args: any[]): Promise<PresentableVersionInfo>;
    findOne(condition: object, ...args: any[]): Promise<PresentableVersionInfo>;
    find(condition: object, ...args: any[]): Promise<PresentableVersionInfo[]>;
    updatePresentableRewriteProperty(presentableInfo: PresentableInfo, presentableRewriteProperty: any[]): Promise<boolean>;
    createOrUpdatePresentableVersion(presentableInfo: PresentableInfo, resourceVersionId: string): Promise<PresentableVersionInfo>;
    /**
     * 平铺结构的授权树转换为递归结构的授权树
     * @param flattenAuthTree
     * @param startNid
     * @param isContainRootNode
     * @param maxDeep
     */
    convertPresentableAuthTree(flattenAuthTree: FlattenPresentableAuthTree[], startNid: string, isContainRootNode?: boolean, maxDeep?: number): PresentableAuthTree[];
    /**
     * 平铺结构的依赖树转换为递归结构的依赖树
     * @param flattenDependencies
     * @param startNid
     * @param maxDeep
     * @returns {*}
     */
    convertPresentableDependencyTree(flattenDependencies: FlattenPresentableDependencyTree[], startNid: string, isContainRootNode?: boolean, maxDeep?: number): PresentableDependencyTree[];
    /**
     * 构建presentable授权树
     * @param dependencyTree
     * @private
     */
    _buildPresentableAuthTree(presentableInfo: PresentableInfo, dependencyTree: ResourceDependencyTree[], allVersionIds: string[]): Promise<PresentableResolveResource[]>;
    /**
     * 获取授权树
     * @param resourceId
     * @param version
     * @param dependencies
     * @param resourceVersionMap
     * @returns {*}
     * @private
     */
    _getResourceAuthTree(dependencies: ResourceDependencyTree[], resourceVersionId: string, resourceVersionMap: any): any;
    /**
     * 获取presentable解决的发行(需要包含具体的版本信息)
     * @param rootDependency
     */
    _getPresentableResolveResources(presentableInfo: PresentableInfo, rootDependency: ResourceDependencyTree): PresentableResolveResource[];
    /**
     * 从依赖树中递归获取发行的所有版本信息
     * @param dependencies
     * @param resource
     * @returns {Array}
     * @private
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
     * @param dependencyTree
     * @private
     */
    _flattenDependencyTree(presentableId: string, resourceDependencyTree: ResourceDependencyTree[]): FlattenPresentableDependencyTree[];
    /**
     * 平铺授权树
     * @param presentableResolveReleases
     * @private
     */
    _flattenPresentableAuthTree(presentableResolveResources: any): FlattenPresentableAuthTree[];
}
