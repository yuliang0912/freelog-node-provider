"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PresentableVersionService = void 0;
const uuid_1 = require("uuid");
const midway_1 = require("midway");
const lodash_1 = require("lodash");
const presentable_auth_service_1 = require("./presentable-auth-service");
let PresentableVersionService = class PresentableVersionService {
    ctx;
    presentableProvider;
    outsideApiService;
    presentableVersionProvider;
    presentableCommonChecker;
    presentableAuthService;
    async findById(presentableId, version, ...args) {
        return this.findOne({ presentableId, version }, ...args);
    }
    async findByIds(presentableVersionIds, ...args) {
        if (!presentableVersionIds.length) {
            return [];
        }
        return this.find({ presentableVersionId: { $in: presentableVersionIds } }, ...args);
    }
    async findOne(condition, ...args) {
        return this.presentableVersionProvider.findOne(condition, ...args);
    }
    async find(condition, ...args) {
        return this.presentableVersionProvider.find(condition, ...args);
    }
    async updatePresentableRewriteProperty(presentableInfo, presentableRewriteProperty) {
        const presentableVersionInfo = await this.findById(presentableInfo.presentableId, presentableInfo.version, 'presentableVersionId resourceSystemProperty resourceCustomPropertyDescriptors');
        if (!presentableVersionInfo) {
            return false;
        }
        const updateModel = {
            presentableRewriteProperty,
            versionProperty: this._calculatePresentableVersionProperty(presentableVersionInfo.resourceSystemProperty, presentableVersionInfo.resourceCustomPropertyDescriptors, presentableRewriteProperty)
        };
        return this.presentableVersionProvider.updateOne({ presentableVersionId: presentableVersionInfo.presentableVersionId }, updateModel).then(data => Boolean(data.ok));
    }
    /**
     * 创建或更新展品版本信息
     * @param presentableInfo
     * @param resourceVersionId
     * @param newVersion
     */
    async createOrUpdatePresentableVersion(presentableInfo, resourceVersionId, newVersion) {
        const { presentableId, resourceInfo } = presentableInfo;
        const dependencyTree = await this.outsideApiService.getResourceDependencyTree(resourceInfo.resourceId, {
            version: newVersion, isContainRootNode: 1
        });
        const model = {
            presentableId,
            resourceId: resourceInfo.resourceId,
            version: newVersion,
            presentableVersionId: this.presentableCommonChecker.generatePresentableVersionId(presentableId, newVersion),
            dependencyTree: this._flattenDependencyTree(presentableId, dependencyTree),
            authTree: []
        };
        const presentableAuthTree = await this._buildPresentableAuthTree(presentableInfo, dependencyTree, model.dependencyTree.map(x => x.versionId));
        model.authTree = this._flattenPresentableAuthTree(presentableAuthTree);
        const updatedVersionInfo = await this.presentableVersionProvider.findOneAndUpdate({ presentableVersionId: model.presentableVersionId }, model, { new: true });
        if (updatedVersionInfo) {
            return updatedVersionInfo;
        }
        const oldPresentableVersionId = this.presentableCommonChecker.generatePresentableVersionId(presentableId, presentableInfo.version);
        const oldPresentableVersionInfo = await this.presentableVersionProvider.findOne({ presentableVersionId: oldPresentableVersionId });
        const { systemProperty, customPropertyDescriptors } = await this.outsideApiService.getResourceVersionInfo(resourceVersionId);
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
    async getRelationTree(presentableInfo, versionInfo) {
        const presentableResolveResourceIdSet = new Set(versionInfo.authTree.filter(x => x.deep === 1).map(x => x.resourceId));
        // 过滤排除掉节点解决的资源,但是实际又未使用的.此部分不影响授权结果.
        const toBeAuthorizedResources = presentableInfo.resolveResources.filter(x => presentableResolveResourceIdSet.has(x.resourceId));
        const flattenAuthTree = (authTree, list = []) => {
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
        const nodeResolveResourceIsAuth = (resourceId) => {
            const resolveContracts = presentableInfo.resolveResources.find(x => x.resourceId === resourceId)?.contracts.filter(x => contractMap.has(x.contractId)).map(x => contractMap.get(x.contractId));
            const isAuth = this.presentableAuthService.contractAuth(resourceId, resolveContracts).isAuth;
            return { isAuth, contracts: resolveContracts };
        };
        const upstreamResourceIsAuth = (authTree) => {
            for (const item of flattenAuthTree(authTree).filter(x => !lodash_1.isEmpty(x.contracts))) {
                const contracts = item.contracts.filter(x => contractMap.has(x.contractId)).map(x => contractMap.get(x.contractId));
                if (lodash_1.isEmpty(contracts)) {
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
                resourceType: versionInfo.dependencyTree.find(x => x.resourceId === upcast.resourceId)?.resourceType,
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
    async convertPresentableAuthTreeWithContracts(presentableInfo, flattenAuthTree) {
        const startedAuthTree = flattenAuthTree.filter(x => x.deep === 1);
        if (lodash_1.isEmpty(startedAuthTree)) {
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
        function recursionBuildAuthTree(children, currDeep = 1) {
            if (lodash_1.isEmpty(children)) {
                return [];
            }
            return Object.values(lodash_1.groupBy(children, x => x.parentNid + x.resourceId)).map(items => items.map(item => {
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
    convertPresentableDependencyTree(flattenDependencies, startNid, isContainRootNode = true, maxDeep = 100) {
        const startedDependencyAuth = startNid ? flattenDependencies.filter(x => x.nid === startNid) : flattenDependencies.filter(x => x.deep === 1);
        if (lodash_1.isEmpty(startedDependencyAuth)) {
            return [];
        }
        maxDeep = isContainRootNode ? maxDeep : maxDeep + 1;
        function recursionBuildDependencyTree(dependencies, currDeep = 1) {
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
        return isContainRootNode ? convertedDependencyTree : lodash_1.first(convertedDependencyTree).dependencies;
    }
    /**
     * 构建presentable授权树
     * @param presentableInfo
     * @param dependencyTree
     * @param allVersionIds
     */
    async _buildPresentableAuthTree(presentableInfo, dependencyTree, allVersionIds) {
        const presentableResolveResources = this._getPresentableResolveResources(presentableInfo, lodash_1.first(dependencyTree));
        const resourceVersionInfoMap = await this.outsideApiService.getResourceVersionList(allVersionIds, { projection: 'versionId,resolveResources' })
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
    _getResourceAuthTree(dependencies, resourceVersionId, resourceVersionMap) {
        return resourceVersionMap.get(resourceVersionId).map(resolveResources => {
            const list = this._findResourceVersionFromDependencyTree(dependencies, resolveResources);
            const resourceType = lodash_1.first(list)?.resourceType;
            return {
                resourceId: resolveResources.resourceId,
                resourceName: resolveResources.resourceName,
                resourceType: resourceType,
                versions: lodash_1.uniqBy(list, 'version').map(item => Object({
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
    _getPresentableResolveResources(presentableInfo, rootDependency) {
        const { resourceId, resourceName, resourceType, version, versionId, dependencies, baseUpcastResources } = rootDependency;
        const presentableResolveResources = [{
                resourceId, resourceName, resourceType,
                versions: [{ version, versionId, dependencies }]
            }];
        for (const upcastResource of baseUpcastResources) {
            const list = this._findResourceVersionFromDependencyTree(dependencies, upcastResource);
            const upcastResourceType = lodash_1.first(list)?.resourceType;
            presentableResolveResources.push({
                resourceId: upcastResource.resourceId,
                resourceName: upcastResource.resourceName,
                resourceType: upcastResourceType,
                versions: lodash_1.uniqBy(list, 'version').map(item => lodash_1.pick(item, ['version', 'versionId', 'dependencies']))
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
    _findResourceVersionFromDependencyTree(dependencies, resourceInfo, list = []) {
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
        return uuid_1.v4().replace(/-/g, '').substr(0, length > 0 ? length : 32);
    }
    /**
     * 综合计算获得版本的最终属性
     * @param resourceSystemProperty
     * @param resourceCustomPropertyDescriptors
     * @param presentableRewriteProperty
     * @returns {Promise<void>}
     */
    _calculatePresentableVersionProperty(resourceSystemProperty, resourceCustomPropertyDescriptors, presentableRewriteProperty) {
        const resourceCustomReadonlyInfo = {};
        const resourceCustomEditableInfo = {};
        const presentableRewriteInfo = {};
        resourceCustomPropertyDescriptors.forEach(({ key, defaultValue, type }) => {
            if (type === 'readonlyText') {
                resourceCustomReadonlyInfo[key] = defaultValue;
            }
            else {
                resourceCustomEditableInfo[key] = defaultValue;
            }
        });
        presentableRewriteProperty.forEach(({ key, value }) => {
            presentableRewriteInfo[key] = value;
        });
        // 属性优先级为: 1.系统属性 2:资源定义的不可编辑的属性 3:展品重写的属性 4:资源自定义的可编辑属性
        return lodash_1.assign(resourceCustomEditableInfo, presentableRewriteInfo, resourceCustomReadonlyInfo, resourceSystemProperty);
    }
    /**
     * 平铺依赖树
     * @param presentableId
     * @param resourceDependencyTree
     */
    _flattenDependencyTree(presentableId, resourceDependencyTree) {
        const recursionFillAttribute = (dependencies, results, parentNid, deep) => {
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
    _flattenPresentableAuthTree(presentableResolveResources) {
        const treeNodes = [];
        const recursion = (children, parentNid = '', deep = 1) => {
            for (const { resourceId, resourceName, resourceType, versions } of children) {
                for (const versionInfo of versions) {
                    const nid = this._generateRandomStr();
                    const { version, versionId, resolveResources } = versionInfo;
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
};
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], PresentableVersionService.prototype, "ctx", void 0);
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], PresentableVersionService.prototype, "presentableProvider", void 0);
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], PresentableVersionService.prototype, "outsideApiService", void 0);
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], PresentableVersionService.prototype, "presentableVersionProvider", void 0);
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], PresentableVersionService.prototype, "presentableCommonChecker", void 0);
__decorate([
    midway_1.inject(),
    __metadata("design:type", presentable_auth_service_1.PresentableAuthService)
], PresentableVersionService.prototype, "presentableAuthService", void 0);
PresentableVersionService = __decorate([
    midway_1.provide()
], PresentableVersionService);
exports.PresentableVersionService = PresentableVersionService;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlc2VudGFibGUtdmVyc2lvbi1zZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2FwcC9zZXJ2aWNlL3ByZXNlbnRhYmxlLXZlcnNpb24tc2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7QUFBQSwrQkFBd0I7QUFDeEIsbUNBQXVDO0FBRXZDLG1DQUFxRTtBQVdyRSx5RUFBa0U7QUFHbEUsSUFBYSx5QkFBeUIsR0FBdEMsTUFBYSx5QkFBeUI7SUFHbEMsR0FBRyxDQUFpQjtJQUVwQixtQkFBbUIsQ0FBQztJQUVwQixpQkFBaUIsQ0FBcUI7SUFFdEMsMEJBQTBCLENBQUM7SUFFM0Isd0JBQXdCLENBQUM7SUFFekIsc0JBQXNCLENBQXlCO0lBRS9DLEtBQUssQ0FBQyxRQUFRLENBQUMsYUFBcUIsRUFBRSxPQUFlLEVBQUUsR0FBRyxJQUFJO1FBQzFELE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFDLGFBQWEsRUFBRSxPQUFPLEVBQUMsRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFDO0lBQzNELENBQUM7SUFFRCxLQUFLLENBQUMsU0FBUyxDQUFDLHFCQUErQixFQUFFLEdBQUcsSUFBSTtRQUNwRCxJQUFJLENBQUMscUJBQXFCLENBQUMsTUFBTSxFQUFFO1lBQy9CLE9BQU8sRUFBRSxDQUFDO1NBQ2I7UUFDRCxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBQyxvQkFBb0IsRUFBRSxFQUFDLEdBQUcsRUFBRSxxQkFBcUIsRUFBQyxFQUFDLEVBQUUsR0FBRyxJQUFJLENBQUMsQ0FBQztJQUNwRixDQUFDO0lBRUQsS0FBSyxDQUFDLE9BQU8sQ0FBQyxTQUFpQixFQUFFLEdBQUcsSUFBSTtRQUNwQyxPQUFPLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLEdBQUcsSUFBSSxDQUFDLENBQUM7SUFDdkUsQ0FBQztJQUVELEtBQUssQ0FBQyxJQUFJLENBQUMs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