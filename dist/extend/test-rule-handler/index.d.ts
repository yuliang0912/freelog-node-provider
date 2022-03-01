import { BaseTestRuleInfo, IOperationHandler, TestRuleMatchInfo } from '../../test-node-interface';
import { ImportResourceEntityHandler } from './import/import-resource-entity-handler';
import { ImportObjectEntityHandler } from './import/import-object-entity-handler';
import { OperationActivateThemeHandler } from './operation-handler/operation-activate-theme-handler';
export declare class TestRuleHandler {
    nodeId: number;
    testRuleMatchInfos: TestRuleMatchInfo[];
    ctx: any;
    testRuleChecker: any;
    importObjectEntityHandler: ImportObjectEntityHandler;
    importResourceEntityHandler: ImportResourceEntityHandler;
    operationAddHandler: IOperationHandler;
    operationAlterHandler: IOperationHandler;
    operationActivateThemeHandler: OperationActivateThemeHandler;
    testNodeGenerator: any;
    main(nodeId: number, testRules: BaseTestRuleInfo[]): Promise<TestRuleMatchInfo[]>;
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
     * 生成依赖树
     */
    generateDependencyTree(): Promise<void>;
}
