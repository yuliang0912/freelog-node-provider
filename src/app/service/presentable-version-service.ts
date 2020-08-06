import {v4} from 'uuid';
import {assign, omit, pick, uniqBy, first} from 'lodash';
import {provide, inject} from 'midway';
import {
    IOutsideApiService,
    PresentableInfo,
    PresentableVersionAuthTreeInfo,
    PresentableVersionDependencyTreeInfo
} from '../../interface';

@provide()
export class PresentableVersionService {

    @inject()
    ctx;
    @inject()
    presentableProvider;
    @inject()
    outsideApiService: IOutsideApiService;
    @inject()
    presentableVersionProvider;

    async findById(presentableId: string, version: string) {
        return this.presentableVersionProvider.findOne({presentableId, version});
    }

    async findByVersionId(versionId: string) {
        return this.presentableVersionProvider.findOne({versionId});
    }

    async createOrUpdatePresentableVersion(presentableInfo: PresentableInfo, resourceVersionId: string) {

        const {presentableId, resourceInfo, version} = presentableInfo;
        const {systemProperty, customPropertyDescriptors} = await this.outsideApiService.getResourceVersionInfo(resourceVersionId);
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
        }, model, {new: true}).then(data => {
            return data || this.presentableVersionProvider.create(model);
        });
    }

    /**
     * 构建presentable授权树
     * @param dependencyTree
     * @private
     */
    async _buildPresentableAuthTree(presentableInfo: PresentableInfo, dependencyTree): Promise<PresentableVersionAuthTreeInfo[]> {

        const presentableResolveResources = await this._getPresentableResolveResources(presentableInfo, first(dependencyTree));
        const resourceVersionInfoMap = await this.ctx.curlIntranetApi(`${this.ctx.webApi.resourceInfoV2}/versions/list?versionIds=${dependencyTree.map(x => x.versionId).toString()}&projection=resolveResources`)
            .then(list => new Map(list.map(x => [x.versionId, x.resolveResources])));

        // 如果某个具体版本资源的依赖实际没有使用,即使上抛签约了.也不在授权树中验证合同的有效性, 所以依赖树中也不存在
        for (let i = 0, j = presentableResolveResources.length; i < j; i++) {
            const resolveResource = presentableResolveResources[i];
            for (let x = 0, y = resolveResource.versions.length; x < y; x++) {
                let resourceVersion = resolveResource.versions[x]
                resourceVersion.resolveResources = this._getResourceAuthTree(resourceVersion.dependencies, resourceVersion.resourceVersionId, resourceVersionInfoMap)
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

            const list = this._findResourceVersionFromDependencyTree(dependencies, resolveResources)

            return {
                resourceId: resolveResources.resourceId,
                resourceName: resolveResources.resourceName,
                versions: uniqBy(list, x => x.version).map(item => Object({
                    version: item.version,
                    resourceVersionId: item.resourceVersionId,
                    resolveResources: this._getResourceAuthTree(item.dependencies, item.resourceVersionId, resourceVersionMap)
                }))
            }
        })
    }

    /**
     * 获取presentable解决的发行(需要包含具体的版本信息)
     * @param rootDependency
     */
    _getPresentableResolveResources(presentableInfo, rootDependency) {

        const {resourceId, resourceName, version, versionId, dependencies, baseUpcastResources} = rootDependency

        const presentableResolveResources: any[] = [{
            resourceId, resourceName,
            versions: [{version, versionId, dependencies}]
        }]

        for (let i = 0, j = baseUpcastResources.length; i < j; i++) {
            const upcastResource = baseUpcastResources[i];
            const list = this._findResourceVersionFromDependencyTree(dependencies, upcastResource)
            presentableResolveResources.push({
                resourceId: upcastResource.resourceId,
                resourceName: upcastResource.resourceName,
                versions: uniqBy(list, 'version').map(item => pick(item, ['version', 'versionId', 'dependencies']))
            })
        }

        return presentableResolveResources
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
    _flattenDependencyTree(presentableId: string, dependencyTree: Array<any>): PresentableVersionDependencyTreeInfo[] {

        const flattenDependencyTree = [];
        const recursionFillAttribute = (children, parentNid = '', deep = 1) => {
            for (let i = 0, j = children.length; i < j; i++) {
                let model = children[i];
                let nid = deep == 1 ? presentableId.substr(0, 12) : this._generateRandomStr();
                flattenDependencyTree.push(Object.assign(omit(model, ['dependencies']), {deep, parentNid, nid}));
                recursionFillAttribute(model.dependencies, nid, deep + 1);
            }
        }
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
                const {resourceId, resourceName, versions} = children[i];
                for (let x = 0, y = versions.length; x < y; x++) {
                    const {version, versionId, resolveResources} = versions[x];
                    treeNodes.push({resourceId, resourceName, version, versionId, parentVersionId, deep});
                    recursion(resolveResources, versionId, deep + 1);
                }
            }
        }
        recursion(presentableResolveResources);

        return treeNodes
    }
}