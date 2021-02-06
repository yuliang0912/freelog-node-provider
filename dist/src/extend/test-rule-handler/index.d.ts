import { BaseTestRuleInfo, TestResourceInfo, TestRuleMatchInfo } from "../../test-node-interface";
import { PresentableCommonChecker } from "../presentable-common-checker";
export declare class TestRuleHandler {
    nodeId: number;
    testRuleMatchInfos: TestRuleMatchInfo[];
    activateThemeRule: BaseTestRuleInfo;
    ctx: any;
    testRuleChecker: any;
    importObjectEntityHandler: any;
    importResourceEntityHandler: any;
    importPresentableEntityHandler: any;
    presentableCommonChecker: PresentableCommonChecker;
    optionSetTagsHandler: any;
    optionReplaceHandler: any;
    optionSetOnlineStatusHandler: any;
    optionSetAttrHandler: any;
    optionSetTitleHandler: any;
    optionSetCoverHandler: any;
    activateThemeHandler: any;
    testNodeGenerator: any;
    main(nodeId: number, testRules: BaseTestRuleInfo[]): Promise<TestRuleMatchInfo[]>;
    /**
     * 匹配激活主题规则
     * @param nodeId
     * @param activeThemeRuleInfo
     */
    matchThemeRule(nodeId: number, activeThemeRuleInfo: TestRuleMatchInfo): Promise<TestResourceInfo>;
    /**
     * 初始化规则,拓展规则的基础属性
     * @param testRules
     */
    initialTestRules(testRules: BaseTestRuleInfo[]): this;
    /**
     * 编译测试规则
     * @param testRuleText
     */
    compileTestRule(testRuleText: string): {
        errors: string[];
        rules: BaseTestRuleInfo[];
    };
    /**
     * 检查add对应的presentableName或者resourceName是否已经存在
     */
    presentableNameAndResourceNameExistingCheck(): Promise<this>;
    /**
     * 导入实体数据
     */
    importEntityData(): Promise<void>;
    /**
     * 生成依赖树
     */
    generateDependencyTree(): Promise<void>;
    /**
     * 选项规则处理
     */
    ruleOptionsHandle(): Promise<void>;
}
