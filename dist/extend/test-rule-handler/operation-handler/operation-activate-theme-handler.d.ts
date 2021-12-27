import { IOperationHandler, TestRuleMatchInfo } from '../../../test-node-interface';
import { FreelogContext, IMongodbOperation } from 'egg-freelog-base';
import { PresentableInfo } from '../../../interface';
export declare class OperationActivateThemeHandler implements IOperationHandler {
    ctx: FreelogContext;
    presentableProvider: IMongodbOperation<PresentableInfo>;
    private activeThemeEfficientCountInfo;
    /**
     * 激活主题操作
     * @param testRuleList
     * @param nodeId
     */
    handle(testRuleList: TestRuleMatchInfo[], nodeId: number): Promise<boolean>;
}
