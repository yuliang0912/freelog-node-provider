'use strict'

const uuid = require('uuid')
const lodash = require('lodash')
const {ArgumentError} = require('egg-freelog-base/error')

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

        if (!ruleInfo.isValid || !['alter', 'add'].includes(ruleInfo.operation)) {
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
                dependencyTreeTask = this.generatePresentableDependencyTree(entityInfo.presentableInfo.presentableId, entityInfo.entityVersion)
                break
        }

        return dependencyTreeTask.then(dependencyTree => ruleInfo.entityDependencyTree = dependencyTree)
    }

    /**
     * 生成mock依赖树
     * @param mockName
     * @returns {Promise<void>}
     */
    async generateMockDependencyTree(mockResourceId, isContainRootNode = true) {

        const {app} = this

        return app.curlIntranetApi(`${app.webApi.resourceInfo}/mocks/${mockResourceId}/dependencyTree?isContainRootNode=${isContainRootNode.toString()}`).then(dependencyTree => {
            return this._convertMockAndReleaseDependencyTree(dependencyTree)
        })
    }

    /**
     * 生成发行依赖树
     * @returns {Promise<void>}
     */
    async generateReleaseDependencyTree(releaseId, version, isContainRootNode = true) {

        const {app} = this

        return app.curlIntranetApi(`${app.webApi.releaseInfo}/${releaseId}/dependencyTree?version=${version}&omitFields=versionRange&isContainRootNode=${isContainRootNode.toString()}`).then(dependencyTree => {
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
        }).then(dependencyTreeInfo => {
            if (!dependencyTreeInfo) {
                console.log('presentable依赖树数据缺失,presentableId:'+presentableId)
                return []
            }
            let {dependencyTree} = dependencyTreeInfo.toObject()
            return this._convertPresentableDependencyTree(dependencyTree)
        })
    }

    /**
     * 转换presentable依赖树
     * @param dependencyTree
     * @private
     */
    _convertPresentableDependencyTree(dependencies) {

        const targetDependencyInfo = dependencies.find(x => x.parentNid === '')
        if (!targetDependencyInfo) {
            return []
        }

        function authMapping(model) {
            let {releaseId, releaseName} = model
            return Object.assign(lodash.omit(model, ['releaseId', 'releaseName']), {
                id: releaseId, name: releaseName, type: 'release'
            })
        }

        function recursionBuildDependencyTree(dependencies, currDeep = 1) {
            return dependencies.map(item => {
                let treeNode = authMapping(item)
                treeNode.dependencies = recursionBuildDependencyTree(dependencies.filter(x => x.parentNid === item.nid))
                return treeNode
            })
        }

        return recursionBuildDependencyTree([targetDependencyInfo])
    }

    /**
     * 转换mock和release依赖树
     * @param dependencyTree
     * @private
     */
    _convertMockAndReleaseDependencyTree(dependencyTree) {

        let that = this

        function authMapping(model) {
            let {mockResourceId, mockResourceName, releaseSchemeId, releaseId, resourceId, resourceType, releaseName, version} = model
            return mockResourceId ? {
                id: mockResourceId, name: mockResourceName, version: null, type: "mock", resourceType
            } : {
                id: releaseId, name: releaseName, releaseSchemeId, resourceId, version, type: "release", resourceType
            }
        }

        function recursionConvertSubNodes(dependencies) {
            return dependencies.map(item => {
                let treeNode = authMapping(item)
                treeNode.nid = that.generateRandomStr()
                treeNode.dependencies = recursionConvertSubNodes(item.dependencies)
                return treeNode
            })
        }

        return recursionConvertSubNodes(dependencyTree)
    }

    /**
     * 生成随机字符串
     * @param length
     * @returns {string}
     */
    generateRandomStr(length = 12) {
        if (length < 1) {
            throw new ArgumentError('param:length must be great than 0')
        }
        return uuid.v4().replace(/-/g, '').substr(0, length > 0 ? length : 32)
    }
}