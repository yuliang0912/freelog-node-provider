import {isEmpty} from 'lodash';
import {
    IActionHandler,
    IOperationHandler,
    TestNodeOperationEnum,
    TestResourceOriginType,
    TestRuleMatchInfo
} from '../../../test-node-interface';
import {inject, provide} from 'midway';
import {FreelogContext} from 'egg-freelog-base';
import {ImportObjectEntityHandler} from '../import/import-object-entity-handler';
import {ImportResourceEntityHandler} from '../import/import-resource-entity-handler';

@provide()
export class OperationAddHandler implements IOperationHandler {

    @inject()
    ctx: FreelogContext;
    @inject()
    actionHandler: IActionHandler<any>;
    @inject()
    importObjectEntityHandler: ImportObjectEntityHandler;
    @inject()
    importResourceEntityHandler: ImportResourceEntityHandler;

    /**
     * 导入规则处理. 主要导入资源或者存储对象
     * @param testRuleList
     */
    async handle(testRuleList: TestRuleMatchInfo[]): Promise<boolean> {

        const addObjectRules: TestRuleMatchInfo[] = [];
        const addResourceRules: TestRuleMatchInfo[] = [];

        for (const testRuleMatchInfo of testRuleList) {
            if (!testRuleMatchInfo.isValid || testRuleMatchInfo.ruleInfo.operation !== TestNodeOperationEnum.Add) {
                continue;
            }
            if (testRuleMatchInfo.ruleInfo.candidate.type === TestResourceOriginType.Object) {
                addObjectRules.push(testRuleMatchInfo);
            } else if (testRuleMatchInfo.ruleInfo.candidate.type === TestResourceOriginType.Resource) {
                addResourceRules.push(testRuleMatchInfo);
            }
        }

        const tasks = [];
        if (!isEmpty(addResourceRules)) {
            tasks.push(this.importResourceEntityHandler.importResourceEntityDataFromRules(addResourceRules));
        }
        if (!isEmpty(addObjectRules)) {
            tasks.push(this.importObjectEntityHandler.importObjectEntityDataFromRules(this.ctx.userId, addObjectRules));
        }
        await Promise.all(tasks);

        for (const testRuleMatchInfo of testRuleList) {
            if (!testRuleMatchInfo.isValid || testRuleMatchInfo.ruleInfo.operation !== TestNodeOperationEnum.Add) {
                continue;
            }
            testRuleMatchInfo.operationAndActionRecords.push({
                type: TestNodeOperationEnum.Add, data: {
                    exhibitName: testRuleMatchInfo.ruleInfo.exhibitName,
                    candidate: testRuleMatchInfo.ruleInfo.candidate
                }
            });
            testRuleMatchInfo.efficientInfos.push({type: TestNodeOperationEnum.Add, count: 1});
            for (const action of testRuleMatchInfo.ruleInfo.actions ?? []) {
                await this.actionHandler.handle(this.ctx, testRuleMatchInfo, action);
            }
        }

        return true;
    }
}
