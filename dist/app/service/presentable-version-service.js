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
    async findById(presentableId, version) {
        return this.presentableVersionProvider.findOne({ presentableId, version });
    }
    async findByVersionId(versionId) {
        return this.presentableVersionProvider.findOne({ versionId });
    }
    async createOrUpdatePresentableVersion(presentableInfo, resourceVersionId) {
        const { presentableId, resourceInfo, version } = presentableInfo;
        const { systemProperty, customPropertyDescriptors } = await this.outsideApiService.getResourceVersionInfo(resourceVersionId);
        const dependencyTree = await this.ctx.curlIntranetApi(`${this.ctx.webApi.resourceInfoV2}/${resourceInfo.resourceId}/dependencyTree?version=${version}&isContainRootNode=1`);
        const presentableAuthTree = await this._buildPresentableAuthTree(presentableInfo, dependencyTree);
        const model = {
            presentableId, version, resourceVersionId,
            resourceSystemProperty: systemProperty,
            dependencyTree: this._flattenDependencyTree(presentableId, dependencyTree),
            authTree: this._flattenPresentableAuthTree(presentableAuthTree),
            resourceCustomPropertyDescriptors: customPropertyDescriptors,
            versionProperty: this._calculatePresentableVersionProperty(systemProperty, customPropertyDescriptors, []),
        };
        await this.presentableVersionProvider.findOneAndUpdate({
            presentableId, version
        }, model, { new: true }).then(data => {
            return data || this.presentableVersionProvider.create(model);
        });
    }
    /**
     * 构建presentable授权树
     * @param dependencyTree
     * @private
     */
    async _buildPresentableAuthTree(presentableInfo, dependencyTree) {
        const presentableResolveResources = await this._getPresentableResolveResources(presentableInfo, lodash_1.first(dependencyTree));
        const resourceVersionInfoMap = await this.ctx.curlIntranetApi(`${this.ctx.webApi.resourceInfoV2}/versions/list?versionIds=${dependencyTree.map(x => x.versionId).toString()}&projection=resolveResources`)
            .then(list => new Map(list.map(x => [x.versionId, x.resolveResources])));
        // 如果某个具体版本资源的依赖实际没有使用,即使上抛签约了.也不在授权树中验证合同的有效性, 所以依赖树中也不存在
        for (let i = 0, j = presentableResolveResources.length; i < j; i++) {
            const resolveResource = presentableResolveResources[i];
            for (let x = 0, y = resolveResource.versions.length; x < y; x++) {
                let resourceVersion = resolveResource.versions[x];
                resourceVersion.resolveResources = this._getResourceAuthTree(resourceVersion.dependencies, resourceVersion.resourceVersionId, resourceVersionInfoMap);
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
                versions: lodash_1.uniqBy(list, x => x.version).map(item => Object({
                    version: item.version,
                    resourceVersionId: item.resourceVersionId,
                    resolveResources: this._getResourceAuthTree(item.dependencies, item.resourceVersionId, resourceVersionMap)
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
        for (let i = 0, j = baseUpcastResources.length; i < j; i++) {
            const upcastResource = baseUpcastResources[i];
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
    _flattenDependencyTree(presentableId, dependencyTree) {
        const flattenDependencyTree = [];
        const recursionFillAttribute = (children, parentNid = '', deep = 1) => {
            for (let i = 0, j = children.length; i < j; i++) {
                let model = children[i];
                let nid = deep == 1 ? presentableId.substr(0, 12) : this._generateRandomStr();
                flattenDependencyTree.push(Object.assign(lodash_1.omit(model, ['dependencies']), { deep, parentNid, nid }));
                recursionFillAttribute(model.dependencies, nid, deep + 1);
            }
        };
        recursionFillAttribute(dependencyTree);
        return flattenDependencyTree;
    }
    /**
     * 平铺授权树
     * @param presentableResolveReleases
     * @private
     */
    _flattenPresentableAuthTree(presentableResolveResources) {
        const treeNodes = [];
        const recursion = (children, parentVersionId = '', deep = 1) => {
            console.log(children);
            for (let i = 0, j = children.length; i < j; i++) {
                const { resourceId, resourceName, versions } = children[i];
                for (let x = 0, y = versions.length; x < y; x++) {
                    const { version, versionId, resolveResources } = versions[x];
                    treeNodes.push({ resourceId, resourceName, version, versionId, parentVersionId, deep });
                    recursion(resolveResources, versionId, deep + 1);
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
PresentableVersionService = __decorate([
    midway_1.provide()
], PresentableVersionService);
exports.PresentableVersionService = PresentableVersionService;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlc2VudGFibGUtdmVyc2lvbi1zZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2FwcC9zZXJ2aWNlL3ByZXNlbnRhYmxlLXZlcnNpb24tc2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7QUFBQSwrQkFBd0I7QUFDeEIsbUNBQXlEO0FBQ3pELG1DQUF1QztBQVN2QyxJQUFhLHlCQUF5QixHQUF0QyxNQUFhLHlCQUF5QjtJQVdsQyxLQUFLLENBQUMsUUFBUSxDQUFDLGFBQXFCLEVBQUUsT0FBZTtRQUNqRCxPQUFPLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxPQUFPLENBQUMsRUFBQyxhQUFhLEVBQUUsT0FBTyxFQUFDLENBQUMsQ0FBQztJQUM3RSxDQUFDO0lBRUQsS0FBSyxDQUFDLGVBQWUsQ0FBQyxTQUFpQjtRQUNuQyxPQUFPLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxPQUFPLENBQUMsRUFBQyxTQUFTLEVBQUMsQ0FBQyxDQUFDO0lBQ2hFLENBQUM7SUFFRCxLQUFLLENBQUMsZ0NBQWdDLENBQUMsZUFBZ0MsRUFBRSxpQkFBeUI7UUFFOUYsTUFBTSxFQUFDLGFBQWEsRUFBRSxZQUFZLEVBQUUsT0FBTyxFQUFDLEdBQUcsZUFBZSxDQUFDO1FBQy9ELE1BQU0sRUFBQyxjQUFjLEVBQUUseUJBQXlCLEVBQUMsR0FBRyxNQUFNLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxzQkFBc0IsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO1FBQzNILE1BQU0sY0FBYyxHQUFHLE1BQU0sSUFBSSxDQUFDLEdBQUcsQ0FBQyxlQUFlLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxjQUFjLElBQUksWUFBWSxDQUFDLFVBQVUsMkJBQTJCLE9BQU8sc0JBQXNCLENBQUMsQ0FBQztRQUM1SyxNQUFNLG1CQUFtQixHQUFHLE1BQU0sSUFBSSxDQUFDLHlCQUF5QixDQUFDLGVBQWUsRUFBRSxj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