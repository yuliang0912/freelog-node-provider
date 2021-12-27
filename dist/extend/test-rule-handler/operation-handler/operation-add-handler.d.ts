import { IActionHandler, IOperationHandler, TestRuleMatchInfo } from '../../../test-node-interface';
import { FreelogContext } from 'egg-freelog-base';
import { ImportObjectEntityHandler } from '../import/import-object-entity-handler';
import { ImportResourceEntityHandler } from '../import/import-resource-entity-handler';
export declare class OperationAddHandler implements IOperationHandler {
    ctx: FreelogContext;
    actionHandler: IActionHandler<any>;
    importObjectEntityHandler: ImportObjectEntityHandler;
    importResourceEntityHandler: ImportResourceEntityHandler;
    /**
     * 导入规则处理. 主要导入资源或者存储对象
     * @param testRuleList
     */
    handle(testRuleList: TestRuleMatchInfo[]): Promise<boolean>;
}
