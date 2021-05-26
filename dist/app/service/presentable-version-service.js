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
        const oldPresentableVersionInfo = await this.presentableVersionProvider.find({ presentableVersionId: oldPresentableVersionId });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlc2VudGFibGUtdmVyc2lvbi1zZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2FwcC9zZXJ2aWNlL3ByZXNlbnRhYmxlLXZlcnNpb24tc2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7QUFBQSwrQkFBd0I7QUFDeEIsbUNBQXVDO0FBRXZDLG1DQUFxRTtBQVdyRSx5RUFBa0U7QUFHbEUsSUFBYSx5QkFBeUIsR0FBdEMsTUFBYSx5QkFBeUI7SUFlbEMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxhQUFxQixFQUFFLE9BQWUsRUFBRSxHQUFHLElBQUk7UUFDMUQsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLEVBQUMsYUFBYSxFQUFFLE9BQU8sRUFBQyxFQUFFLEdBQUcsSUFBSSxDQUFDLENBQUM7SUFDM0QsQ0FBQztJQUVELEtBQUssQ0FBQyxTQUFTLENBQUMscUJBQStCLEVBQUUsR0FBRyxJQUFJO1FBQ3BELElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxNQUFNLEVBQUU7WUFDL0IsT0FBTyxFQUFFLENBQUM7U0FDYjtRQUNELE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFDLG9CQUFvQixFQUFFLEVBQUMsR0FBRyxFQUFFLHFCQUFxQixFQUFDLEVBQUMsRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFDO0lBQ3BGLENBQUM7SUFFRCxLQUFLLENBQUMsT0FBTyxDQUFDLFNBQWlCLEVBQUUsR0FBRyxJQUFJO1FBQ3BDLE9BQU8sSUFBSSxDQUFDLDBCQUEwQixDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsR0FBRyxJQUFJLENBQUMsQ0FBQztJQUN2RSxDQUFDO0lBRUQsS0FBSyxDQUFDLElBQUksQ0FBQyxTQUFpQixFQUFFLEdBQUcsSUFBSTtRQUNqQyxPQUFPLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLEdBQUcsSUFBSSxDQUFDLENBQUM7SUFDcEUsQ0FBQztJQUVE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