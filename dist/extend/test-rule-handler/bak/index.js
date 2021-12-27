"use strict";
// import {isEmpty} from 'lodash';
// import {inject, provide} from 'midway';
// import {
//     ActionOperationEnum,
//     BaseTestRuleInfo,
//     TestNodeOperationEnum,
//     TestResourceInfo,
//     TestResourceOriginType,
//     TestRuleMatchInfo
// } from '../../test-node-interface';
// import {PresentableCommonChecker} from '../presentable-common-checker';
// import {compile} from '@freelog/nmr_translator';
// import {IOutsideApiService} from '../../interface';
// import {ActionSetTagsHandler} from './action-handler/action-set-tags-handler';
// import {ActionAddAttrHandler} from './action-set-attr-handler';
// import {ActionSetOnlineStatusHandler} from './action-handler/action-set-online-status-handler';
// import {ActionSetTitleHandler} from './action-handler/action-set-title-handler';
// import {ActionSetCoverHandler} from './action-handler/action-set-cover-handler';
// import {ActionReplaceHandler} from './action-handler/action-replace-handler';
//
// @provide()
// export class TestRuleHandler {
//
//     nodeId: number;
//     testRuleMatchInfos: TestRuleMatchInfo[] = [];
//     activateThemeRule: BaseTestRuleInfo;
//
//     @inject()
//     ctx;
//     @inject()
//     testRuleChecker;
//     @inject()
//     importObjectEntityHandler;
//     @inject()
//     importResourceEntityHandler;
//     @inject()
//     importPresentableEntityHandler;
//     @inject()
//     presentableCommonChecker: PresentableCommonChecker;
//     @inject()
//     actionSetTagsHandler: ActionSetTagsHandler;
//     @inject()
//     actionReplaceHandler: ActionReplaceHandler;
//     @inject()
//     actionSetOnlineStatusHandler: ActionSetOnlineStatusHandler;
//     @inject()
//     actionSetAttrHandler: ActionAddAttrHandler;
//     @inject()
//     actionSetTitleHandler: ActionSetTitleHandler;
//     @inject()
//     actionSetCoverHandler: ActionSetCoverHandler;
//     @inject()
//     activateThemeHandler;
//     @inject()
//     testNodeGenerator;
//     @inject()
//     outsideApiService: IOutsideApiService;
//
//     async main(nodeId: number, testRules: BaseTestRuleInfo[]): Promise<TestRuleMatchInfo[]> {
//
//         this.nodeId = nodeId;
//         // 初始化,转换数据格式.并且校验新增的展品名称是否与现有的展品名称冲突,新增的资源是否与现有展品对应的资源冲突.
//         await this.initialTestRules(testRules).presentableNameAndResourceNameExistingCheck();
//
//         await this.importEntityData();
//         await this.generateDependencyTree();
//         await this.ruleOptionsHandle();
//
//         return this.testRuleMatchInfos;
//     }
//
//     /**
//      * 匹配激活主题规则
//      * @param nodeId
//      * @param activeThemeRuleInfo
//      */
//     matchThemeRule(nodeId: number, activeThemeRuleInfo: TestRuleMatchInfo): Promise<TestResourceInfo> {
//         if (!activeThemeRuleInfo) {
//             return null;
//         }
//         return this.activateThemeHandler.handle(nodeId, activeThemeRuleInfo);
//     }
//
//     /**
//      * 初始化规则,拓展规则的基础属性
//      * @param testRules
//      */
//     initialTestRules(testRules: BaseTestRuleInfo[]) {
//
//         this.testRuleMatchInfos = testRules.map(ruleInfo => Object({
//             id: this.testNodeGenerator.generateTestRuleId(this.nodeId, ruleInfo.text ?? ''),
//             isValid: true,
//             matchErrors: [],
//             effectiveMatchCount: 0,
//             efficientInfos: [],
//             ruleInfo
//         }));
//         this.testRuleMatchInfos.forEach(item => Object.defineProperty(item, 'isValid', {
//             get(): boolean {
//                 return !item.matchErrors.length;
//             }
//         }));
//         return this;
//     }
//
//     /**
//      * 编译测试规则
//      * @param testRuleText
//      */
//     compileTestRule(testRuleText: string): { errors: string[], rules: BaseTestRuleInfo[] } {
//
//         if (testRuleText === null || testRuleText === undefined || testRuleText === '') {
//             return {errors: [], rules: []};
//         }
//
//         return compile(testRuleText);
//     }
//
//     /**
//      * 检查add对应的presentableName或者resourceName是否已经存在
//      */
//     async presentableNameAndResourceNameExistingCheck() {
//         await this.testRuleChecker.checkImportPresentableNameAndResourceNameIsExist(this.nodeId, this.testRuleMatchInfos);
//         return this;
//     }
//
//     /**
//      * 导入实体数据
//      */
//     async importEntityData(): Promise<void> {
//
//         const {alterPresentableRules, addResourceRules, addObjectRules} = this.testRuleMatchInfos.reduce((acc, current) => {
//             if (current.isValid && current.ruleInfo.operation === TestNodeOperationEnum.Alter) {
//                 acc.alterPresentableRules.push(current);
//             } else if (current.isValid && current.ruleInfo.operation === TestNodeOperationEnum.Add && current.ruleInfo.candidate.type === TestResourceOriginType.Resource) {
//                 acc.addResourceRules.push(current);
//             } else if (current.isValid && current.ruleInfo.operation === TestNodeOperationEnum.Add && current.ruleInfo.candidate.type === TestResourceOriginType.Object) {
//                 acc.addObjectRules.push(current);
//             }
//             return acc;
//         }, {alterPresentableRules: [], addResourceRules: [], addObjectRules: []});
//
//         const tasks = [];
//         if (!isEmpty(alterPresentableRules)) {
//             tasks.push(this.importPresentableEntityHandler.importPresentableEntityDataFromRules(this.nodeId, alterPresentableRules));
//         }
//         if (!isEmpty(addResourceRules)) {
//             tasks.push(this.importResourceEntityHandler.importResourceEntityDataFromRules(addResourceRules));
//         }
//         if (!isEmpty(addObjectRules)) {
//             tasks.push(this.importObjectEntityHandler.importObjectEntityDataFromRules(this.ctx.userId, addObjectRules));
//         }
//         await Promise.all(tasks);
//     }
//
//     /**
//      * 生成依赖树
//      */
//     async generateDependencyTree(): Promise<void> {
//         const tasks = [];
//         for (const testRuleInfo of this.testRuleMatchInfos) {
//             if (!testRuleInfo.isValid || !['alter', 'add'].includes(testRuleInfo.ruleInfo.operation)) {
//                 continue;
//             }
//             let generateDependencyTreeTask = null;
//             switch (testRuleInfo.ruleInfo.candidate?.type) {
//                 case TestResourceOriginType.Object:
//                     generateDependencyTreeTask = this.importObjectEntityHandler.getObjectDependencyTree(testRuleInfo.testResourceOriginInfo.id);
//                     break;
//                 case TestResourceOriginType.Resource:
//                     generateDependencyTreeTask = this.importResourceEntityHandler.getResourceDependencyTree(testRuleInfo.testResourceOriginInfo.id, testRuleInfo.testResourceOriginInfo.version);
//                     break;
//             }
//             if (generateDependencyTreeTask !== null) {
//                 tasks.push(generateDependencyTreeTask.then(dependencyTree => testRuleInfo.entityDependencyTree = dependencyTree));
//             }
//         }
//         await Promise.all(tasks);
//     }
//
//     /**
//      * 选项规则处理
//      */
//     async ruleOptionsHandle(): Promise<void> {
//
//         const tasks = this.testRuleMatchInfos.map(testRuleInfo => this.optionReplaceHandler.handle(testRuleInfo));
//
//         await Promise.all(tasks);
//
//         const rootResourceReplacerRules = this.testRuleMatchInfos.filter(x => x.isValid && x.rootResourceReplacer?.type === TestResourceOriginType.Resource);
//         const resourceVersionIds = rootResourceReplacerRules.map(x => this.presentableCommonChecker.generateResourceVersionId(x.rootResourceReplacer.id, x.rootResourceReplacer.version));
//         const resourceProperties = await this.outsideApiService.getResourceVersionList(resourceVersionIds, {
//             projection: 'resourceId,systemProperty,customPropertyDescriptors'
//         });
//
//         for (const ruleInfo of rootResourceReplacerRules) {
//             const resourceProperty = resourceProperties.find(x => x.resourceId === ruleInfo.rootResourceReplacer.id);
//             ruleInfo.rootResourceReplacer.systemProperty = resourceProperty.systemProperty;
//             ruleInfo.rootResourceReplacer.customPropertyDescriptors = resourceProperty.customPropertyDescriptors;
//         }
//
//         for (const testRuleInfo of this.testRuleMatchInfos) {
//             if (!testRuleInfo.isValid || ![TestNodeOperationEnum.Add, TestNodeOperationEnum.Alter].includes(testRuleInfo.ruleInfo.operation)) {
//                 continue;
//             }
//             for (const action of testRuleInfo.ruleInfo.actions) {
//                 switch (action.operation) {
//                     case ActionOperationEnum.AddAttr:
//                         this.actionSetAttrHandler.handle(testRuleInfo, action);
//                 }
//             }
//         }
//
//         for (const testRuleInfo of this.testRuleMatchInfos) {
//             this.optionSetTagsHandler.handle(testRuleInfo);
//             this.optionSetTitleHandler.handle(testRuleInfo);
//             this.optionSetCoverHandler.handle(testRuleInfo);
//             this.optionSetAttrHandler.handle(testRuleInfo);
//             this.optionSetOnlineStatusHandler.handle(testRuleInfo);
//         }
//     }
// }
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9zcmMvZXh0ZW5kL3Rlc3QtcnVsZS1oYW5kbGVyL2Jhay9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsa0NBQWtDO0FBQ2xDLDBDQUEwQztBQUMxQyxXQUFXO0FBQ1gsMkJBQTJCO0FBQzNCLHdCQUF3QjtBQUN4Qiw2QkFBNkI7QUFDN0Isd0JBQXdCO0FBQ3hCLDhCQUE4QjtBQUM5Qix3QkFBd0I7QUFDeEIsc0NBQXNDO0FBQ3RDLDBFQUEwRTtBQUMxRSxtREFBbUQ7QUFDbkQsc0RBQXNEO0FBQ3RELGlGQUFpRjtBQUNqRixrRUFBa0U7QUFDbEUsa0dBQWtHO0FBQ2xHLG1GQUFtRjtBQUNuRixtRkFBbUY7QUFDbkYsZ0ZBQWdGO0FBQ2hGLEVBQUU7QUFDRixhQUFhO0FBQ2IsaUNBQWlDO0FBQ2pDLEVBQUU7QUFDRixzQkFBc0I7QUFDdEIsb0RBQW9EO0FBQ3BELDJDQUEyQztBQUMzQyxFQUFFO0FBQ0YsZ0JBQWdCO0FBQ2hCLFdBQVc7QUFDWCxnQkFBZ0I7QUFDaEIsdUJBQXVCO0FBQ3ZCLGdCQUFnQjtBQUNoQixpQ0FBaUM7QUFDakMsZ0JBQWdCO0FBQ2hCLG1DQUFtQztBQUNuQyxnQkFBZ0I7QUFDaEIsc0NBQXNDO0FBQ3RDLGdCQUFnQjtBQUNoQiwwREFBMEQ7QUFDMUQsZ0JBQWdCO0FBQ2hCLGtEQUFrRDtBQUNsRCxnQkFBZ0I7QUFDaEIsa0RBQWtEO0FBQ2xELGdCQUFnQjtBQUNoQixrRUFBa0U7QUFDbEUsZ0JBQWdCO0FBQ2hCLGtEQUFrRDtBQUNsRCxnQkFBZ0I7QUFDaEIsb0RBQW9EO0FBQ3BELGdCQUFnQjtBQUNoQixvREFBb0Q7QUFDcEQsZ0JBQWdCO0FBQ2hCLDRCQUE0QjtBQUM1QixnQkFBZ0I7QUFDaEIseUJBQXlCO0FBQ3pCLGdCQUFnQjtBQUNoQiw2Q0FBNkM7QUFDN0MsRUFBRTtBQUNGLGdHQUFnRztBQUNoRyxFQUFFO0FBQ0Ys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