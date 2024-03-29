import { IOutsideApiService } from '../../../interface';
import { Action, ContentReplace, IActionHandler, TestRuleMatchInfo } from '../../../test-node-interface';
import { FreelogContext } from 'egg-freelog-base';
import { ImportObjectEntityHandler } from '../import/import-object-entity-handler';
import { ImportResourceEntityHandler } from '../import/import-resource-entity-handler';
import { TestRuleChecker } from '../test-rule-checker';
export declare class ActionReplaceHandler implements IActionHandler<ContentReplace> {
    ctx: FreelogContext;
    testRuleChecker: TestRuleChecker;
    importObjectEntityHandler: ImportObjectEntityHandler;
    importResourceEntityHandler: ImportResourceEntityHandler;
    outsideApiService: IOutsideApiService;
    /**
     * 执行替换操作
     * @param ctx
     * @param testRuleInfo
     * @param action
     */
    handle(ctx: FreelogContext, testRuleInfo: TestRuleMatchInfo, action: Action<ContentReplace>): Promise<boolean>;
    /**
     * 递归替换依赖树
     * @param ctx
     * @param testRuleInfo
     * @param action
     * @param rootDependencies
     * @param dependencies
     * @param parents
     */
    private recursionReplace;
    /**
     * 匹配替换对象,此函数会在替换之后的结果上做多次替换.具体需要看规则的定义.即支持A=>B,B=>C,C=>D. 综合替换之后的结果为A替换成D.最终返回D以及D的依赖信息.
     * 然后上游调用者会把A以及A的所有依赖信息移除,替换成D以及D的依赖信息.然后在新的依赖树下递归调用后续的规则
     * @param ctx
     * @param testRuleInfo
     * @param action
     * @param targetInfo
     */
    private matchReplacer;
    /**
     * 检查规则的作用域是否匹配
     * 1.scopes为空数组即代表全局替换.
     * 2.多个scopes中如果有任意一个scope满足条件即可
     * 3.作用域链路需要与依赖的实际链路一致.但是可以少于实际链路,即作用域链路与实际链路的前半部分完全匹配
     * @param candidateScopes
     * @param parents
     * @private
     */
    private checkRuleScopeIsMatched;
    /**
     * 检查依赖树节点对象与候选对象规则是否匹配
     * @param candidateInfo
     * @param targetInfo
     */
    private entityIsMatched;
    /**
     * 检查重复依赖或者循环依赖(deep=1的循环依赖,否则为重复依赖)
     * @private
     */
    private checkCycleDependency;
    /**
     * 获取替换对象信息
     * @param ctx
     * @param replacer
     * @private
     */
    private getReplacerInfo;
    /**
     * 获取依赖树
     * @param entityType
     * @param entityId
     * @param entityVersion
     * @private
     */
    private getEntityDependencyTree;
}
