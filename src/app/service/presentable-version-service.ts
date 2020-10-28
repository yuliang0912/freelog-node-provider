import {v4} from 'uuid';
import {assign, pick, uniqBy, first, isEmpty} from 'lodash';
import {provide, inject} from 'midway';
import {
    FlattenPresentableDependencyTree,
    IOutsideApiService,
    IPresentableVersionService,
    PresentableInfo,
    FlattenPresentableAuthTree,
    PresentableDependencyTree,
    PresentableVersionInfo,
    ResourceDependencyTree, PresentableResolveResource, PresentableAuthTree
} from '../../interface';

@provide()
export class PresentableVersionService implements IPresentableVersionService {

    @inject()
    ctx;
    @inject()
    presentableProvider;
    @inject()
    outsideApiService: IOutsideApiService;
    @inject()
    presentableVersionProvider;
    @inject()
    presentableCommonChecker;

    async findById(presentableId: string, version: string, ...args): Promise<PresentableVersionInfo> {
        return this.presentableVersionProvider.findOne({presentableId, version}, ...args);
    }

    async findOne(condition: object, ...args): Promise<PresentableVersionInfo> {
        return this.presentableVersionProvider.findOne(condition, ...args);
    }

    async find(condition: object, ...args): Promise<PresentableVersionInfo[]> {
        return this.presentableVersionProvider.find(condition, ...args);
    }

    async updatePresentableRewriteProperty(presentableInfo: PresentableInfo, presentableRewriteProperty: any[]): Promise<boolean> {
        const presentableVersionInfo = await this.findById(presentableInfo.presentableId, presentableInfo.version, 'presentableVersionId resourceSystemProperty resourceCustomPropertyDescriptors');
        if (!presentableVersionInfo) {
            return false;
        }
        const updateModel = {
            presentableRewriteProperty,
            versionProperty: this._calculatePresentableVersionProperty(presentableVersionInfo.resourceSystemProperty, presentableVersionInfo.resourceCustomPropertyDescriptors, presentableRewriteProperty)
        }
        return this.presentableVersionProvider.updateOne({presentableVersionId: presentableVersionInfo.presentableVersionId}, updateModel).then(data => Boolean(data.ok));
    }

    async createOrUpdatePresentableVersion(presentableInfo: PresentableInfo, resourceVersionId: string): Promise<PresentableVersionInfo> {

        const {presentableId, resourceInfo, version} = presentableInfo;
        const {systemProperty, customPropertyDescriptors, resourceId} = await this.outsideApiService.getResourceVersionInfo(resourceVersionId);
        const dependencyTree = await this.outsideApiService.getResourceDependencyTree(resourceInfo.resourceId, {
            version, isContainRootNode: 1
        });

        const model: PresentableVersionInfo = {
            presentableId, version, resourceId,
            presentableVersionId: this.presentableCommonChecker.generatePresentableVersionId(presentableId, version),
            resourceSystemProperty: systemProperty,
            dependencyTree: this._flattenDependencyTree(presentableId, dependencyTree),
            authTree: [],
            resourceCustomPropertyDescriptors: customPropertyDescriptors,
            versionProperty: this._calculatePresentableVersionProperty(systemProperty, customPropertyDescriptors, [])
        };

        const presentableAuthTree = await this._buildPresentableAuthTree(presentableInfo, dependencyTree, model.dependencyTree.map(x => x.versionId));
        model.authTree = this._flattenPresentableAuthTree(presentableAuthTree);

        return this.presentableVersionProvider.findOneAndUpdate({presentableVersionId: model.presentableVersionId}, model, {new: true}).then(data => {
            return data || this.presentableVersionProvider.create(model);
        });
    }

    /**
     * 平铺结构的授权树转换为递归结构的授权树
     * @param flattenAuthTree
     * @param startNid
     * @param isContainRootNode
     * @param maxDeep
     */
    convertPresentableAuthTree(flattenAuthTree: FlattenPresentableAuthTree[], startNid: string, isContainRootNode = true, maxDeep = 100): PresentableAuthTree[] {

        const startedAuthTree = startNid ? flattenAuthTree.filter(x => x.nid === startNid) : flattenAuthTree.filter(x => x.deep === 1);
        if (isEmpty(startedAuthTree)) {
            return [];
        }
        maxDeep = isContainRootNode ? maxDeep : maxDeep + 1;

        function recursionBuildAuthTree(dependencies: FlattenPresentableAuthTree[], currDeep: number = 1): PresentableAuthTree[] {
            if (isEmpty(dependencies) || currDeep++ >= maxDeep) {
                return [];
            }
            return dependencies.map(item => {
                return {
                    nid: item.nid,
                    resourceId: item.resourceId,
                    resourceName: item.resourceName,
                    version: item.version,
                    versionId: item.versionId,
                    children: recursionBuildAuthTree(flattenAuthTree.filter(x => x.parentNid === item.nid), currDeep + 1)
                }
            });
        }

        const convertedAuthTree = recursionBuildAuthTree(startedAuthTree);

        return isContainRootNode ? convertedAuthTree : first(convertedAuthTree).children;
    }

