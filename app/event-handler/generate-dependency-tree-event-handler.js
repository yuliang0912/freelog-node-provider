'use strict'

const lodash = require('lodash')
const {PresentableCreatedEvent, PresentableVersionLockedEvent} = require('../enum/rabbit-mq-publish-event')

module.exports = class GeneratePresentableDependencyTreeEventHandler {

    constructor(app) {
        this.app = app
        this.presentableProvider = app.dal.presentableProvider
        this.presentableAuthTreeProvider = app.dal.presentableAuthTreeProvider
        this.presentableDependencyTreeProvider = app.dal.presentableDependencyTreeProvider
    }

    /**
     * 依赖树生成事件(根据依赖树生成授权树)
     * @param presentableInfo
     * @returns {Promise<void>}
     */
    async handle(presentableInfo, releaseDependencies) {
        return this.generateAuthTreeHandle(presentableInfo, releaseDependencies)
    }

    /**
     * 生成授权树
     * @param presentableInfo
     * @returns {Promise<void>}
     */
    async generateAuthTreeHandle(presentableInfo, releaseDependencies) {

        const {presentableId, nodeId, releaseInfo} = presentableInfo
        const {releaseId, version} = releaseInfo
        let releaseSchemeMap = await this._getReleaseSchemeMap(releaseDependencies, presentableInfo.userId)
        const presentableResolveReleases = this._getPresentableResolveReleases(presentableInfo, releaseDependencies[0])

        /**
         * 如果某个具体发行在依赖中实际没有使用,即使上抛签约了.也不在授权树中验证合同的有效性
         */
        for (let i = 0, j = presentableResolveReleases.length; i < j; i++) {
            let resolveRelease = presentableResolveReleases[i]
            for (let x = 0, y = resolveRelease.versions.length; x < y; x++) {
                let releaseVersion = resolveRelease.versions[x]
                releaseVersion.resolveReleases = this._getReleaseAuthTree(releaseVersion.dependencies, releaseVersion.releaseSchemeId, releaseSchemeMap)
            }
        }

        const authTreeNodes = this._flattenPresentableAuthTree(presentableResolveReleases)

        const authTreeInfo = {
            presentableId, nodeId, version, masterReleaseId: releaseId, authTree: authTreeNodes
        }

        let isCreated = true
        const presentableAuthTreeInfo = await this.presentableAuthTreeProvider.findOneAndUpdate({presentableId}, {
            version, authTree: authTreeNodes
        }, {new: true}).then(model => {
            if (model) {
                isCreated = false
            }
            return model || this.presentableAuthTreeProvider.create(authTreeInfo)
        }).catch(error => {
            console.log('生成授权树失败', presentableId, version, error)
        })

        await this.sendPresentableVersionChangedEventToMQ(presentableInfo, presentableAuthTreeInfo, isCreated)
    }

    /**
     * 发送创建presentable事件到mq
     * @returns {Promise<void>}
     */
    async sendPresentableVersionChangedEventToMQ(presentableInfo, presentableAuthTreeInfo, isCreated = false) {

        if (isCreated) {
            this.app.rabbitClient.publish(Object.assign({}, PresentableCreatedEvent, {
                body: {presentableInfo, presentableAuthTreeInfo}
            })).then(() => {
                console.log('发送创建presentable事件')
            }).catch(console.error)
        } else {
            this.app.rabbitClient.publish(Object.assign({}, PresentableVersionLockedEvent, {
                body: {presentableAuthTreeInfo}
            })).then(() => {
                console.log('发送presentable切换版本事件')
            }).catch(console.error)
        }
    }

    /**
     * 根据依赖树获取全部的发行方案信息
     * @param dependencyTreeInfo
     * @param userId
     * @returns {Promise<*>}
     * @private
     */
    async _getReleaseSchemeMap(releaseDependencies, userId) {

        const schemeIds = []
        const recursionFillAttribute = (children) => {
            for (let i = 0, j = children.length; i < j; i++) {
                let model = children[i]
                schemeIds.push(model.releaseSchemeId)
                recursionFillAttribute(model.dependencies)
            }
        }
        recursionFillAttribute(releaseDependencies)

        const {app} = this
        return app.curlIntranetApi(`${app.webApi.releaseInfo}/versions/list?schemeIds=${schemeIds}&projection=schemeId,resolveReleases`, {}, {userInfo: {userId}})
            .then(list => new Map(list.map(x => [x['schemeId'], x.resolveReleases])))
    }

    /**
     * 获取授权树
     * @param releaseId
     * @param version
     * @param dependencies
     * @param releaseSchemeMap
     * @returns {*}
     * @private
     */
    _getReleaseAuthTree(dependencies, releaseSchemeId, releaseSchemeMap) {

        return releaseSchemeMap.get(releaseSchemeId).map(resolveRelease => {

            const list = this._findReleaseVersionFromDependencyTree(dependencies, resolveRelease)

            return {
                releaseId: resolveRelease.releaseId,
                releaseName: resolveRelease.releaseName,
                versions: lodash.uniqBy(list, x => x.version).map(item => Object({
                    version: item.version,
                    releaseSchemeId: item.releaseSchemeId,
                    resolveReleases: this._getReleaseAuthTree(item.dependencies, item.releaseSchemeId, releaseSchemeMap)
                }))
            }
        })
    }

    /**
     * 获取presentable解决的发行(需要包含具体的版本信息)
     * @param rootDependency
     */
    _getPresentableResolveReleases(presentableInfo, rootDependency) {

        const {releaseId, releaseName, version, releaseSchemeId, dependencies, baseUpcastReleases} = rootDependency

        const presentableResolveReleases = [{
            releaseId, releaseName,
            versions: [{version, releaseSchemeId, dependencies}]
        }]

        for (let i = 0, j = baseUpcastReleases.length; i < j; i++) {
            let upcastRelease = baseUpcastReleases[i]
            const list = this._findReleaseVersionFromDependencyTree(dependencies, upcastRelease)
            presentableResolveReleases.push({
                releaseId: upcastRelease.releaseId,
                releaseName: upcastRelease.releaseName,
                versions: lodash.uniqBy(list, x => x.version).map(item => lodash.pick(item, ['version', 'releaseSchemeId', 'dependencies']))
            })
        }

        return presentableResolveReleases
    }

    /**
     * 从依赖树中递归获取发行的所有版本信息
     * @param dependencies
     * @param release
     * @returns {Array}
     * @private
     */
    _findReleaseVersionFromDependencyTree(dependencies, release, list = []) {

        return dependencies.reduce((acc, dependency) => {
            if (dependency.releaseId === release.releaseId) {
                acc.push(dependency)
            }
            //如果依赖项未上抛该发行,则终止检查子级节点
            if (!dependency.baseUpcastReleases.some(x => x.releaseId === release.releaseId)) {
                return acc
            }
            return this._findReleaseVersionFromDependencyTree(dependency.dependencies, release, acc)
        }, list)
    }

    /**
     * 平铺授权树
     * @param presentableResolveReleases
     * @private
     */
    _flattenPresentableAuthTree(presentableResolveReleases) {

        const treeNodes = []
        const recursion = (children, parentReleaseSchemeId = '', deep = 1) => {
            for (let i = 0, j = children.length; i < j; i++) {
                let {releaseId, releaseName, versions} = children[i]
                for (let x = 0, y = versions.length; x < y; x++) {
                    let {version, releaseSchemeId, resolveReleases} = versions[x]
                    treeNodes.push({releaseId, releaseName, version, releaseSchemeId, parentReleaseSchemeId, deep})
                    recursion(resolveReleases, releaseSchemeId, deep + 1)
                }
            }
        }
        recursion(presentableResolveReleases)

        return treeNodes
    }
}