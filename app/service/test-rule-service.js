'use strict'

const uuid = require('uuid')
const lodash = require('lodash')
const Service = require('egg').Service
const NodeTestRuleHandler = require('../test-rule-handler/index')
const {AuthorizationError, ApplicationError} = require('egg-freelog-base/error')


module.exports = class TestRuleService extends Service {

    constructor({app, request}) {
        super(...arguments)
        this.nodeTestRuleHandler = new NodeTestRuleHandler(app)
        this.nodeTestRuleProvider = app.dal.nodeTestRuleProvider
        this.nodeTestResourceProvider = app.dal.nodeTestResourceProvider
        this.nodeTestResourceDependencyTreeProvider = app.dal.nodeTestResourceDependencyTreeProvider
    }


    /**
     * 匹配并保持节点的测试资源
     * @param nodeId
     * @param testRuleText
     * @returns {Promise<model>}
     */
    async matchAndSaveNodeTestRule(nodeId, testRuleText) {

        const {matchedTestResources, testRules} = await this._compileAndMatchTestRule(nodeId, testRuleText)

        const nodeTestRuleInfo = {
            nodeId, ruleText: testRuleText,
            userId: this.ctx.request.userId,
            testRules: testRules.map(testRuleInfo => {
                let {id, text, effectiveMatchCount, matchErrors} = testRuleInfo
                return {
                    id, text, effectiveMatchCount, matchErrors,
                    ruleInfo: lodash.omit(testRuleInfo, ['id', '_abortIndex', 'text', 'effectiveMatchCount', 'isValid', 'matchErrors'])
                }
            })
        }

        const nodeTestResources = matchedTestResources.map(nodeTestResource => {
            let testResourceId = this.app.mongoose.getNewObjectId()
            let {testResourceName, type, version, definedTagInfo, onlineInfo, efficientRules, dependencyTree, _originModel} = nodeTestResource
            return {
                _id: testResourceId, testResourceId, testResourceName, nodeId, dependencyTree,
                resourceType: _originModel['resourceType'] || _originModel.releaseInfo.resourceType,
                originInfo: {
                    id: _originModel['presentableId'] || _originModel['releaseId'] || _originModel['mockResourceId'],
                    name: _originModel['presentableName'] || _originModel['releaseName'] || _originModel['fullName'],
                    type, version
                },
                differenceInfo: {
                    onlineStatusInfo: {
                        isOnline: onlineInfo.isOnline,
                        ruleId: onlineInfo.source === 'default' ? "" : onlineInfo.source
                    },
                    userDefinedTagInfo: {
                        tags: definedTagInfo.definedTags,
                        ruleId: definedTagInfo.source === 'default' ? "" : definedTagInfo.source
                    }
                },
                rules: efficientRules.map(x => Object({
                    id: x.id, operation: x.operation
                }))
            }
        })

        const nodeTestResourceDependencyTrees = nodeTestResources.map(testResource => Object({
            _id: testResource.testResourceId, nodeId,
            testResourceName: testResource.testResourceName,
            dependencyTree: this._flattenDependencyTree(testResource.dependencyTree)
        }))

        const deleteTask1 = this.nodeTestRuleProvider.deleteOne({nodeId})
        const deleteTask2 = this.nodeTestResourceProvider.deleteMany({nodeId})
        const deleteTask3 = this.nodeTestResourceDependencyTreeProvider.deleteMany({nodeId})

        await Promise.all([deleteTask1, deleteTask2, deleteTask3])

        const task1 = this.nodeTestRuleProvider.create(nodeTestRuleInfo)
        const task2 = this.nodeTestResourceProvider.insertMany(nodeTestResources)
        const task3 = this.nodeTestResourceDependencyTreeProvider.insertMany(nodeTestResourceDependencyTrees)

        return Promise.all([task1, task2, task3]).then(() => nodeTestRuleInfo)
    }

    /**
     * 编译并匹配测试结果
     * @param nodeId
     * @param testRuleText
     * @returns {Promise<*>}
     */
    async _compileAndMatchTestRule(nodeId, testRuleText) {
        
        const {errors, rules} = this.nodeTestRuleHandler.compileTestRule(testRuleText)
        if (!lodash.isEmpty(errors)) {
            throw new ApplicationError(this.ctx.gettext('node-test-rule-compile-failed'), {errors})
        }

        const matchedTestResources = await this.nodeTestRuleHandler.matchTestRuleResults(nodeId, rules)

        return {matchedTestResources, testRules: rules}
    }


    /**
     * 拍平依赖树
     * @param dependencies
     * @param parentId
     * @param parentReleaseVersion
     * @private
     */
    _flattenDependencyTree(dependencyTree, parentId = '', parentVersion = '', results = []) {
        for (let i = 0, j = dependencyTree.length; i < j; i++) {
            let {id, name, type, deep, version, dependencies} = dependencyTree[i]
            results.push({id, name, type, deep, version, parentId, parentVersion})
            this._flattenDependencyTree(dependencies, id, version, results)
        }
        return results
    }
}


