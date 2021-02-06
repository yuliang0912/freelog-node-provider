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
     * @param flattenAuthTree
     * @param startNid
     * @param isContainRootNode
     * @param maxDeep
     */
    convertPresentableAuthTree(flattenAuthTree, startNid, isContainRootNode = true, maxDeep = 100) {
        const startedAuthTree = startNid ? flattenAuthTree.filter(x => x.nid === startNid) : flattenAuthTree.filter(x => x.deep === 1);
        if (lodash_1.isEmpty(startedAuthTree)) {
            return [];
        }
        maxDeep = isContainRootNode ? maxDeep : maxDeep + 1;
        function recursionBuildAuthTree(dependencies, currDeep = 1) {
            if (lodash_1.isEmpty(dependencies) || currDeep++ >= maxDeep) {
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
                };
            });
        }
        const convertedAuthTree = recursionBuildAuthTree(startedAuthTree);
        return isContainRootNode ? convertedAuthTree : lodash_1.first(convertedAuthTree).children;
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
            return {
                resourceId: resolveResources.resourceId,
                resourceName: resolveResources.resourceName,
                versions: lodash_1.uniqBy(list, 'version').map(item => Object({
                    version: item.version,
                    versionId: item.versionId,
                    resolveResources: this._getResourceAuthTree(item.dependencies, item.versionId, resourceVersionMap)
                }))
            };
        });
    }
    /**
     * 获取presentable解决的发行(需要包含具体的版本信息)
     * @param presentableInfo
     * @param rootDependency
     */
    _getPresentableResolveResources(presentableInfo, rootDependency) {
        const { resourceId, resourceName, version, versionId, dependencies, baseUpcastResources } = rootDependency;
        const presentableResolveResources = [{
                resourceId, resourceName,
                versions: [{ version, versionId, dependencies }]
            }];
        for (const upcastResource of baseUpcastResources) {
            const list = this._findResourceVersionFromDependencyTree(dependencies, upcastResource);
            presentableResolveResources.push({
                resourceId: upcastResource.resourceId,
                resourceName: upcastResource.resourceName,
                versions: lodash_1.uniqBy(list, 'version').map(item => lodash_1.pick(item, ['version', 'versionId', 'dependencies']))
            });
        }
        return presentableResolveResources;
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
            for (const { resourceId, resourceName, versions } of children) {
                for (const versionInfo of versions) {
                    const nid = this._generateRandomStr();
                    const { version, versionId, resolveResources } = versionInfo;
                    treeNodes.push({ resourceId, resourceName, version, versionId, nid, parentNid, deep });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlc2VudGFibGUtdmVyc2lvbi1zZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vc3JjL2FwcC9zZXJ2aWNlL3ByZXNlbnRhYmxlLXZlcnNpb24tc2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7QUFBQSwrQkFBd0I7QUFDeEIsbUNBQXVDO0FBRXZDLG1DQUE0RDtBQWE1RCxJQUFhLHlCQUF5QixHQUF0QyxNQUFhLHlCQUF5QjtJQWFsQyxLQUFLLENBQUMsUUFBUSxDQUFDLGFBQXFCLEVBQUUsT0FBZSxFQUFFLEdBQUcsSUFBSTtRQUMxRCxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBQyxhQUFhLEVBQUUsT0FBTyxFQUFDLEVBQUUsR0FBRyxJQUFJLENBQUMsQ0FBQztJQUMzRCxDQUFDO0lBRUQsS0FBSyxDQUFDLFNBQVMsQ0FBQyxxQkFBK0IsRUFBRSxHQUFHLElBQUk7UUFDcEQsSUFBSSxDQUFDLHFCQUFxQixDQUFDLE1BQU0sRUFBRTtZQUMvQixPQUFPLEVBQUUsQ0FBQztTQUNiO1FBQ0QsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUMsb0JBQW9CLEVBQUUsRUFBQyxHQUFHLEVBQUUscUJBQXFCLEVBQUMsRUFBQyxFQUFFLEdBQUcsSUFBSSxDQUFDLENBQUM7SUFDcEYsQ0FBQztJQUVELEtBQUssQ0FBQyxPQUFPLENBQUMsU0FBaUIsRUFBRSxHQUFHLElBQUk7UUFDcEMsT0FBTyxJQUFJLENBQUMsMEJBQTBCLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFDO0lBQ3ZFLENBQUM7SUFFRCxLQUFLLENBQUMsSUFBSSxDQUFDLFNBQWlCLEVBQUUsR0FBRyxJQUFJO1FBQ2pDLE9BQU8sSUFBSSxDQUFDLDBCQUEwQixDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsR0FBRyxJQUFJLENBQUMsQ0FBQztJQUNwRSxDQUFDO0lBRUQsS0FBSyxDQUFD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