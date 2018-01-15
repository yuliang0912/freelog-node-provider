'use strict';

/**
 * restful wiki: http://eggjs.org/zh-cn/basics/router.html
 */
module.exports = app => {
    /**
     * presentables restful api
     */
    app.resources('/v1/presentables', '/v1/presentables', app.controller.presentable.v1)

    /**
     * node restful api
     */
    app.resources('/v1/nodes', '/v1/nodes', app.controller.node.v1)

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

    /**
     * node主页相关路由
     */
    //app.get(/^\/node\/([a-zA-Z0-9-]{4,24}[\/]?)$/, app.middlewares.nodeDomainAuth(), app.controller.node.home.index)
    app.get('/node/:nodeDomain', app.middlewares.nodeDomainAuth(), app.controller.node.home.index)
    app.get('/node/:nodeDomain/presentable/:presentableId.:extName', app.middlewares.nodeDomainAuth(), app.controller.node.home.presentableResource)
    app.get('/node/:nodeDomain/presentable/:presentableId', app.middlewares.nodeDomainAuth(), app.controller.node.home.presentableResource)

    //请求获取presentable资源
    app.get('/v1/nodes/:nodeId/presentables/:presentableId.:extName', app.controller.presentable.auth.resource)
    app.get('/v1/nodes/:nodeId/presentables/:presentableId', app.controller.presentable.auth.resource)

    /**
     * index
     */
    app.redirect('/', '/public/index.html', 404);
}