    /**
     * 平铺结构的依赖树转换为递归结构的依赖树
     * @param flattenDependencies
     * @param startNid
     * @param maxDeep
     * @returns {*}
     */
    convertPresentableDependencyTree(flattenDependencies: FlattenPresentableDependencyTree[], startNid: string, isContainRootNode = true, maxDeep = 100): PresentableDependencyTree[] {

        const startedDependencyAuth = startNid ? flattenDependencies.filter(x => x.nid === startNid) : flattenDependencies.filter(x => x.deep === 1);
        if (isEmpty(startedDependencyAuth)) {
            return [];
        }
        maxDeep = isContainRootNode ? maxDeep : maxDeep + 1;

        function recursionBuildDependencyTree(dependencies: FlattenPresentableDependencyTree[], currDeep = 1): PresentableDependencyTree[] {
            if (!dependencies.length || currDeep++ >= maxDeep) {
                return [];
            }
            return dependencies.map(item => {
                return {
                    nid: item.nid,
                    resourceId: item.resourceId,
                    resourceName: item.resourceName,
                    version: item.version,
                    versionRange: item.versionRange,
                    versionId: item.versionId,
                    resourceType: item.resourceType,
                    fileSha1: item.fileSha1,
                    dependencies: recursionBuildDependencyTree(flattenDependencies.filter(x => x.parentNid === item.nid), currDeep)
                }
            });
        }

        const convertedDependencyTree = recursionBuildDependencyTree(startedDependencyAuth);

        return isContainRootNode ? convertedDependencyTree : first(convertedDependencyTree).dependencies;
    }

    /**
     * 构建presentable授权树
     * @param dependencyTree
     * @private
     */
    async _buildPresentableAuthTree(presentableInfo: PresentableInfo, dependencyTree: ResourceDependencyTree[], allVersionIds: string[]): Promise<PresentableResolveResource[]> {

        const presentableResolveResources = this._getPresentableResolveResources(presentableInfo, first(dependencyTree));
        const resourceVersionInfoMap = await this.outsideApiService.getResourceVersionList(allVersionIds, {projection: 'versionId,resolveResources'})
            .then(list => new Map(list.map(x => [x.versionId, x.resolveResources])));

        // 如果某个具体版本资源的依赖实际没有使用,即使上抛签约了.也不在授权树中验证合同的有效性, 所以授权树中也不存在
        for (const resolveResource of presentableResolveResources) {
            for (const resourceVersion of resolveResource.versions) {
                resourceVersion['resolveResources'] = this._getResourceAuthTree(resourceVersion.dependencies, resourceVersion.versionId, resourceVersionInfoMap);
            }
        }
        return presentableResolveResources;
    }

    /**
     * 获取授权树
     * @param resourceId
     * @param version
     * @param dependencies
     * @param resourceVersionMap
     * @returns {*}
     * @private
     */
    _getResourceAuthTree(dependencies: ResourceDependencyTree[], resourceVersionId: string, resourceVersionMap) {

        return resourceVersionMap.get(resourceVersionId).map(resolveResources => {

            const list = this._findResourceVersionFromDependencyTree(dependencies, resolveResources)

            return {
                resourceId: resolveResources.resourceId,
                resourceName: resolveResources.resourceName,
                versions: uniqBy(list, 'version').map(item => Object({
                    version: item.version,
                    versionId: item.versionId,
                    resolveResources: this._getResourceAuthTree(item.dependencies, item.versionId, resourceVersionMap)
                }))
            }
        })
    }

