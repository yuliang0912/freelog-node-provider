import {provide} from "midway";
import {TestRuleMatchInfo, TestRuleEfficientInfo} from "../../test-node-interface";
import {isBoolean} from 'lodash'

@provide()
export class OptionSetOnlineStatusHandler {

    private setOnlineStatusOptionEfficientCountInfo: TestRuleEfficientInfo = {type: 'setOnlineStatus', count: 1};

    /**
     * 执行替换操作
     * @param testRuleInfo
     */
    handle(testRuleInfo: TestRuleMatchInfo) {

        const {ruleInfo, presentableInfo} = testRuleInfo;
        if (!testRuleInfo.isValid || !['alter', 'add'].includes(ruleInfo.operation)) {
            return;
        }

        if (isBoolean(ruleInfo.online)) {
            testRuleInfo.onlineStatus = {status: ruleInfo.online ? 1 : 0, source: testRuleInfo.id};
            // 用户只有显示声明了上下线状态,才算一次有效匹配
            testRuleInfo.efficientCountInfos.push(this.setOnlineStatusOptionEfficientCountInfo);
        } else if (presentableInfo) {
            testRuleInfo.onlineStatus = {status: presentableInfo.onlineStatus, source: 'presentable'};
        } else {
            testRuleInfo.onlineStatus = {status: 0, source: 'default'};
        }
    }
}