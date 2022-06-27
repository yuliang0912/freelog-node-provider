import { FreelogContext } from 'egg-freelog-base';
import { FlattenPresentableDependencyTree, IOutsideApiService, IPresentableVersionService, PresentableInfo, FlattenPresentableAuthTree, PresentableDependencyTree, PresentableVersionInfo, ResourceDependencyTree, PresentableResolveResource, PresentableAuthTree } from '../../interface';
import { PresentableAuthService } from './presentable-auth-service';
export declare class PresentableVersionService implements IPresentableVersionService {
    ctx: FreelogContext;
    presentableProvider: any;
    outsideApiService: IOutsideApiService;
    presentableVersionProvider: any;
    presentableCommonChecker: any;
    presentableAuthService: PresentableAuthService;
    findById(presentableId: string, version: string, ...args: any[]): Promise<PresentableVersionInfo>;
    findByIds(presentableVersionIds: string[], ...args: any[]): Promise<PresentableVersionInfo[]>;
    findOne(condition: object, ...args: any[]): Promise<PresentableVersionInfo>;
    find(condition: object, ...args: any[]): Promise<PresentableVersionInfo[]>;
    updatePresentableRewriteProperty(presentableInfo: PresentableInfo, presentableRewriteProperty: any[]): Promise<boolean>;
    /**
     * 创建或更新展品版本信息
     * @param presentableInfo
     * @param resourceVersionId
     * @param newVersion
     */
    createOrUpdatePresentableVersion(presentableInfo: PresentableInfo, resourceVersionId: string, newVersion: string): Promise<PresentableVersionInfo>;
    /**
     * 获取展品关系树(带授权)
     * @param presentableInfo
     * @param versionInfo
     */
    getRelationTree(presentableInfo: PresentableInfo, versionInfo: PresentableVersionInfo): Promise<{
        resourceId: string;
        resourceName: string;
        resourceType: string[];
        versions: string[];
        downstreamIsAuth: boolean;
        downstreamAuthContractIds: string[];
        selfAndUpstreamIsAuth: boolean;
        children: any[];
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