    /**
     * 获取presentable解决的发行(需要包含具体的版本信息)
     * @param rootDependency
     */
    _getPresentableResolveResources(presentableInfo: PresentableInfo, rootDependency: ResourceDependencyTree): PresentableResolveResource[] {

        const {resourceId, resourceName, version, versionId, dependencies, baseUpcastResources} = rootDependency

        const presentableResolveResources: PresentableResolveResource[] = [{
            resourceId, resourceName,
            versions: [{version, versionId, dependencies}]
        }]

        for (const upcastResource of baseUpcastResources) {
            const list = this._findResourceVersionFromDependencyTree(dependencies, upcastResource)
            presentableResolveResources.push({
                resourceId: upcastResource.resourceId,
                resourceName: upcastResource.resourceName,
                versions: uniqBy(list, 'version').map(item => pick(item, ['version', 'versionId', 'dependencies']))
            })
        }

        return presentableResolveResources;
    }

    /**
     * 从依赖树中递归获取发行的所有版本信息
     * @param dependencies
     * @param resource
     * @returns {Array}
     * @private
     */
    _findResourceVersionFromDependencyTree(dependencies, resourceInfo, list = []): any[] {
        return dependencies.reduce((acc, dependency) => {
            if (dependency.resourceId === resourceInfo.resourceId) {
                acc.push(dependency);
            }
            //如果依赖项未上抛该发行,则终止检查子级节点
            if (!dependency.baseUpcastResources.some(x => x.resourceId === resourceInfo.resourceId)) {
                return acc;
            }
            return this._findResourceVersionFromDependencyTree(dependency.dependencies, resourceInfo, acc);
        }, list)
    }

    /**
     * 生成随机字符串
     * @param length
     * @private
     */
    _generateRandomStr(length = 12) {
        return v4().replace(/-/g, '').substr(0, length > 0 ? length : 32);
    }

    /**
     * 综合计算获得版本的最终属性
     * @param resourceSystemProperty
     * @param resourceCustomPropertyDescriptors
     * @param presentableRewriteProperty
     * @returns {Promise<void>}
     */
    _calculatePresentableVersionProperty(resourceSystemProperty: object, resourceCustomPropertyDescriptors: Array<any>, presentableRewriteProperty: Array<any>) {
        const customReadonlyInfo: any = {};
        const customEditableInfo: any = {};
        const presentableRewriteInfo: any = {};
        resourceCustomPropertyDescriptors.forEach(({key, defaultValue, type}) => {
            if (type === 'readonlyText') {
                customReadonlyInfo[key] = defaultValue;
            } else {
                customEditableInfo[key] = defaultValue;
            }
        });
        presentableRewriteProperty.forEach(({key, value}) => {
            presentableRewriteInfo[key] = value;
        });
        return assign(customEditableInfo, presentableRewriteInfo, customReadonlyInfo, resourceSystemProperty);
    }

    /**
     * 平铺依赖树
     * @param presentableId
     * @param dependencyTree
     * @private
     */
    _flattenDependencyTree(presentableId: string, resourceDependencyTree: ResourceDependencyTree[]): FlattenPresentableDependencyTree[] {
        const recursionFillAttribute = (dependencies: ResourceDependencyTree[], results: FlattenPresentableDependencyTree[], parentNid: string, deep: number) => {
            for (const dependencyInfo of dependencies) {
                const nid = deep == 1 ? presentableId.substr(0, 12) : this._generateRandomStr();
                results.push({
                    nid, deep, parentNid,
                    resourceId: dependencyInfo.resourceId,
                    resourceName: dependencyInfo.resourceName,
                    version: dependencyInfo.version,
                    versionId: dependencyInfo.versionId,
                    versionRange: dependencyInfo.versionRange,
                    fileSha1: dependencyInfo.fileSha1,
                    resourceType: dependencyInfo.resourceType
                });
                recursionFillAttribute(dependencyInfo.dependencies, results, nid, deep + 1);
            }
            return results;
        }
        return recursionFillAttribute(resourceDependencyTree, [], '', 1);
    }

    /**
     * 平铺授权树
     * @param presentableResolveReleases
     * @private
     */
    _flattenPresentableAuthTree(presentableResolveResources): FlattenPresentableAuthTree[] {
        const treeNodes: FlattenPresentableAuthTree[] = [];
        const recursion = (children, parentNid = '', deep = 1) => {
            for (const {resourceId, resourceName, versions} of children) {
                for (const versionInfo of versions) {
                    const nid = this._generateRandomStr();
                    const {version, versionId, resolveResources} = versionInfo;
                    treeNodes.push({resourceId, resourceName, version, versionId, nid, parentNid, deep});
                    recursion(resolveResources, nid, deep + 1);
                }
            }
        }
        recursion(presentableResolveResources);

        return treeNodes
    }
}