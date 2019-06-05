'use strict';

/**
 * restful wiki: http://eggjs.org/zh-cn/basics/router.html
 */
module.exports = app => {

    const {router, controller} = app
    const {node, presentable, policyTemplate, customDataStore} = controller

    //get
    router.get('node-list', '/v1/nodes/list', node.v1.list)
    router.get('node-detail', '/v1/nodes/detail', node.v1.detail)
    router.get('presentable-list', '/v1/presentables/list', presentable.v1.list)
    router.get('presentable-auth-tree', '/v1/presentables/:presentableId/authTree', presentable.v1.presentableAuthTree)
    router.get('presentable-auth-chain', '/v1/presentables/:presentableId/authChainInfo', presentable.v1.presentableAuthChainInfo)
    router.get('release-subordinate-node', '/v1/presentables/releaseSubordinateNodes', presentable.v1.releaseSubordinateNodes)
    router.get('batch-get-presentable-auth-tree', '/v1/presentables/authTrees', presentable.v1.batchPresentableAuthTrees)


    //post
    router.post('create-or-update-custom-store', '/v1/customStores/createOrUpdate', customDataStore.v1.createOrUpdate)
    //put
    router.put('switch-presentable-online-state', '/v1/presentables/:presentableId/switchOnlineState', presentable.v1.switchOnlineState)

    router.get('/v1/presentables/getPresentableContractState', presentable.v1.getPresentableContractState)

    //restful api
    router.resources('node-info', '/v1/nodes', node.v1)
    router.resources('presentables-info', '/v1/presentables', presentable.v1)
    router.resources('custom-store', '/v1/customStores', customDataStore.v1)
    router.resources('policy-template', '/v1/policyTemplates', policyTemplate.v1)
}



