"use strict";
// import {satisfies} from 'semver';
// import {inject, provide} from 'midway';
// import {chain, first, isEmpty, pick} from 'lodash';
// import {IOutsideApiService, ObjectStorageInfo, ResourceInfo} from '../../../interface';
// import {
//     CandidateInfo,
//     TestResourceDependencyTree, TestResourceOriginInfo,
//     TestResourceOriginType,
//     TestRuleMatchInfo
// } from '../../../test-node-interface';
// import {FreelogContext} from 'egg-freelog-base';
//
// @provide()
// export class ActionReplaceHandler {
//
//     @inject()
//     ctx: FreelogContext;
//     @inject()
//     importObjectEntityHandler;
//     @inject()
//     importResourceEntityHandler;
//     @inject()
//     outsideApiService: IOutsideApiService;
//
//     /**
//      * 执行替换操作
//      * @param testRuleInfo
//      */
//     async handle(testRuleInfo: TestRuleMatchInfo) {
//
//         if (!testRuleInfo.isValid || !['alter', 'add'].includes(testRuleInfo.ruleInfo.operation)) {
//             return;
//         }
//
//         const replaceRecords = [];
//         await this._recursionReplace(testRuleInfo, testRuleInfo.entityDependencyTree, testRuleInfo.entityDependencyTree, [], replaceRecords);
//
//         // 替换合计生效次数
//         testRuleInfo.efficientInfos.push({
//             type: 'replace', count: replaceRecords.length
//         });
//         testRuleInfo.replaceRecords = replaceRecords;
//     }
//
//     /**
//      * 递归替换依赖树
//      * @param testRuleInfo
//      * @param rootDependencies
//      * @param dependencies
//      * @param parents
//      * @param records
//      */
//     async _recursionReplace(testRuleInfo: TestRuleMatchInfo, rootDependencies: TestResourceDependencyTree[], dependencies: TestResourceDependencyTree[], parents: { name: string, type: string, version?: string }[], records: any[]) {
//         if (isEmpty(dependencies ?? [])) {
//             return;
//         }
//         for (let i = 0, j = dependencies.length; i < j; i++) {
//             const currTreeNodeInfo = dependencies[i];
//             const currPathChain = parents.concat([pick(currTreeNodeInfo, ['name', 'type', 'version'])]);
//             const replacerInfo = await this._matchReplacer(testRuleInfo, currTreeNodeInfo, currPathChain);
//             if (!replacerInfo) {
//                 await this._recursionReplace(testRuleInfo, rootDependencies, currTreeNodeInfo.dependencies, currPathChain, records);
//                 continue;
//             }
//             // 自己替换自己是被允许的,不用做循环检测
//             if (currTreeNodeInfo.id !== replacerInfo.id) {
//                 const {result, deep} = this._checkCycleDependency(rootDependencies, replacerInfo);
//                 if (result) {
//                     const msg = this.ctx.gettext(deep == 1 ? 'reflect_rule_pre_excute_error_duplicate_rely' : 'reflect_rule_pre_excute_error_circular_rely', replacerInfo.name);
//                     testRuleInfo.matchErrors.push(msg);
//                     continue;
//                 }
//             }
//             if (replacerInfo.replaceRecords?.length) {
//                 records.push(...replacerInfo.replaceRecords);
//             }
//             dependencies.splice(i, 1, replacerInfo);
//         }
//     }
//
//     /**
//      * 匹配替换对象,此函数会在替换之后的结果上做多次替换.具体需要看规则的定义.即支持A=>B,B=>C,C=>D. 综合替换之后的结果为A替换成D.最终返回D以及D的依赖信息.
//      * 然后上游调用者会把A以及A的所有依赖信息移除,替换成D以及D的依赖信息.然后在新的依赖树下递归调用后续的规则
//      * @param testRuleInfo
//      * @param targetInfo
//      * @param parents
//      */
//     async _matchReplacer(testRuleInfo: TestRuleMatchInfo, targetInfo: TestResourceDependencyTree, parents): Promise<TestResourceDependencyTree> {
//
//         const replaceRecords = [];
//         let latestTestResourceDependencyTree = targetInfo;
//         for (const replaceObjectInfo of testRuleInfo.ruleInfo.replaces) {
//             const {replaced, replacer, scopes} = replaceObjectInfo;
//             if (replaceObjectInfo.efficientCount === undefined) {
//                 replaceObjectInfo.efficientCount = 0;
//             }
//             if (!this._checkRuleScopeIsMatched(scopes, parents) || !this._entityIsMatched(replaced, latestTestResourceDependencyTree)) {
//                 continue;
//             }
//             const replacerIsResource = replacer.type === TestResourceOriginType.Resource;
//             const replacerInfo = await this._getReplacerInfo(replacer);
//             if (!replacerInfo) {
//                 const msg = this.ctx.gettext(replacerIsResource ? 'reflect_rule_pre_excute_error_resource_not_existed' : 'reflect_rule_pre_excute_error_object_not_existed', replacer.name);
//                 testRuleInfo.matchErrors.push(msg);
//                 return;
//             }
//
//             const resourceVersionInfo = replacerIsResource ? this.importResourceEntityHandler.matchResourceVersion(replacerInfo as ResourceInfo, replacer.versionRange) : null;
//             if (replacerIsResource && !resourceVersionInfo) {
//                 testRuleInfo.matchErrors.push(this.ctx.gettext('reflect_rule_pre_excute_error_version_invalid', replacer.name, replacer.versionRange));
//                 return;
//             }
//             if (replacer.type === TestResourceOriginType.Object && replacerInfo.userId !== this.ctx.userId) {
//                 testRuleInfo.matchErrors.push(this.ctx.gettext('reflect_rule_pre_excute_error_access_limited', replacer.name));
//                 return;
//             }
//
//             // 代码执行到此,说明已经匹配成功,然后接着再结果的基础上进行再次匹配,直到替换完所有的
//             const replaceRecordInfo: any = {
//                 replaced: pick(latestTestResourceDependencyTree, ['id', 'name', 'type', 'version'])
//             };
//             latestTestResourceDependencyTree = {
//                 id: replacerInfo[replacerIsResource ? 'resourceId' : 'objectId'],
//                 name: replacer.name,
//                 type: replacer.type,
//                 versionRange: replacer.versionRange,
//                 resourceType: replacerInfo.resourceType,
//                 version: resourceVersionInfo?.version,
//                 versionId: resourceVersionInfo?.versionId,
//                 fileSha1: '', // resourceVersionInfo?.sha1, //fileSha1目前没有使用.此处没必要额外查询
//                 dependencies: []
//             };
//             latestTestResourceDependencyTree['replacerInfo'] = replacerInfo;
//             replaceRecordInfo.replacer = pick(latestTestResourceDependencyTree, ['id', 'name', 'type', 'version']);
//             replaceRecords.push(replaceRecordInfo);
//             // 单个替换统计生效次数
//             replaceObjectInfo.efficientCount += 1;
//         }
//
//         if (isEmpty(replaceRecords)) {
//             return;
//         }
//
//         // 返回被替换之后的新的依赖树(已包含自身)
//         const replacer: TestResourceDependencyTree = latestTestResourceDependencyTree.type === TestResourceOriginType.Object
//             ? await this.importObjectEntityHandler.getObjectDependencyTree(latestTestResourceDependencyTree.id).then(first)
//             : await this.importResourceEntityHandler.getResourceDependencyTree(latestTestResourceDependencyTree.id, latestTestResourceDependencyTree.version).then(first);
//
//         replacer.versionRange = latestTestResourceDependencyTree.versionRange;
//         replacer.replaceRecords = replaceRecords;
//
//         // 主资源被替换,需要把新的替换者信息保存起来
//         if (parents.length === 1 && (replacer.id !== testRuleInfo.testResourceOriginInfo.id || replacer.version !== testRuleInfo.testResourceOriginInfo.version)) {
//             const rootResourceReplacer: TestResourceOriginInfo = {
//                 id: replacer.id,
//                 name: replacer.name,
//                 type: replacer.type,
//                 versions: replacer.versions,
//                 versionRange: replacer.versionRange,
//                 resourceType: replacer.resourceType,
//                 version: replacer.version
//             };
//             if (replacer.type === TestResourceOriginType.Object) {
//                 const objectInfo: ObjectStorageInfo = latestTestResourceDependencyTree['replacerInfo'];
//                 rootResourceReplacer.systemProperty = objectInfo.systemProperty;
//                 rootResourceReplacer.customPropertyDescriptors = objectInfo.customPropertyDescriptors;
//             }
//             testRuleInfo.rootResourceReplacer = rootResourceReplacer;
//         }
//
//         return replacer;
//     }
//
//     /**
//      * 检查规则的作用域是否匹配
//      * 1.scopes为空数组即代表全局替换.
//      * 2.多个scopes中如果有任意一个scope满足条件即可
//      * 3.作用域链路需要与依赖的实际链路一致.但是可以少于实际链路,即作用域链路与实际链路的前半部分完全匹配
//      * @param scopes
//      * @param parents
//      * @private
//      */
//     _checkRuleScopeIsMatched(scopes: CandidateInfo[][], parents: any[]) {
//
//         if (isEmpty(scopes)) {
//             return true;
//         }
//
//         for (const subScopes of scopes) {
//             const subScopesLength = subScopes.length;
//             if (subScopesLength > parents.length) {
//                 continue;
//             }
//             for (let x = 0; x < subScopesLength; x++) {
//                 // 父级目录链有任意不匹配的项,则该条作用域匹配失败.跳出继续下一个作用域匹配
//                 if (!this._entityIsMatched(subScopes[x], parents[x])) {
//                     break;
//                 }
//                 // 当父级目录全部匹配,并且匹配到链路的尾部,则代表匹配成功.
//                 if (x === subScopesLength - 1) {
//                     return true;
//                 }
//             }
//         }
//         return false;
//     }
//
//     /**
//      * 检查依赖树节点对象与候选对象规则是否匹配
//      * @param scopeInfo
//      * @param targetInfo
//      */
//     _entityIsMatched(scopeInfo: CandidateInfo, targetInfo: TestResourceDependencyTree): boolean {
//         if (scopeInfo.name !== targetInfo.name || scopeInfo.type !== targetInfo.type) {
//             return false;
//         }
//         if (scopeInfo.type === TestResourceOriginType.Object) {
//             return true;
//         }
//         return satisfies(targetInfo.version, scopeInfo.versionRange ?? '*');
//     }
//
//     /**
//      * 检查重复依赖或者循环依赖(deep=1的循环依赖,否则为重复依赖)
//      * @private
//      */
//     _checkCycleDependency(dependencies: TestResourceDependencyTree[], targetInfo: TestResourceDependencyTree, deep = 1): { result: boolean, deep: number, errorMsg?: string } {
//         if (isEmpty(dependencies)) {
//             return {result: false, deep};
//         }
//         if (dependencies.some(x => x.id === targetInfo.id && x.type === targetInfo.type)) {
//             return {result: true, deep};
//         }
//         if (deep > 50) { //内部限制最大依赖树深度
//             return {result: false, deep, errorMsg: this.ctx.gettext('reflect_rule_pre_excute_error_exceed_rely_limit')};
//         }
//         const subDependencies = chain(dependencies).map(m => m.dependencies).flattenDeep().value();
//         return this._checkCycleDependency(subDependencies, targetInfo, deep + 1);
//     }
//
//     /**
//      * 获取替换对象信息
//      * @param replacer
//      * @private
//      */
//     async _getReplacerInfo(replacer): Promise<ResourceInfo | ObjectStorageInfo> {
//         return replacer.type === TestResourceOriginType.Object
//             ? this.outsideApiService.getObjectInfo(replacer.name)
//             : this.outsideApiService.getResourceInfo(replacer.name, {projection: 'resourceId,resourceName,resourceType,resourceVersions,latestVersion'});
//     }
// }
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWN0aW9uLXJlcGxhY2UtaGFuZGxlcl9iYWsuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9zcmMvZXh0ZW5kL3Rlc3QtcnVsZS1oYW5kbGVyL2Jhay9hY3Rpb24tcmVwbGFjZS1oYW5kbGVyX2Jhay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsb0NBQW9DO0FBQ3BDLDBDQUEwQztBQUMxQyxzREFBc0Q7QUFDdEQsMEZBQTBGO0FBQzFGLFdBQVc7QUFDWCxxQkFBcUI7QUFDckIsMERBQTBEO0FBQzFELDhCQUE4QjtBQUM5Qix3QkFBd0I7QUFDeEIseUNBQXlDO0FBQ3pDLG1EQUFtRDtBQUNuRCxFQUFFO0FBQ0YsYUFBYTtBQUNiLHNDQUFzQztBQUN0QyxFQUFFO0FBQ0YsZ0JBQWdCO0FBQ2hCLDJCQUEyQjtBQUMzQixnQkFBZ0I7QUFDaEIsaUNBQWlDO0FBQ2pDLGdCQUFnQjtBQUNoQixtQ0FBbUM7QUFDbkMsZ0JBQWdCO0FBQ2hCLDZDQUE2QztBQUM3QyxFQUFFO0FBQ0YsVUFBVTtBQUNWLGdCQUFnQjtBQUNoQiw2QkFBNkI7QUFDN0IsVUFBVTtBQUNWLHNEQUFzRDtBQUN0RCxFQUFFO0FBQ0Ysc0dBQXNHO0FBQ3RHLHNCQUFzQjtBQUN0QixZQUFZO0FBQ1osRUFBRTtBQUNGLHFDQUFxQztBQUNyQyxnSkFBZ0o7QUFDaEosRUFBRTtBQUNGLHNCQUFzQjtBQUN0Qiw2Q0FBNkM7QUFDN0MsNERBQTREO0FBQzVELGNBQWM7QUFDZCx3REFBd0Q7QUFDeEQsUUFBUTtBQUNSLEVBQUU7QUFDRixVQUFVO0FBQ1YsaUJBQWlCO0FBQ2pCLDZCQUE2QjtBQUM3QixpQ0FBaUM7QUFDakMsNkJBQTZCO0FBQzdCLHdCQUF3QjtBQUN4Qix3QkFBd0I7QUFDeEIsVUFBVTtBQUNWLDBPQUEwTztBQUMxTyw2Q0FBNkM7QUFDN0Msc0JBQXNCO0FBQ3RCLFlBQVk7QUFDWixpRUFBaUU7QUFDakUsd0RBQXdEO0FBQ3hELDJHQUEyRztBQUMz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