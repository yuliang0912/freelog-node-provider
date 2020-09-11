import { BaseTestRuleInfo, TestRuleMatchInfo } from "../../test-node-interface";
export declare class TestRuleHandler {
    nodeId: number;
    testRuleMatchInfos: TestRuleMatchInfo[];
    ctx: any;
    testRuleChecker: any;
    importObjectEntityHandler: any;
    importResourceEntityHandler: any;
    importPresentableEntityHandler: any;
    optionSetTagsHandler: any;
    optionReplaceHandler: any;
    optionSetOnlineStatusHandler: any;
    main(nodeId: number, testRules: BaseTestRuleInfo[]): Promise<TestRuleMatchInfo[]>;
    /**
     * 初始化规则,拓展规则的基础属性
     * @param testRules
     */
    initialTestRules(testRules: any): this;
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
