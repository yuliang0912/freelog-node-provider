import {provide} from "midway";
import {TestRuleMatchInfo, TestRuleEfficientInfo} from "../../test-node-interface";
import {isString} from 'lodash'

@provide()
export class OptionSetCoverHandler {

    private setTagsOptionEfficientCountInfo: TestRuleEfficientInfo = {type: 'setTags', count: 1};

    /**
     * 替换展品封面操作
     * @param testRuleInfo
     */
    handle(testRuleInfo: TestRuleMatchInfo) {

        const {ruleInfo} = testRuleInfo;
        if (!testRuleInfo.isValid || !isString(ruleInfo.cover) || !['alter', 'add'].includes(ruleInfo.operation)) {
            return;
        }

        testRuleInfo.cover = {cover: testRuleInfo.ruleInfo.cover, source: testRuleInfo.id};
        testRuleInfo.efficientInfos.push(this.setTagsOptionEfficientCountInfo);
    }
}
