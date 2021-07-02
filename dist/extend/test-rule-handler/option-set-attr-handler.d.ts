import { TestRuleMatchInfo } from '../../test-node-interface';
import { FreelogContext } from 'egg-freelog-base';
export declare class OptionSetAttrHandler {
    ctx: FreelogContext;
    private setAttrOptionEfficientCountInfo;
    /**
     * 替换自定义属性操作
     * @param testRuleInfo
     */
    handle(testRuleInfo: TestRuleMatchInfo): void;
}
