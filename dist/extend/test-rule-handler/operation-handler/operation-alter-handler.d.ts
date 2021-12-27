import { IActionHandler, IOperationHandler, TestRuleMatchInfo } from '../../../test-node-interface';
import { FreelogContext } from 'egg-freelog-base';
import { ImportPresentableEntityHandler } from '../import/import-presentable-entity-handler';
export declare class OperationAlterHandler implements IOperationHandler {
    ctx: FreelogContext;
    actionHandler: IActionHandler<any>;
    importPresentableEntityHandler: ImportPresentableEntityHandler;
    /**
     * 修改(alter)规则处理. 主要导入资源或者存储对象
     * @param testRuleList
     * @param nodeId
     */
    handle(testRuleList: TestRuleMatchInfo[], nodeId: number): Promise<boolean>;
}
