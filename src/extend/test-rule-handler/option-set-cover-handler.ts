import {provide} from "midway";
import {TestRuleMatchInfo, TestRuleEfficientInfo, TestNodeOperationEnum} from "../../test-node-interface";
import {isString} from 'lodash'

@provide()
export class OptionSetCoverHandler {

    private setCoverOptionEfficientCountInfo: TestRuleEfficientInfo = {type: 'setCover', count: 1};

    /**
     * 替换展品封面操作
     * @param testRuleInfo
     */
    handle(testRuleInfo: TestRuleMatchInfo) {

        const {ruleInfo} = testRuleInfo;
        if (!testRuleInfo.isValid || !isString(ruleInfo.cover) || ![TestNodeOperationEnum.Add, TestNodeOperationEnum.Alter].includes(ruleInfo.operation)) {
            return;
        }

        testRuleInfo.coverInfo = {coverImages: [testRuleInfo.ruleInfo.cover], source: testRuleInfo.id};
        testRuleInfo.efficientInfos.push(this.setCoverOptionEfficientCountInfo);
    }
}
