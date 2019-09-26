'use strict';

/**
 * restful wiki: http://eggjs.org/zh-cn/basics/router.html
 */
module.exports = app => {

    const {router, controller} = app
    const {node, testNode, presentable, policyTemplate, customDataStore} = controller

    //get
    router.get('node-list', '/v1/nodes/list', node.v1.list)
    router.get('node-detail', '/v1/nodes/detail', node.v1.detail)
    router.get('presentable-list', '/v1/presentables/list', presentable.v1.list)
    router.get('presentable-dependency-release', '/v1/presentables/:presentableId/subDependencies', presentable.v1.presentableSubDependReleases)
    router.get('presentable-dependencyTree-tree', '/v1/presentables/:presentableId/dependencyTree', presentable.v1.presentableDependencyTree)
    router.get('presentable-auth-tree', '/v1/presentables/:presentableId/authTree', presentable.v1.presentableAuthTree)
    router.get('presentable-auth-chain', '/v1/presentables/:presentableId/authChainInfo', presentable.v1.presentableAuthChainInfo)
    router.get('batch-get-presentable-auth-tree', '/v1/presentables/authTrees', presentable.v1.batchPresentableAuthTrees)
    router.get('search-presentable-dependency', '/v1/presentables/searchDependency', presentable.v1.searchPresentableDependency)
    router.get('node-test-resource', '/v1/testNodes/:nodeId/testResources', testNode.v1.testResources)
    router.get('search-test-resource', '/v1/testNodes/:nodeId/searchTestResource', testNode.v1.searchTestResource)
    router.get('search-test-resource-dependency', '/v1/testNodes/:nodeId/searchTestResourceDependencyTree', testNode.v1.searchTestResourceDependencyTree)
    router.get('get-test-resource-dependency', '/v1/testNodes/testResources/:testResourceId/dependencyTree', testNode.v1.testResourceDependencyTree)
    router.get('filter-test-resource-dependency', '/v1/testNodes/testResources/:testResourceId/filterDependencyTree', testNode.v1.filterTestResourceDependencyTree)

    router.get('get-test-resource-detail', '/v1/testNodes/testResources/:testResourceId', testNode.v1.testResourceDetail)

    //post
    router.post('match-test-resource', '/v1/testNodes/:nodeId/matchTestResources', testNode.v1.matchTestResources)
    router.post('create-or-update-custom-store', '/v1/customStores/createOrUpdate', customDataStore.v1.createOrUpdate)

    //put
    router.put('switch-presentable-version', '/v1/presentables/:presentableId/switchPresentableVersion', presentable.v1.switchPresentableVersion)
    router.put('switch-presentable-online-state', '/v1/presentables/:presentableId/switchOnlineState', presentable.v1.switchOnlineState)
    router.put('additional-node-test-rule', '/v1/testNodes/:nodeId/additionalTestRule', testNode.v1.additionalTestRule)

    //restful api
    router.resources('node-info', '/v1/nodes', node.v1)
    router.resources('node-info', '/v1/testNodes', testNode.v1)
    router.resources('presentables-info', '/v1/presentables', presentable.v1)
    router.resources('custom-store', '/v1/customStores', customDataStore.v1)
    router.resources('policy-template', '/v1/policyTemplates', policyTemplate.v1)
}



