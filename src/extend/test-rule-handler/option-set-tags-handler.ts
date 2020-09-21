import {provide} from "midway";
import {TestRuleMatchInfo, TestRuleEfficientInfo} from "../../test-node-interface";
import {isArray} from 'lodash'

@provide()
export class OptionSetTagsHandler {

    private setTagsOptionEfficientCountInfo: TestRuleEfficientInfo = {type: 'setTags', count: 1};

    /**
     * 替换标签操作
     * @param testRuleInfo
     */
    handle(testRuleInfo: TestRuleMatchInfo) {

        const {ruleInfo} = testRuleInfo;
        if (!testRuleInfo.isValid || !isArray(ruleInfo.tags) || !['alter', 'add'].includes(ruleInfo.operation)) {
            return;
        }

        testRuleInfo.tags = {tags: testRuleInfo.ruleInfo.tags, source: testRuleInfo.id};
        testRuleInfo.efficientInfos.push(this.setTagsOptionEfficientCountInfo);
    }
}