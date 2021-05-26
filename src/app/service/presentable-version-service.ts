import {v4} from 'uuid';
import {provide, inject} from 'midway';
import {FreelogContext} from 'egg-freelog-base';
import {assign, pick, uniqBy, first, isEmpty, groupBy} from 'lodash';
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
import {PresentableAuthService} from './presentable-auth-service';

@provide()
export class PresentableVersionService implements IPresentableVersionService {

    @inject()
    ctx: FreelogContext;
    @inject()
    presentableProvider;
    @inject()
    outsideApiService: IOutsideApiService;
    @inject()
    presentableVersionProvider;
    @inject()
    presentableCommonChecker;
    @inject()
    presentableAuthService: PresentableAuthService;

    async findById(presentableId: string, version: string, ...args): Promise<PresentableVersionInfo> {
        return this.findOne({presentableId, version}, ...args);
    }

    async findByIds(presentableVersionIds: string[], ...args): Promise<PresentableVersionInfo[]> {
        if (!presentableVersionIds.length) {
            return [];
        }
        return this.find({presentableVersionId: {$in: presentableVersionIds}}, ...args);
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
        };
        return this.presentableVersionProvider.updateOne({presentableVersionId: presentableVersionInfo.presentableVersionId}, updateModel).then(data => Boolean(data.ok));
    }

    /**
     * 创建或更新展品版本信息
     * @param presentableInfo
     * @param resourceVersionId
     * @param newVersion
     */
    async createOrUpdatePresentableVersion(presentableInfo: PresentableInfo, resourceVersionId: string, newVersion: string): Promise<PresentableVersionInfo> {

        const {presentableId, resourceInfo} = presentableInfo;
        const dependencyTree = await this.outsideApiService.getResourceDependencyTree(resourceInfo.resourceId, {
            version: newVersion, isContainRootNode: 1
        });

        const model: Partial<PresentableVersionInfo> = {
            presentableId,
            resourceId: resourceInfo.resourceId,
            version: newVersion,
            presentableVersionId: this.presentableCommonChecker.generatePresentableVersionId(presentableId, newVersion),
            dependencyTree: this._flattenDependencyTree(presentableId, dependencyTree),
            authTree: []
        };

        const presentableAuthTree = await this._buildPresentableAuthTree(presentableInfo, dependencyTree, model.dependencyTree.map(x => x.versionId));
        model.authTree = this._flattenPresentableAuthTree(presentableAuthTree);

        const updatedVersionInfo = await this.presentableVersionProvider.findOneAndUpdate({presentableVersionId: model.presentableVersionId}, model, {new: true});
        if (updatedVersionInfo) {
            return updatedVersionInfo;
        }

        const oldPresentableVersionId = this.presentableCommonChecker.generatePresentableVersionId(presentableId, presentableInfo.version);
        const oldPresentableVersionInfo = await this.presentableVersionProvider.find({presentableVersionId: oldPresentableVersionId});
        const {systemProperty, customPropertyDescriptors} = await this.outsideApiService.getResourceVersionInfo(resourceVersionId);
        model.resourceSystemProperty = systemProperty;
        model.resourceCustomPropertyDescriptors = customPropertyDescriptors;
        // 如果新版本存在,则更新时不需要覆盖属性,否则就需要把旧的属性直接继承到新的版本上
        model.presentableRewriteProperty = oldPresentableVersionInfo?.presentableRewriteProperty ?? [];
        model.versionProperty = this._calculatePresentableVersionProperty(systemProperty, customPropertyDescriptors, model.presentableRewriteProperty);

        return this.presentableVersionProvider.create(model);
    }

    /**
     * 获取展品关系树(带授权)
     * @param presentableInfo
     * @param versionInfo
     */
    async getRelationTree(presentableInfo: PresentableInfo, versionInfo: PresentableVersionInfo) {

        const presentableResolveResourceIdSet = new Set(versionInfo.authTree.filter(x => x.deep === 1).map(x => x.resourceId));
        // 过滤排除掉节点解决的资源,但是实际又未使用的.此部分不影响授权结果.
        const toBeAuthorizedResources = presentableInfo.resolveResources.filter(x => presentableResolveResourceIdSet.has(x.resourceId));

        const flattenAuthTree = (authTree: PresentableAuthTree[][], list: PresentableAuthTree[] = []) => {
            for (const authTreeInfo of authTree) {
                for (const item of authTreeInfo) {
                    list.push(item, ...flattenAuthTree(item.children));
                }
            }
            return list;
        };

        const authTree = await this.convertPresentableAuthTreeWithContracts(presentableInfo, versionInfo.authTree);
        const resourceContractIds = flattenAuthTree(authTree).map(x => x.contracts).flat().map(x => x.contractId);
        const allNodeContractIds = toBeAuthorizedResources.map(x => x.contracts).flat().map(x => x.contractId);

        const contractMap = await this.outsideApiService.getContractByContractIds([...resourceContractIds, ...allNodeContractIds], {
            licenseeId: presentableInfo.nodeId, projection: 'contractId,subjectId,subjectType,authStatus'
        }).then(list => {
            return new Map(list.map(x => [x.contractId, x]));
        });

        const nodeResolveResourceIsAuth = (resourceId: string) => {
            const resolveContracts = presentableInfo.resolveResources.find(x => x.resourceId === resourceId)?.contracts.filter(x => contractMap.has(x.contractId)).map(x => contractMap.get(x.contractId));
            const isAuth = this.presentableAuthService.contractAuth(resourceId, resolveContracts).isAuth;
            return {isAuth, contracts: resolveContracts};
        };

        const upstreamResourceIsAuth = (authTree: PresentableAuthTree[][]) => {
            for (const item of flattenAuthTree(authTree).filter(x => !isEmpty(x.contracts))) {
                const contracts = item.contracts.filter(x => contractMap.has(x.contractId)).map(x => contractMap.get(x.contractId));
                if (isEmpty(contracts)) {
                    continue;
                }
                if (!this.presentableAuthService.contractAuth(item.resourceId, contracts).isAuth) {
                    return false;
                }
            }
            return true;
        };
        const rootResourceAuthResult = nodeResolveResourceIsAuth(presentableInfo.resourceInfo.resourceId);
        const rootResourceAuthTree = authTree.filter(x => x.some(m => m.resourceId === presentableInfo.resourceInfo.resourceId));
        const presentableRelationTree = {
            resourceId: presentableInfo.resourceInfo.resourceId,
            resourceName: presentableInfo.resourceInfo.resourceName,
            resourceType: presentableInfo.resourceInfo.resourceType,
            versions: [versionInfo.version],
            downstreamIsAuth: rootResourceAuthResult.isAuth,
            downstreamAuthContractIds: rootResourceAuthResult.contracts.map(x => x.contractId),
            selfAndUpstreamIsAuth: upstreamResourceIsAuth(rootResourceAuthTree),
            children: []
        };
        for (const upcast of toBeAuthorizedResources.filter(x => x.resourceId !== presentableInfo.resourceInfo.resourceId)) {
            const upcastAuthResult = nodeResolveResourceIsAuth(upcast.resourceId);
            const upcastResourceAuthTree = authTree.filter(x => x.some(m => m.resourceId === upcast.resourceId));
            presentableRelationTree.children.push({
                resourceId: upcast.resourceId,
                resourceName: upcast.resourceName,
                resourceType: versionInfo.dependencyTree.find(x => x.resourceId === upcast.resourceName)?.resourceType,
                downstreamIsAuth: upcastAuthResult.isAuth,
                downstreamAuthContractIds: upcastAuthResult.contracts.map(x => x.contractId),
                selfAndUpstreamIsAuth: upstreamResourceIsAuth(upcastResourceAuthTree),
                children: []
            });
        }
        return [presentableRelationTree];
    }

    /**
     * 平铺结构的授权树转换为递归结构的授权树
     * @param presentableInfo
     * @param flattenAuthTree
     */
    async convertPresentableAuthTreeWithContracts(presentableInfo: PresentableInfo, flattenAuthTree: FlattenPresentableAuthTree[]): Promise<PresentableAuthTree[][]> {

        const startedAuthTree = flattenAuthTree.filter(x => x.deep === 1);
        if (isEmpty(startedAuthTree)) {
            return [];
        }
        const versionInfoMap = await this.outsideApiService.getResourceVersionList(flattenAuthTree.map(x => x.versionId), {
            projection: 'versionId,resolveResources'
        }).then(list => {
            return new Map(list.map(x => [x.versionId, x]));
        });

        const resourceResolveContracts = new Map(presentableInfo.resolveResources.map(x => [`_${x.resourceId}`, x.contracts]));
        for (const item of flattenAuthTree) {
            const versionInfo = versionInfoMap.get(item.versionId);
            if (!versionInfo) {
                continue;
            }
            for (const resolveResource of versionInfo.resolveResources) {
                resourceResolveContracts.set(`${item.nid}_${resolveResource.resourceId}`, resolveResource.contracts);
            }
        }

        function recursionBuildAuthTree(children: FlattenPresentableAuthTree[], currDeep: number = 1): PresentableAuthTree[][] {
            if (isEmpty(children)) {
                return [];
            }
            return Object.values(groupBy(children, x => x.parentNid + x.resourceId)).map(items => items.map(item => {
                return {
                    nid: item.nid,
                    resourceId: item.resourceId,
                    resourceName: item.resourceName,
                    resourceType: item.resourceType ?? '',
                    version: item.version,
                    versionId: item.versionId,
                    contracts: resourceResolveContracts.get(`${item.parentNid}_${item.resourceId}`) ?? [],
                    children: recursionBuildAuthTree(flattenAuthTree.filter(x => x.parentNid === item.nid), currDeep + 1)
                };
            }));
        }

        return recursionBuildAuthTree(startedAuthTree).filter(x => x.length);
    }

    /**
     * 平铺结构的依赖树转换为递归结构的依赖树
     * @param flattenDependencies
     * @param startNid
     * @param isContainRootNode
     * @param maxDeep
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
                };
            });
        }

        const convertedDependencyTree = recursionBuildDependencyTree(startedDependencyAuth);

        return isContainRootNode ? convertedDependencyTree : first(convertedDependencyTree).dependencies;
    }

    /**
     * 构建presentable授权树
     * @param presentableInfo
     * @param dependencyTree
     * @param allVersionIds
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
     * @param dependencies
     * @param resourceVersionId
     * @param resourceVersionMap
     */
    _getResourceAuthTree(dependencies: ResourceDependencyTree[], resourceVersionId: string, resourceVersionMap) {

        return resourceVersionMap.get(resourceVersionId).map(resolveResources => {

            const list = this._findResourceVersionFromDependencyTree(dependencies, resolveResources);
            const resourceType = first(list)?.resourceType;
            return {
                resourceId: resolveResources.resourceId,
                resourceName: resolveResources.resourceName,
                resourceType: resourceType,
                versions: uniqBy(list, 'version').map(item => Object({
                    version: item.version,
                    versionId: item.versionId,
                    resolveResources: this._getResourceAuthTree(item.dependencies, item.versionId, resourceVersionMap)
                }))
            };
        }).filter(x => x.versions.length);
    }

    /**
     * 获取presentable解决的发行(需要包含具体的版本信息)
     * @param presentableInfo
     * @param rootDependency
     */
    _getPresentableResolveResources(presentableInfo: PresentableInfo, rootDependency: ResourceDependencyTree): PresentableResolveResource[] {

        const {resourceId, resourceName, resourceType, version, versionId, dependencies, baseUpcastResources} = rootDependency;

        const presentableResolveResources: PresentableResolveResource[] = [{
            resourceId, resourceName, resourceType,
            versions: [{version, versionId, dependencies}]
        }];

        for (const upcastResource of baseUpcastResources) {
            const list = this._findResourceVersionFromDependencyTree(dependencies, upcastResource);
            const upcastResourceType = first(list)?.resourceType;
            presentableResolveResources.push({
                resourceId: upcastResource.resourceId,
                resourceName: upcastResource.resourceName,
                resourceType: upcastResourceType,
                versions: uniqBy(list, 'version').map(item => pick(item, ['version', 'versionId', 'dependencies']))
            });
        }

        return presentableResolveResources.filter(x => x.versions?.length);
    }

    /**
     * 从依赖树中递归获取发行的所有版本信息
     * @param dependencies
     * @param resourceInfo
     * @param list
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
        }, list);
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
        const resourceCustomReadonlyInfo: any = {};
        const resourceCustomEditableInfo: any = {};
        const presentableRewriteInfo: any = {};
        resourceCustomPropertyDescriptors.forEach(({key, defaultValue, type}) => {
            if (type === 'readonlyText') {
                resourceCustomReadonlyInfo[key] = defaultValue;
            } else {
                resourceCustomEditableInfo[key] = defaultValue;
            }
        });
        presentableRewriteProperty.forEach(({key, value}) => {
            presentableRewriteInfo[key] = value;
        });
        // 属性优先级为: 1.系统属性 2:资源定义的不可编辑的属性 3:展品重写的属性 4:资源自定义的可编辑属性
        return assign(resourceCustomEditableInfo, presentableRewriteInfo, resourceCustomReadonlyInfo, resourceSystemProperty);
    }

    /**
     * 平铺依赖树
     * @param presentableId
     * @param resourceDependencyTree
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
        };
        return recursionFillAttribute(resourceDependencyTree, [], '', 1);
    }

    /**
     * 平铺授权树
     * @param presentableResolveResources
     */
    _flattenPresentableAuthTree(presentableResolveResources): FlattenPresentableAuthTree[] {
        const treeNodes: FlattenPresentableAuthTree[] = [];
        const recursion = (children, parentNid = '', deep = 1) => {
            for (const {resourceId, resourceName, resourceType, versions} of children) {
                for (const versionInfo of versions) {
                    const nid = this._generateRandomStr();
                    const {version, versionId, resolveResources} = versionInfo;
                    treeNodes.push({
                        resourceId, resourceName,
                        resourceType: resourceType ?? '',
                        version, versionId, nid,
                        parentNid, deep
                    });
                    recursion(resolveResources, nid, deep + 1);
                }
            }
        };
        recursion(presentableResolveResources);

        return treeNodes;
    }
}
