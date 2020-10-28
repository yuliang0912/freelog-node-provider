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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlc2VudGFibGUtdmVyc2lvbi1zZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2FwcC9zZXJ2aWNlL3ByZXNlbnRhYmxlLXZlcnNpb24tc2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7QUFBQSwrQkFBd0I7QUFDeEIsbUNBQTREO0FBQzVELG1DQUF1QztBQWF2QyxJQUFhLHlCQUF5QixHQUF0QyxNQUFhLHlCQUF5QjtJQWFsQyxLQUFLLENBQUMsUUFBUSxDQUFDLGFBQXFCLEVBQUUsT0FBZSxFQUFFLEdBQUcsSUFBSTtRQUMxRCxPQUFPLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxPQUFPLENBQUMsRUFBQyxhQUFhLEVBQUUsT0FBTyxFQUFDLEVBQUUsR0FBRyxJQUFJLENBQUMsQ0FBQztJQUN0RixDQUFDO0lBRUQsS0FBSyxDQUFDLE9BQU8sQ0FBQyxTQUFpQixFQUFFLEdBQUcsSUFBSTtRQUNwQyxPQUFPLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLEdBQUcsSUFBSSxDQUFDLENBQUM7SUFDdkUsQ0FBQztJQUVELEtBQUssQ0FBQyxJQUFJLENBQUMsU0FBaUIsRUFBRSxHQUFHLElBQUk7UUFDakMsT0FBTyxJQUFJLENBQUMsMEJBQTBCLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFDO0lBQ3BFLENBQUM7SUFFRCxLQUFLLENBQUMsZ0NBQWdDLENBQUMsZUFBZ0MsRUFBRSwwQkFBaUM7UUFDdEcsTUFBTSxzQkFBc0IsR0FBRyxNQUFNLElBQUksQ0FBQyxRQUFRLENBQUMsZUFBZSxDQUFDLGFBQWEsRUFBRSxlQUFlLENBQUMsT0FBTyxFQUFFLCtFQUErRSxDQUFDLENBQUM7UUFDNUwsSUFBSSxDQUFDLHNCQUFzQixFQUFFO1lBQ3pCLE9BQU8sS0FBSyxDQUFDO1NBQ2hCO1FBQ0QsTUFBTSxXQUFXLEdBQUc7WUFDaEIs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