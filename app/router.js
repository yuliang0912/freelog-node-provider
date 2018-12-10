'use strict';

/**
 * restful wiki: http://eggjs.org/zh-cn/basics/router.html
 */
module.exports = app => {

    const {router, controller} = app
    const {node, presentable, policyTemplate, customDataStore} = controller

    router.get('/v1/nodes/list', node.v1.list)

    router.get('/v1/presentables/presentableTrees', presentable.v1.presentableTrees)

    router.get('/v1/presentables/presentableTree/:presentableId', presentable.v1.presentableTree)

    router.get('/v1/presentables/resourceSubordinateNodes', presentable.v1.resourceSubordinateNodes)

    router.get('/v1/presentables/contractInfos', presentable.v1.contractInfos)

    router.put('/v1/presentables/:presentableId/onlineOrOffline', presentable.v1.onlineOrOffline)

    router.post('/v1/customStores/createOrUpdate', customDataStore.v1.createOrUpdate)

    /**
     * node-pb restful api
     */
    //router.resources('/v1/nodes/pagebuilds', '/v1/nodes/pagebuilds', nodePageBuild.v1)

    /**
     * node restful api
     */
    router.resources('/v1/nodes', '/v1/nodes', node.v1)

    /**
     * presentables restful api
     */
    router.resources('/v1/presentables', '/v1/presentables', presentable.v1)

    /**
     * custom store restful api
     */
    router.resources('/v1/customStores', '/v1/customStores', customDataStore.v1)

    /**
     * policy template restful api
     */
    router.resources('/v1/policyTemplates', '/v1/policyTemplates', policyTemplate.v1)
}



