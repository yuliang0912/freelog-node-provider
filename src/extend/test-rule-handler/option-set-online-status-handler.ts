import {provide} from "midway";
import {TestRuleMatchInfo, TestRuleEfficientInfo, TestNodeOperationEnum} from "../../test-node-interface";
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
        if (!testRuleInfo.isValid || ![TestNodeOperationEnum.Add, TestNodeOperationEnum.Alter].includes(ruleInfo.operation)) {
            return;
        }

        if (isBoolean(ruleInfo.online)) {
            testRuleInfo.onlineStatusInfo = {status: ruleInfo.online ? 1 : 0, source: testRuleInfo.id};
            // 用户只有显示声明了上下线状态,才算一次有效匹配
            testRuleInfo.efficientInfos.push(this.setOnlineStatusOptionEfficientCountInfo);
        } else if (presentableInfo) {
            testRuleInfo.onlineStatusInfo = {status: presentableInfo.onlineStatus, source: 'presentable'};
        } else {
            testRuleInfo.onlineStatusInfo = {status: 0, source: 'default'};
        }
    }
}
