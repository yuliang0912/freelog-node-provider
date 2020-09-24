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
const lodash_1 = require("lodash");
const midway_1 = require("midway");
let PresentableVersionService = class PresentableVersionService {
    async findById(presentableId, version, ...args) {
        return this.presentableVersionProvider.findOne({ presentableId, version }, ...args);
    }
    async findOne(condition, ...args) {
        return this.presentableVersionProvider.findOne(condition, ...args);
    }
    async find(condition, ...args) {
        return this.presentableVersionProvider.find(condition, ...args);
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
        return isContainRootNode ? convertedAuthTree : lodash_1.first(convertedAuthTree)['children'];
    }
    /**
     * 平铺结构的依赖树转换为递归结构的依赖树
     * @param flattenDependencies
     * @param startNid
     * @param maxDeep
     * @returns {*}
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
     * @param dependencyTree
     * @private
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
     * @param resourceId
     * @param version
     * @param dependencies
     * @param resourceVersionMap
     * @returns {*}
     * @private
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
     * @param resource
     * @returns {Array}
     * @private
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
        const customReadonlyInfo = {};
        const customEditableInfo = {};
        const presentableRewriteInfo = {};
        resourceCustomPropertyDescriptors.forEach(({ key, defaultValue, type }) => {
            if (type === 'readonlyText') {
                customReadonlyInfo[key] = defaultValue;
            }
            else {
                customEditableInfo[key] = defaultValue;
            }
        });
        presentableRewriteProperty.forEach(({ key, value }) => {
            presentableRewriteInfo[key] = value;
        });
        return lodash_1.assign(customEditableInfo, presentableRewriteInfo, customReadonlyInfo, resourceSystemProperty);
    }
    /**
     * 平铺依赖树
     * @param presentableId
     * @param dependencyTree
     * @private
     */
    _flattenDependencyTree(presentableId, resourceDependencyTree) {
        const flattenDependencyTree = [];
        const recursionFillAttribute = (dependencies, parentNid = '', deep = 1) => {
            for (const dependencyInfo of dependencies) {
                const nid = deep == 1 ? presentableId.substr(0, 12) : this._generateRandomStr();
                flattenDependencyTree.push({
                    nid, deep, parentNid,
                    resourceId: dependencyInfo.resourceId,
                    resourceName: dependencyInfo.resourceName,
                    version: dependencyInfo.version,
                    versionId: dependencyInfo.versionId,
                    versionRange: dependencyInfo.versionRange,
                    fileSha1: dependencyInfo.fileSha1,
                    resourceType: dependencyInfo.resourceType
                });
                recursionFillAttribute(dependencyInfo.dependencies, nid, deep + 1);
            }
        };
        recursionFillAttribute(resourceDependencyTree);
        return flattenDependencyTree;
    }
    /**
     * 平铺授权树
     * @param presentableResolveReleases
     * @private
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlc2VudGFibGUtdmVyc2lvbi1zZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2FwcC9zZXJ2aWNlL3ByZXNlbnRhYmxlLXZlcnNpb24tc2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7QUFBQSwrQkFBd0I7QUFDeEIsbUNBQTREO0FBQzVELG1DQUF1QztBQWF2QyxJQUFhLHlCQUF5QixHQUF0QyxNQUFhLHlCQUF5QjtJQWFsQyxLQUFLLENBQUMsUUFBUSxDQUFDLGFBQXFCLEVBQUUsT0FBZSxFQUFFLEdBQUcsSUFBSTtRQUMxRCxPQUFPLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxPQUFPLENBQUMsRUFBQyxhQUFhLEVBQUUsT0FBTyxFQUFDLEVBQUUsR0FBRyxJQUFJLENBQUMsQ0FBQztJQUN0RixDQUFDO0lBRUQsS0FBSyxDQUFDLE9BQU8sQ0FBQyxTQUFpQixFQUFFLEdBQUcsSUFBSTtRQUNwQyxPQUFPLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLEdBQUcsSUFBSSxDQUFDLENBQUM7SUFDdkUsQ0FBQztJQUVELEtBQUssQ0FBQyxJQUFJLENBQUMsU0FBaUIsRUFBRSxHQUFHLElBQUk7UUFDakMsT0FBTyxJQUFJLENBQUMsMEJBQTBCLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFDO0lBQ3BFLENBQUM7SUFFRCxLQUFLLENBQUMsZ0NBQWdDLENBQUMsZUFBZ0MsRUFBRSxpQkFBeUI7UUFFOUYsTUFBTSxFQUFDLGFBQWEsRUFBRSxZQUFZLEVBQUUsT0FBTyxFQUFDLEdBQUcsZUFBZSxDQUFDO1FBQy9ELE1BQU0sRUFBQyxjQUFjLEVBQUUseUJBQXlCLEVBQUUsVUFBVSxFQUFDLEdBQUcsTUFBTSxJQUFJLENBQUMsaUJBQWlCLENBQUMsc0JBQXNCLENBQUMsaUJBQWlCLENBQUMsQ0FBQztRQUN2SSxNQUFNLGNBQWMs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