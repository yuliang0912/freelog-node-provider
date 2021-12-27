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
