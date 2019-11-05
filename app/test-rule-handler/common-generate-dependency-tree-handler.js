'use strict'

module.exports = class CommonGenerateDependencyTreeHandler {

    constructor(app) {
        this.app = app
        this.presentableDependencyTreeProvider = app.dal.presentableDependencyTreeProvider
    }

    /**
     * 生成授权树
     * @param ruleInfo
     * @param testResources
     */
    async handle(testRules) {

        const tasks = testRules.map(ruleInfo => this.generateDependencyTree(ruleInfo))

        return Promise.all(tasks).then(() => testRules)
    }

    /**
     * 导入资源
     * @param testResourceInfo
     * @returns {Promise<*>}
     */
    async generateDependencyTree(ruleInfo) {

        if (!ruleInfo.isValid) {
            return
        }

        var dependencyTreeTask = null
        const {candidate = {}, entityInfo} = ruleInfo
        switch (candidate.type) {
            case "mock":
                dependencyTreeTask = this.generateMockDependencyTree(entityInfo['mockResourceId'])
                break
            case "release":
                dependencyTreeTask = this.generateReleaseDependencyTree(entityInfo['releaseId'], entityInfo.entityVersion)
                break
            default:
                dependencyTreeTask = this.generatePresentableDependencyTree(entityInfo['presentableId'], entityInfo.entityVersion)
                break
        }

        return dependencyTreeTask.then(dependencyTree => ruleInfo.entityDependencyTree = dependencyTree)
    }

    /**
     * 生成mock依赖树
     * @param mockName
     * @returns {Promise<void>}
     */
    async generateMockDependencyTree(mockResourceId) {

        const {app} = this

        return app.curlIntranetApi(`${app.webApi.resourceInfo}/mocks/${mockResourceId}/dependencyTree`).then(dependencyTree => {
            return this._convertMockAndReleaseDependencyTree(dependencyTree)
        })
    }

    /**
     * 生成发行依赖树
     * @returns {Promise<void>}
     */
    async generateReleaseDependencyTree(releaseId, version) {

        const {app} = this

        return app.curlIntranetApi(`${app.webApi.releaseInfo}/${releaseId}/dependencyTree?version=${version}&omitFields=versionRange`).then(dependencyTree => {
            return this._convertMockAndReleaseDependencyTree(dependencyTree)
        })
    }

    /**
     * 生成presentable依赖树
     * @returns {Promise<void>}
     */
    async generatePresentableDependencyTree(presentableId, version) {
        return this.presentableDependencyTreeProvider.findOne({
            presentableId, version
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
                id: releaseId, name: releaseName, version, type: "release", deep
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
            let {mockResourceId, mockResourceName, releaseId, releaseName, version, resourceId, baseUpcastReleases = []} = model
            return mockResourceId ? {
                id: mockResourceId, name: mockResourceName, version: null, type: "mock", deep
            } : {
                id: releaseId, name: releaseName, version, type: "release", deep, baseUpcastReleases
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