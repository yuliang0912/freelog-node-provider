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
    async createOrUpdatePresentableVersion(presentableInfo, resourceVersionId) {
        const { presentableId, resourceInfo, version } = presentableInfo;
        const { systemProperty, customPropertyDescriptors, resourceId } = await this.outsideApiService.getResourceVersionInfo(resourceVersionId);
        const dependencyTree = await this.outsideApiService.getResourceDependencyTree(resourceInfo.resourceId, {
            version, isContainRootNode: 1
        });
        const model = {
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
        return this.presentableVersionProvider.findOneAndUpdate({ presentableVersionId: model.presentableVersionId }, model, { new: true }).then(data => {
            return data || this.presentableVersionProvider.create(model);
        });
    }
    /**
     * 平铺结构的授权树转换为递归结构的授权树
     * @param presentableInfo
     * @param flattenAuthTree
     */
    // convertPresentableAuthTree(flattenAuthTree: FlattenPresentableAuthTree[], startNid: string, isContainRootNode = true, maxDeep = 100): PresentableAuthTree[] {
    //
    //     const startedAuthTree = startNid ? flattenAuthTree.filter(x => x.nid === startNid) : flattenAuthTree.filter(x => x.deep === 1);
    //     if (isEmpty(startedAuthTree)) {
    //         return [];
    //     }
    //     maxDeep = isContainRootNode ? maxDeep : maxDeep + 1;
    //
    //     function recursionBuildAuthTree(dependencies: FlattenPresentableAuthTree[], currDeep: number = 1): PresentableAuthTree[] {
    //         if (isEmpty(dependencies) || currDeep++ >= maxDeep) {
    //             return [];
    //         }
    //         return dependencies.map(item => {
    //             return {
    //                 nid: item.nid,
    //                 resourceId: item.resourceId,
    //                 resourceName: item.resourceName,
    //                 version: item.version,
    //                 versionId: item.versionId,
    //                 children: recursionBuildAuthTree(flattenAuthTree.filter(x => x.parentNid === item.nid), currDeep + 1)
    //             }
    //         });
    //     }
    //
    //     const convertedAuthTree = recursionBuildAuthTree(startedAuthTree);
    //
    //     return isContainRootNode ? convertedAuthTree : first(convertedAuthTree).children;
    // }
    async getRelationTree(presentableInfo, versionInfo, flattenDependencies) {
        return [{
                resourceId: presentableInfo.resourceInfo.resourceId,
                resourceName: presentableInfo.resourceInfo.resourceName,
                resourceType: presentableInfo.resourceInfo.resourceType,
                versionRanges: [],
                versions: [versionInfo.version],
                children: presentableInfo.resolveResources
            }];
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
PresentableVersionService = __decorate([
    midway_1.provide()
], PresentableVersionService);
exports.PresentableVersionService = PresentableVersionService;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlc2VudGFibGUtdmVyc2lvbi1zZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2FwcC9zZXJ2aWNlL3ByZXNlbnRhYmxlLXZlcnNpb24tc2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7QUFBQSwrQkFBd0I7QUFDeEIsbUNBQXVDO0FBRXZDLG1DQUFxRTtBQWFyRSxJQUFhLHlCQUF5QixHQUF0QyxNQUFhLHlCQUF5QjtJQWFsQyxLQUFLLENBQUMsUUFBUSxDQUFDLGFBQXFCLEVBQUUsT0FBZSxFQUFFLEdBQUcsSUFBSTtRQUMxRCxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBQyxhQUFhLEVBQUUsT0FBTyxFQUFDLEVBQUUsR0FBRyxJQUFJLENBQUMsQ0FBQztJQUMzRCxDQUFDO0lBRUQsS0FBSyxDQUFDLFNBQVMsQ0FBQyxxQkFBK0IsRUFBRSxHQUFHLElBQUk7UUFDcEQsSUFBSSxDQUFDLHFCQUFxQixDQUFDLE1BQU0sRUFBRTtZQUMvQixPQUFPLEVBQUUsQ0FBQztTQUNiO1FBQ0QsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUMsb0JBQW9CLEVBQUUsRUFBQyxHQUFHLEVBQUUscUJBQXFCLEVBQUMsRUFBQyxFQUFFLEdBQUcsSUFBSSxDQUFDLENBQUM7SUFDcEYsQ0FBQztJQUVELEtBQUssQ0FBQyxPQUFPLENBQUMsU0FBaUIsRUFBRSxHQUFHLElBQUk7UUFDcEMsT0FBTyxJQUFJLENBQUMsMEJBQTBCLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFDO0lBQ3ZFLENBQUM7SUFFRCxLQUFLLENBQUMsSUFBSSxDQUFDLFNBQWlCLEVBQUUsR0FBRyxJQUFJO1FBQ2pDLE9BQU8sSUFBSSxDQUFDLDBCQUEwQixDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsR0FBRyxJQUFJLENBQUMsQ0FBQztJQUNwRSxDQUFDO0lBRUQsS0FBSyxDQUFDLGdD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