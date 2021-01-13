import {provide} from "midway";
import {TestRuleMatchInfo, TestRuleEfficientInfo} from "../../test-node-interface";
import {isArray} from 'lodash'

@provide()
export class OptionSetAttrHandler {

    private setTagsOptionEfficientCountInfo: TestRuleEfficientInfo = {type: 'setTags', count: 1};

    /**
     * 替换自定义属性操作
     * @param testRuleInfo
     */
    handle(testRuleInfo: TestRuleMatchInfo) {

        const {ruleInfo} = testRuleInfo;
        if (!testRuleInfo.isValid || !isArray(ruleInfo.attrs) || !['alter', 'add'].includes(ruleInfo.operation)) {
            return;
        }

        testRuleInfo.attrs = {attrs: testRuleInfo.ruleInfo.attrs, source: testRuleInfo.id};
        testRuleInfo.efficientInfos.push(this.setTagsOptionEfficientCountInfo);
    }
}
