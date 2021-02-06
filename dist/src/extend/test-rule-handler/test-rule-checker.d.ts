import { IPresentableService } from "../../interface";
import { TestRuleMatchInfo } from "../../test-node-interface";
export declare class TestRuleChecker {
    presentableService: IPresentableService;
    /**
     * 批量检测导入规则中的presentableName是否已存在.以及导入的发行是否已经签约到正式节点中
     * @private
     */
    checkImportPresentableNameAndResourceNameIsExist(nodeId: number, testRules: TestRuleMatchInfo[]): Promise<TestRuleMatchInfo[]>;
    _isEqualStr(x: string, y: string, ignoreLowerAndUpCase?: boolean): boolean;
}
