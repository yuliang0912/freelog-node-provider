import {inject, provide} from 'midway';
import {
    BaseTestRuleInfo, IOperationHandler,
    TestResourceOriginType, TestRuleMatchInfo
} from '../../test-node-interface';
import {compile} from '@freelog/nmr_translator';
import {ImportResourceEntityHandler} from './import/import-resource-entity-handler';
import {ImportObjectEntityHandler} from './import/import-object-entity-handler';
import {OperationActivateThemeHandler} from './operation-handler/operation-activate-theme-handler';

@provide()
export class TestRuleHandler {

    nodeId: number;
    testRuleMatchInfos: TestRuleMatchInfo[] = [];

    @inject()
    ctx;
    @inject()
    testRuleChecker;
    @inject()
    importObjectEntityHandler: ImportObjectEntityHandler;
    @inject()
    importResourceEntityHandler: ImportResourceEntityHandler;

    @inject()
    operationAddHandler: IOperationHandler;
    @inject()
    operationAlterHandler: IOperationHandler;
    @inject()
    operationActivateThemeHandler: OperationActivateThemeHandler;
    @inject()
    testNodeGenerator;

    async main(nodeId: number, testRules: BaseTestRuleInfo[]): Promise<TestRuleMatchInfo[]> {

        this.nodeId = nodeId;
        // 初始化,转换数据格式.并且校验新增的展品名称是否与现有的展品名称冲突,新增的资源是否与现有展品对应的资源冲突.
        await this.initialTestRules(testRules).presentableNameAndResourceNameExistingCheck();

        await this.operationAddHandler.handle(this.testRuleMatchInfos, nodeId);
        await this.operationAlterHandler.handle(this.testRuleMatchInfos, nodeId);
        await this.generateDependencyTree();
        await this.operationActivateThemeHandler.handle(this.testRuleMatchInfos, nodeId);
        // console.log(JSON.stringify(this.testRuleMatchInfos));
        return this.testRuleMatchInfos;
    }

    /**
     * 匹配激活主题规则
     * @param nodeId
     * @param activeThemeRuleInfo
     */
    // matchThemeRule(nodeId: number, activeThemeRuleInfo: TestRuleMatchInfo): Promise<TestResourceInfo> {
    //     // 代码已重新实现,此处已无用
    //     //if (!activeThemeRuleInfo) {
    //     //  return null;
    //     //}
    //     // return this.activateThemeHandler.handle(nodeId, activeThemeRuleInfo);
    // }

    /**
     * 初始化规则,拓展规则的基础属性
     * @param testRules
     */
    initialTestRules(testRules: BaseTestRuleInfo[]) {

        this.testRuleMatchInfos = testRules.map(ruleInfo => Object({
            id: this.testNodeGenerator.generateTestRuleId(this.nodeId, ruleInfo.text ?? ''),
            isValid: true,
            matchErrors: [],
            effectiveMatchCount: 0,
            efficientInfos: [],
            ruleInfo
        }));
        this.testRuleMatchInfos.forEach(item => Object.defineProperty(item, 'isValid', {
            get(): boolean {
                return !item.matchErrors.length;
            }
        }));
        return this;
    }

    /**
     * 编译测试规则
     * @param testRuleText
     */
    compileTestRule(testRuleText: string): { errors: string[], rules: BaseTestRuleInfo[] } {

        if (testRuleText === null || testRuleText === undefined || testRuleText === '') {
            return {errors: [], rules: []};
        }

        return compile(testRuleText);
    }

    /**
     * 检查add对应的presentableName或者resourceName是否已经存在
     */
    async presentableNameAndResourceNameExistingCheck() {
        await this.testRuleChecker.checkImportPresentableNameAndResourceNameIsExist(this.nodeId, this.testRuleMatchInfos);
        return this;
    }

    /**
     * 生成依赖树
     */
    async generateDependencyTree(): Promise<void> {
        const tasks = [];
        for (const testRuleInfo of this.testRuleMatchInfos) {
            // 如果执行替换规则,已经生成过依赖树,此处会自动忽略
            if (!testRuleInfo.isValid || !['alter', 'add'].includes(testRuleInfo.ruleInfo.operation) || testRuleInfo.entityDependencyTree) {
                continue;
            }
            let generateDependencyTreeTask = null;
            switch (testRuleInfo.ruleInfo.candidate?.type) {
                case TestResourceOriginType.Object:
                    generateDependencyTreeTask = this.importObjectEntityHandler.getObjectDependencyTree(testRuleInfo.testResourceOriginInfo.id);
                    break;
                case TestResourceOriginType.Resource:
                    generateDependencyTreeTask = this.importResourceEntityHandler.getResourceDependencyTree(testRuleInfo.testResourceOriginInfo.id, testRuleInfo.testResourceOriginInfo.version);
                    break;
            }
            if (generateDependencyTreeTask !== null) {
                tasks.push(generateDependencyTreeTask.then(dependencyTree => testRuleInfo.entityDependencyTree = dependencyTree));
            }
        }
        await Promise.all(tasks);
    }
}
