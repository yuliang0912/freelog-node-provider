import { IOutsideApiService, PresentableInfo, PresentableVersionAuthTreeInfo, PresentableVersionDependencyTreeInfo } from '../../interface';
export declare class PresentableVersionService {
    ctx: any;
    presentableProvider: any;
    outsideApiService: IOutsideApiService;
    presentableVersionProvider: any;
    findById(presentableId: string, version: string): Promise<any>;
    findByVersionId(versionId: string): Promise<any>;
    createOrUpdatePresentableVersion(presentableInfo: PresentableInfo, resourceVersionId: string): Promise<void>;
    /**
     * 构建presentable授权树
     * @param dependencyTree
     * @private
     */
    _buildPresentableAuthTree(presentableInfo: PresentableInfo, dependencyTree: any): Promise<PresentableVersionAuthTreeInfo[]>;
    /**
     * 获取授权树
     * @param resourceId
     * @param version
     * @param dependencies
     * @param resourceVersionMap
     * @returns {*}
     * @private
     */
    _getResourceAuthTree(dependencies: any, resourceVersionId: any, resourceVersionMap: any): any;
    /**
     * 获取presentable解决的发行(需要包含具体的版本信息)
     * @param rootDependency
     */
    _getPresentableResolveResources(presentableInfo: any, rootDependency: any): any[];
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
    _flattenDependencyTree(presentableId: string, dependencyTree: Array<any>): PresentableVersionDependencyTreeInfo[];
    /**
     * 平铺授权树
     * @param presentableResolveReleases
     * @private
     */
    _flattenPresentableAuthTree(presentableResolveResources: any): any[];
}
