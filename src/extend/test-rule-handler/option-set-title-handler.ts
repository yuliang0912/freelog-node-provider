import {provide} from 'midway';
import {TestRuleMatchInfo, TestRuleEfficientInfo, TestNodeOperationEnum} from '../../test-node-interface';
import {isString} from 'lodash';

@provide()
export class OptionSetTitleHandler {

    private setTitleOptionEfficientCountInfo: TestRuleEfficientInfo = {type: 'setTitle', count: 1};

    /**
     * 替换展品标题操作
     * @param testRuleInfo
     */
    handle(testRuleInfo: TestRuleMatchInfo) {

        const {ruleInfo} = testRuleInfo;
        if (!testRuleInfo.isValid || !isString(ruleInfo.title) || ![TestNodeOperationEnum.Add, TestNodeOperationEnum.Alter].includes(ruleInfo.operation)) {
            return;
        }

        testRuleInfo.titleInfo = {title: testRuleInfo.ruleInfo.title, source: testRuleInfo.id};
        testRuleInfo.efficientInfos.push(this.setTitleOptionEfficientCountInfo);
    }
}
