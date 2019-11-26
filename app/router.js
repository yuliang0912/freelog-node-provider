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
    //router.get('presentable-sub-dependency-release', '/v1/presentables/:presentableId/subDependencies', presentable.v1.presentableSubDependReleases)
    router.get('presentable-dependency-tree', '/v1/presentables/:presentableId/dependencyTree', presentable.v1.presentableDependencyTree)
    router.get('presentable-auth-tree', '/v1/presentables/:presentableId/authTree', presentable.v1.presentableAuthTree)
    router.get('presentable-auth-chain', '/v1/presentables/:presentableId/authChainInfo', presentable.v1.presentableAuthChainInfo)
    router.get('batch-get-presentable-auth-tree', '/v1/presentables/authTrees', presentable.v1.batchPresentableAuthTrees)
    router.get('search-presentable-dependency', '/v1/presentables/searchDependency', presentable.v1.searchPresentableDependency)
    router.get('find-presentable-by-release', '/v1/presentables/detail', presentable.v1.detail)

    router.get('node-test-resource', '/v1/testNodes/:nodeId/testResources', testNode.v1.testResources)
    router.get('search-test-resource', '/v1/testNodes/:nodeId/searchTestResource', testNode.v1.searchTestResource)
    router.get('search-test-resource-dependency', '/v1/testNodes/:nodeId/searchTestResourceDependencyTree', testNode.v1.searchTestResourceDependencyTree)
    router.get('find-test-resource-by-release', '/v1/testNodes/:nodeId/testResources/findByReleaseName', testNode.v1.findTestResourceByReleaseName)
    router.get('test-resource-auth-tree', '/v1/testNodes/testResources/:testResourceId/authTree', testNode.v1.testResourceAuthTree)
    router.get('test-resource-dependency-tree', '/v1/testNodes/testResources/:testResourceId/dependencyTree', testNode.v1.testResourceDependencyTree)
    router.get('filter-test-resource-dependency', '/v1/testNodes/testResources/:testResourceId/filterDependencyTree', testNode.v1.filterTestResourceDependencyTree)
    router.get('get-test-resource-list', '/v1/testNodes/:nodeId/testResources/list', testNode.v1.testResourceList)
    router.get('get-test-resource-detail', '/v1/testNodes/testResources/:testResourceId', testNode.v1.testResourceDetail)

    router.get('rebuildPresentablePreviewImages', '/v1/presentables/rebuildPresentablePreviewImages', presentable.v1.rebuildPresentablePreviewImages)

    //post
    router.post('match-test-resource', '/v1/testNodes/:nodeId/matchTestResources', testNode.v1.matchTestResources)
    router.post('create-or-update-custom-store', '/v1/customStores/createOrUpdate', customDataStore.v1.createOrUpdate)
    router.post('rebuild-presentable-dependency-tree', '/v1/presentables/rebuildDependencyTree', presentable.v1.rebuildPresentableDependencyTree)

    //put
    router.put('switch-presentable-version', '/v1/presentables/:presentableId/switchPresentableVersion', presentable.v1.switchPresentableVersion)
    router.put('switch-presentable-online-state', '/v1/presentables/:presentableId/switchOnlineState', presentable.v1.switchOnlineState)
    router.put('additional-node-test-rule', '/v1/testNodes/:nodeId/additionalTestRule', testNode.v1.additionalTestRule)
    router.put('update-test-resources', '/v1/testNodes/testResources/:testResourceId', testNode.v1.updateTestResource)

    //restful api
    router.resources('node-info', '/v1/nodes', node.v1)
    router.resources('node-info', '/v1/testNodes', testNode.v1)
    router.resources('presentables-info', '/v1/presentables', presentable.v1)
    router.resources('custom-store', '/v1/customStores', customDataStore.v1)
    router.resources('policy-template', '/v1/policyTemplates', policyTemplate.v1)
}



