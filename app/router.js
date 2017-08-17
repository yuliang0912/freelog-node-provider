'use strict';

module.exports = app => {

    /**
     * restful wiki: http://eggjs.org/zh-cn/basics/router.html
     */

    app.resources('/v1/presentables', '/v1/presentables', app.controller.presentable.v1)
};

