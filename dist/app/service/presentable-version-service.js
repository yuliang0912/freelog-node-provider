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
        // 空修改是为了同步一下展品的最后修改时间,方便排序
        this.presentableProvider.updateOne({ _id: presentableInfo.presentableId }, { presentableName: presentableInfo.presentableName }).then();
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
            for (const item of flattenAuthTree(authTree).filter(x => !(0, lodash_1.isEmpty)(x.contracts))) {
                const contracts = item.contracts.filter(x => contractMap.has(x.contractId)).map(x => contractMap.get(x.contractId));
                if ((0, lodash_1.isEmpty)(contracts)) {
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
                resourceType: versionInfo.dependencyTree.find(x => x.resourceId === upcast.resourceId)?.resourceType ?? [],
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
        if ((0, lodash_1.isEmpty)(startedAuthTree)) {
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
            if ((0, lodash_1.isEmpty)(children)) {
                return [];
            }
            return Object.values((0, lodash_1.groupBy)(children, x => x.parentNid + x.resourceId)).map(items => items.map(item => {
                return {
                    nid: item.nid,
                    resourceId: item.resourceId,
                    resourceName: item.resourceName,
                    resourceType: item.resourceType ?? [],
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
        if ((0, lodash_1.isEmpty)(startedDependencyAuth)) {
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
        return isContainRootNode ? convertedDependencyTree : (0, lodash_1.first)(convertedDependencyTree).dependencies;
    }
    /**
     * 构建presentable授权树
     * @param presentableInfo
     * @param dependencyTree
     * @param allVersionIds
     */
    async _buildPresentableAuthTree(presentableInfo, dependencyTree, allVersionIds) {
        const presentableResolveResources = this._getPresentableResolveResources(presentableInfo, (0, lodash_1.first)(dependencyTree));
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
            const resourceType = (0, lodash_1.first)(list)?.resourceType;
            return {
                resourceId: resolveResources.resourceId,
                resourceName: resolveResources.resourceName,
                resourceType: resourceType,
                versions: (0, lodash_1.uniqBy)(list, 'version').map(item => Object({
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
            const upcastResourceType = (0, lodash_1.first)(list)?.resourceType;
            presentableResolveResources.push({
                resourceId: upcastResource.resourceId,
                resourceName: upcastResource.resourceName,
                resourceType: upcastResourceType,
                versions: (0, lodash_1.uniqBy)(list, 'version').map(item => (0, lodash_1.pick)(item, ['version', 'versionId', 'dependencies']))
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
        return (0, uuid_1.v4)().replace(/-/g, '').substr(0, length > 0 ? length : 32);
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
        return (0, lodash_1.assign)(resourceCustomEditableInfo, presentableRewriteInfo, resourceCustomReadonlyInfo, resourceSystemProperty);
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
                        resourceType: resourceType ?? [],
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
    (0, midway_1.inject)(),
    __metadata("design:type", Object)
], PresentableVersionService.prototype, "ctx", void 0);
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", Object)
], PresentableVersionService.prototype, "presentableProvider", void 0);
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", Object)
], PresentableVersionService.prototype, "outsideApiService", void 0);
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", Object)
], PresentableVersionService.prototype, "presentableVersionProvider", void 0);
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", Object)
], PresentableVersionService.prototype, "presentableCommonChecker", void 0);
__decorate([
    (0, midway_1.inject)(),
    __metadata("design:type", presentable_auth_service_1.PresentableAuthService)
], PresentableVersionService.prototype, "presentableAuthService", void 0);
PresentableVersionService = __decorate([
    (0, midway_1.provide)()
], PresentableVersionService);
exports.PresentableVersionService = PresentableVersionService;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlc2VudGFibGUtdmVyc2lvbi1zZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2FwcC9zZXJ2aWNlL3ByZXNlbnRhYmxlLXZlcnNpb24tc2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7QUFBQSwrQkFBd0I7QUFDeEIsbUNBQXVDO0FBRXZDLG1DQUFxRTtBQVdyRSx5RUFBa0U7QUFHbEUsSUFBYSx5QkFBeUIsR0FBdEMsTUFBYSx5QkFBeUI7SUFHbEMsR0FBRyxDQUFpQjtJQUVwQixtQkFBbUIsQ0FBQztJQUVwQixpQkFBaUIsQ0FBcUI7SUFFdEMsMEJBQTBCLENBQUM7SUFFM0Isd0JBQXdCLENBQUM7SUFFekIsc0JBQXNCLENBQXlCO0lBRS9DLEtBQUssQ0FBQyxRQUFRLENBQUMsYUFBcUIsRUFBRSxPQUFlLEVBQUUsR0FBRyxJQUFJO1FBQzFELE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFDLGFBQWEsRUFBRSxPQUFPLEVBQUMsRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFDO0lBQzNELENBQUM7SUFFRCxLQUFLLENBQUMsU0FBUyxDQUFDLHFCQUErQixFQUFFLEdBQUcsSUFBSTtRQUNwRCxJQUFJLENBQUMscUJBQXFCLENBQUMsTUFBTSxFQUFFO1lBQy9CLE9BQU8sRUFBRSxDQUFDO1NBQ2I7UUFDRCxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBQyxvQkFBb0IsRUFBRSxFQUFDLEdBQUcsRUFBRSxxQkFBcUIsRUFBQyxFQUFDLEVBQUUsR0FBRyxJQUFJLENBQUMsQ0FBQztJQUNwRixDQUFDO0lBRUQsS0FBSyxDQUFDLE9BQU8sQ0FBQyxTQUFpQixFQUFFLEdBQUcsSUFBSTtRQUNwQyxPQUFPLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLEdBQUcsSUFBSSxDQUFDLENBQUM7SUFDdkUsQ0FBQztJQUVELEtBQUssQ0FBQyxJQUFJLENBQUMs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