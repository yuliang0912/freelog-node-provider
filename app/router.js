'use strict';

/**
 * restful wiki: http://eggjs.org/zh-cn/basics/router.html
 */
module.exports = app => {

    const {router, controller} = app;

    router.get('/v1/nodes/list', controller.node.v1.list)

    router.get('/v1/presentables/presentableTree/:presentableId', controller.presentable.v1.presentableTree)

    router.get('/v1/presentables/resourceSubordinateNodes', controller.presentable.v1.resourceSubordinateNodes)

    /**
     * node-pb restful api
     */
    router.resources('/v1/nodes/pagebuilds', '/v1/nodes/pagebuilds', controller.nodePageBuild.v1)

    /**
     * node restful api
     */
    router.resources('/v1/nodes', '/v1/nodes', controller.node.v1)

    /**
     * presentables restful api
     */
    router.resources('/v1/presentables', '/v1/presentables', controller.presentable.v1)

    /**
     * custom store restful api
     */
    router.resources('/v1/customStores', '/v1/customStores', controller.customDataStore.v1)

    /**
     * policy template restful api
     */
    router.resources('/v1/policyTemplates', '/v1/policyTemplates', controller.policyTemplate.v1)
}



