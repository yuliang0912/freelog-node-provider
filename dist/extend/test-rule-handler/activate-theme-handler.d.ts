import { TestRuleMatchInfo } from "../../test-node-interface";
import { IPresentableService } from "../../interface";
import { TestNodeGenerator } from "../test-node-generator";
export declare class ActivateThemeHandler {
    testNodeGenerator: TestNodeGenerator;
    presentableService: IPresentableService;
    private activeThemeEfficientCountInfo;
    /**
     * 激活主题操作
     * @param testRuleInfo
     * @param nodeId
     * @param testRuleMatchInfos
     */
    handle(testRuleInfo: TestRuleMatchInfo, nodeId: number, testRuleMatchInfos: TestRuleMatchInfo[]): Promise<void>;
}
