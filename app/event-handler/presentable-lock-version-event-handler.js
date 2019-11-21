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
        const ctx = app.createAnonymousContext()

        const releaseDependencyTree = await app.curlIntranetApi(`${app.webApi.releaseInfo}/${releaseId}/dependencyTree?version=${version}&isContainRootNode=1`, {}, identityInfo)

        const flattenDependencyTree = []

        const recursionFillAttribute = (children, parentNid = '', deep = 1) => {
            for (let i = 0, j = children.length; i < j; i++) {
                let model = children[i]
                let nid = deep == 1 ? presentableId.substr(0, 12) : ctx.helper.generateRandomStr()
                flattenDependencyTree.push(Object.assign(lodash.omit(model, ['dependencies']), {deep, parentNid, nid}))
                recursionFillAttribute(model.dependencies, nid, deep + 1)
            }
        }

        recursionFillAttribute(releaseDependencyTree)

        const presentableDependencyTree = {
            nodeId, presentableId, version, masterReleaseId: releaseId, dependencyTree: flattenDependencyTree
        }

        await this.presentableDependencyTreeProvider.findOneAndUpdate({presentableId}, {
            version, dependencyTree: flattenDependencyTree
        }, {new: true}).then(model => {
            return model || this.presentableDependencyTreeProvider.create(presentableDependencyTree)
        })

        app.emit(generatePresentableDependencyTreeEvent, presentableInfo, releaseDependencyTree)
    }
}