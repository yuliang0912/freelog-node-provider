'use strict'

module.exports = class GenerateDependencyTreeHandler {

    constructor(app) {
        this.app = app
        this.presentableDependencyTreeProvider = app.dal.presentableDependencyTreeProvider
    }

    /**
     * 生成授权树
     * @param ruleInfo
     * @param testResources
     */
    async handle(testResources) {

        const tasks = testResources.map(testResourceInfo => this.generateDependencyTree(testResourceInfo))

        return Promise.all(tasks).then(() => testResources)
    }

    /**
     * 导入资源
     * @param testResourceInfo
     * @returns {Promise<*>}
     */
    async generateDependencyTree(testResourceInfo) {

        var dependencyTreeTask = null
        const originModel = testResourceInfo._originModel
        switch (testResourceInfo.type) {
            case "mock":
                dependencyTreeTask = this.generateMockDependencyTree(originModel)
                break
            case "release":
                dependencyTreeTask = this.generateReleaseDependencyTree(originModel, testResourceInfo.version)
                break
            case "presentable":
                dependencyTreeTask = this.generatePresentableDependencyTree(originModel, testResourceInfo.version)
                break
            default:
                return null
        }

        return dependencyTreeTask.then(dependencyTree => testResourceInfo.dependencyTree = dependencyTree)
    }

    /**
     * 生成mock依赖树
     * @param mockName
     * @returns {Promise<void>}
     */
    async generateMockDependencyTree(mockInfo) {

        const {app} = this
        const {mockResourceId} = mockInfo

        return app.curlIntranetApi(`${app.webApi.resourceInfo}/mocks/${mockResourceId}/dependencyTree`).then(dependencyTree => {
            return this._convertMockAndReleaseDependencyTree(dependencyTree)
        })
    }

    /**
     * 生成发行依赖树
     * @returns {Promise<void>}
     */
    async generateReleaseDependencyTree(releaseInfo, version) {

        const {app} = this

        return app.curlIntranetApi(`${app.webApi.releaseInfo}/${releaseInfo.releaseId}/dependencyTree?version=${version}`).then(dependencyTree => {
            return this._convertMockAndReleaseDependencyTree(dependencyTree)
        })
    }

    /**
     * 生成presentable依赖树
     * @returns {Promise<void>}
     */
    async generatePresentableDependencyTree(presentableInfo, version) {
        return this.presentableDependencyTreeProvider.findOne({
            presentableId: presentableInfo.presentableId, version
        }).then(dependencyTree => {
            return this._convertPresentableDependencyTree(dependencyTree.toObject().dependencyTree)
        })
    }

    /**
     * 转换presentable依赖树
     * @param dependencyTree
     * @private
     */
    _convertPresentableDependencyTree(dependencyTree) {

        function authMapping(model) {
            let {releaseId, releaseName, version, deep, releaseSchemeId, resourceId} = model
            return {
                id: releaseId, name: releaseName, version, type: "release", deep, _data: {
                    schemeId: releaseSchemeId, resourceId
                }
            }
        }

        function recursionConvertSubNodes(parentNode) {
            let {deep, id, version} = parentNode
            parentNode.dependencies = dependencyTree.filter(item => {
                return item.deep == deep + 1 && item.parentReleaseId === id && item.parentReleaseVersion === version
            }).map(authMapping)
            parentNode.dependencies.forEach(recursionConvertSubNodes)
        }

        return dependencyTree.filter(x => x.deep === 1).map(item => {
            let model = authMapping(item)
            recursionConvertSubNodes(model)
            return model
        })
    }

    /**
     * 转换mock和release依赖树
     * @param dependencyTree
     * @private
     */
    _convertMockAndReleaseDependencyTree(dependencyTree) {

        function authMapping(model, deep) {
            let {mockResourceId, mockResourceName, releaseId, releaseName, version, resourceId} = model
            return mockResourceId ? {
                id: mockResourceId, name: mockResourceName, version: null, type: "mock", deep
            } : {
                id: releaseId, name: releaseName, version, type: "release", deep, _data: {resourceId}
            }
        }

        function recursionConvertSubNodes(dependencies, deep = 1) {
            return dependencies.map(item => {
                let treeNode = authMapping(item, deep)
                treeNode.dependencies = recursionConvertSubNodes(item.dependencies, deep + 1)
                return treeNode
            })
        }

        return recursionConvertSubNodes(dependencyTree)
    }
}