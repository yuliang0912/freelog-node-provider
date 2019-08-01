/**
 * Created by yuliang on 2017/10/30.
 */

'use strict'

const lodash = require('lodash')
const {generatePresentableDependencyTreeEvent} = require('../enum/presentable-events')

module.exports = class PresentableLockVersionEventHandler {

    constructor(app) {
        this.app = app
        this.presentableDependencyTreeProvider = app.dal.presentableDependencyTreeProvider
    }

    /**
     * presentable事件处理入口
     * @param presentableInfo
     * @returns {Promise<void>}
     */
    async handle(presentableInfo) {

        const {app} = this
        const {presentableId, nodeId, releaseInfo, userId} = presentableInfo
        const {releaseId, version} = releaseInfo
        const identityInfo = {userInfo: {userId}}

        const releaseDependencyTree = await app.curlIntranetApi(`${app.webApi.releaseInfo}/${releaseId}/dependencyTree?version=${version}&isContainRootNode=1&omitFields=`, {}, identityInfo)

        const flattenDependencyTree = [], releaseIds = [], versions = []
        const recursion = (children, parentReleaseId = '', parentReleaseVersion, deep = 1) => {
            for (let i = 0, j = children.length; i < j; i++) {
                let model = children[i]
                versions.push(model.version)
                releaseIds.push(model.releaseId)
                flattenDependencyTree.push(Object.assign(lodash.omit(model, ['dependencies']), {
                    deep, parentReleaseId, parentReleaseVersion
                }))
                recursion(model.dependencies, model.releaseId, model.version, deep + 1)
            }
        }
        recursion(releaseDependencyTree)

        const releaseSchemeMap = await app.curlIntranetApi(`${app.webApi.releaseInfo}/versions/list?releaseIds=${releaseIds.toString()}&versions=${versions.toString()}&projection=releaseId,version`, {}, identityInfo)
            .then(list => new Map(list.map(x => [`${x.releaseId}_${x.version}`, x])))

        for (let i = 0, j = flattenDependencyTree.length; i < j; i++) {
            let key = `${flattenDependencyTree[i].releaseId}_${flattenDependencyTree[i].version}`
            if (releaseSchemeMap.has(key)) {
                flattenDependencyTree[i].releaseSchemeId = releaseSchemeMap.get(key).schemeId
            } else {
                console.log('presentableDependencyTree数据结构缺失', presentableInfo.presentableId)
            }
        }

        const presentableDependencyTree = {
            nodeId, presentableId, version, masterReleaseId: releaseId, dependencyTree: flattenDependencyTree
        }

        const dependTree = this.presentableDependencyTreeProvider.findOneAndUpdate({
            presentableId, version
        }, {dependencyTree: flattenDependencyTree}, {new: true}).tap(model => {
            return model || this.presentableDependencyTreeProvider.create(presentableDependencyTree)
        })

        app.emit(generatePresentableDependencyTreeEvent, presentableInfo, dependTree)
    }
}