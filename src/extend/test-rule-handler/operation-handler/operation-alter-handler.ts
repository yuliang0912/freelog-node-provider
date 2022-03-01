import {isEmpty} from 'lodash';
import {
    IActionHandler, IOperationHandler, TestNodeOperationEnum, TestRuleMatchInfo
} from '../../../test-node-interface';
import {inject, provide} from 'midway';
import {FreelogContext} from 'egg-freelog-base';
import {ImportPresentableEntityHandler} from '../import/import-presentable-entity-handler';

@provide()
export class OperationAlterHandler implements IOperationHandler {

    @inject()
    ctx: FreelogContext;
    @inject()
    actionHandler: IActionHandler<any>;
    @inject()
    importPresentableEntityHandler: ImportPresentableEntityHandler;

    /**
     * 修改(alter)规则处理. 主要导入资源或者存储对象
     * @param testRuleList
     * @param nodeId
     */
    async handle(testRuleList: TestRuleMatchInfo[], nodeId: number): Promise<boolean> {

        const alterPresentableRules = testRuleList.filter(x => x.isValid && x.ruleInfo.operation === TestNodeOperationEnum.Alter);
        if (isEmpty(alterPresentableRules)) {
            return true;
        }

        await this.importPresentableEntityHandler.importPresentableEntityDataFromRules(nodeId, alterPresentableRules);

        for (const testRuleMatchInfo of testRuleList) {
            if (!testRuleMatchInfo.isValid || testRuleMatchInfo.ruleInfo.operation !== TestNodeOperationEnum.Alter) {
                continue;
            }
            testRuleMatchInfo.operationAndActionRecords.push({
                type: TestNodeOperationEnum.Alter, data: {
                    exhibitName: testRuleMatchInfo.ruleInfo.exhibitName
                }
            });
            testRuleMatchInfo.efficientInfos.push({type: TestNodeOperationEnum.Alter, count: 1});
            for (const action of testRuleMatchInfo.ruleInfo.actions ?? []) {
                await this.actionHandler.handle(this.ctx, testRuleMatchInfo, action);
            }
        }

        return true;
    }
}
