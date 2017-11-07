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
     * node主页解析
     */
    app.get(/^\/node\/([a-zA-Z0-9-]{4,24}[\/]?)$/, app.middlewares.nodeDomainAuth(), app.controller.node.home.index)

    /**
     * 请求获取presentable资源
     */
    app.get('/v1/node/:nodeId/presentables/:presentableId.:extName', app.controller.presentable.auth.resource)
    app.get('/v1/node/:nodeId/presentables/:presentableId', app.controller.presentable.auth.resource)


    /**
     * index
     */
    app.redirect('/', '/public/index.html', 404);
}



