'use strict';

module.exports = app => {

    /**
     * restful wiki: http://eggjs.org/zh-cn/basics/router.html
     */

    app.resources('/v1/presentables', '/v1/presentables', app.controller.presentable.v1)


    app.resources('/v1/nodes', '/v1/nodes', app.controller.node.v1)

    app.resources('/v1/nodes/pagebuilds', '/v1/nodes/pagebuilds', app.controller.nodePageBuild.v1)

    app.post('/v1/presentables/getPresentablesByContractIds', app.controller.presentable.v1.getPresentablesByContractIds)
};

