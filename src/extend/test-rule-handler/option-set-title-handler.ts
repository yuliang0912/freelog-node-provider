import {provide} from "midway";
import {TestRuleMatchInfo, TestRuleEfficientInfo} from "../../test-node-interface";
import {isString} from 'lodash'

@provide()
export class OptionSetTitleHandler {

    private setTagsOptionEfficientCountInfo: TestRuleEfficientInfo = {type: 'setTags', count: 1};

    /**
     * 替换展品标题操作
     * @param testRuleInfo
     */
    handle(testRuleInfo: TestRuleMatchInfo) {

        const {ruleInfo} = testRuleInfo;
        if (!testRuleInfo.isValid || !isString(ruleInfo.title) || !['alter', 'add'].includes(ruleInfo.operation)) {
            return;
        }

        testRuleInfo.title = {title: testRuleInfo.ruleInfo.title, source: testRuleInfo.id};
        testRuleInfo.efficientInfos.push(this.setTagsOptionEfficientCountInfo);
    }
}
