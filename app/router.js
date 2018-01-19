'use strict';

/**
 * restful wiki: http://eggjs.org/zh-cn/basics/router.html
 */
module.exports = app => {

    /**
     * node-pb restful api
     */
    app.resources('/v1/nodes/pagebuilds', '/v1/nodes/pagebuilds', app.controller.nodePageBuild.v1)

    /**
     * 创建pb的presentable
     */
    app.post('/v1/presentables/createPageBuildPresentable', app.controller.presentable.v1.createPageBuildPresentable)

    /**
     * 关联pb-persentable对应的插件合同ID
     */
    app.post('/v1/presentables/pageBuildAssociateWidget', app.controller.presentable.v1.pageBuildAssociateWidget)

    app.get('/v1/presentables/pageBuildAssociateWidgetContract', app.controller.presentable.v1.pageBuildAssociateWidgetContract)
    app.get('/v1/presentables/pageBuildAssociateWidgetPresentable', app.controller.presentable.v1.pageBuildAssociateWidgetPresentable)
    app.get('/v1/presentables/pbPresentableStatistics', app.controller.presentable.v1.pbPresentableStatistics)

    /**
     * presentables restful api
     */
    app.resources('/v1/presentables', '/v1/presentables', app.controller.presentable.v1)

    /**
     * node主页相关路由
     */
    //app.get(/^\/node\/([a-zA-Z0-9-]{4,24}[\/]?)$/, app.middlewares.nodeDomainAuth(), app.controller.node.home.index)
    app.get('/node/:nodeDomain', app.middlewares.nodeDomainAuth(), app.controller.node.home.index)
    //暂时先不要 以后节点渲染站点单独独立出来
    //app.get('/node/:nodeDomain/presentable/:presentableId.:extName', app.middlewares.nodeDomainAuth(), app.controller.node.home.presentableResource)
    //app.get('/node/:nodeDomain/presentable/:presentableId', app.middlewares.nodeDomainAuth(), app.controller.node.home.presentableResource)

    //请求获取presentable资源
    app.get('/v1/nodes/:nodeId/presentables/:presentableId.:extName', app.controller.presentable.auth.resource)
    app.get('/v1/nodes/:nodeId/presentables/:presentableId', app.controller.presentable.auth.resource)

    /**
     * node restful api
     */
    app.resources('/v1/nodes', '/v1/nodes', app.controller.node.v1)

    app.get('/node/home', app.controller.node.home.index1)

    /**
     * index
     */
    app.redirect('/', '/public/index.html', 404);
}



