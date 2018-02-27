'use strict';

/**
 * restful wiki: http://eggjs.org/zh-cn/basics/router.html
 */
module.exports = app => {

    const {router, controller} = app;

    /**
     * 创建pb的presentable
     */
    router.post('/v1/presentables/createPageBuildPresentable', controller.presentable.v1.createPageBuildPresentable)

    /**
     * 关联pb-persentable对应的插件合同ID
     */
    router.post('/v1/presentables/pageBuildAssociateWidget', controller.presentable.v1.pageBuildAssociateWidget)
    router.get('/v1/presentables/pageBuildAssociateWidgetContract', controller.presentable.v1.pageBuildAssociateWidgetContract)
    router.get('/v1/presentables/pageBuildAssociateWidgetPresentable', controller.presentable.v1.pageBuildAssociateWidgetPresentable)
    router.get('/v1/presentables/pbPresentableStatistics', controller.presentable.v1.pbPresentableStatistics)

    router.get('/v1/nodes/list', controller.node.v1.list)

    /**
     * index
     */
    router.redirect('/', '/public/index.html', 404);

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

}



