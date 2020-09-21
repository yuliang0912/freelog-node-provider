import {isEmpty} from "lodash";
import {provide, inject} from 'midway';
import {
    BaseTestRuleInfo, TestNodeOperationEnum, TestResourceOriginType, TestRuleMatchInfo
} from "../../test-node-interface";

const nmrTranslator = require('@freelog/nmr_translator');

@provide()
export class TestRuleHandler {

    nodeId: number;
    testRuleMatchInfos: TestRuleMatchInfo[] = [];

    @inject()
    ctx;
    @inject()
    testRuleChecker;
    @inject()
    importObjectEntityHandler;
    @inject()
    importResourceEntityHandler;
    @inject()
    importPresentableEntityHandler;
    @inject()
    optionSetTagsHandler;
    @inject()
    optionReplaceHandler;
    @inject()
    optionSetOnlineStatusHandler;
    @inject()
    testNodeGenerator;

    async main(nodeId: number, testRules: BaseTestRuleInfo[]) {

        this.nodeId = nodeId;
        // 初始化,转换数据格式.并且校验新增的展品名称是否与现有的展品名称冲突,新增的资源是否与现有展品对应的资源冲突.
        await this.initialTestRules(testRules).presentableNameAndResourceNameExistingCheck();

        await this.importEntityData();
        await this.generateDependencyTree();
        await this.ruleOptionsHandle();

        return this.testRuleMatchInfos;
    }

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
        return this;
    }

    /**
     * 编译测试规则
     * @param testRuleText
     */
    compileTestRule(testRuleText: string): { errors: string[], rules: BaseTestRuleInfo[] } {

        if (testRuleText === null || testRuleText === undefined || testRuleText === "") {
            return {errors: [], rules: []}
        }

        return nmrTranslator.compile(testRuleText);
    }

    /**
     * 检查add对应的presentableName或者resourceName是否已经存在
     */
    async presentableNameAndResourceNameExistingCheck() {
        await this.testRuleChecker.checkImportPresentableNameAndResourceNameIsExist(this.nodeId, this.testRuleMatchInfos);
        return this;
    }

    /**
     * 导入实体数据
     */
    async importEntityData(): Promise<void> {

        const {alterPresentableRules, addResourceRules, addObjectRules} = this.testRuleMatchInfos.reduce((acc, current) => {
            if (current.isValid && current.ruleInfo.operation === TestNodeOperationEnum.Alter) {
                acc.alterPresentableRules.push(current);
            } else if (current.isValid && current.ruleInfo.operation === TestNodeOperationEnum.Add && current.ruleInfo.candidate.type === TestResourceOriginType.Resource) {
                acc.addResourceRules.push(current);
            } else if (current.isValid && current.ruleInfo.operation === TestNodeOperationEnum.Add && current.ruleInfo.candidate.type === TestResourceOriginType.Object) {
                acc.addObjectRules.push(current);
            }
            return acc;
        }, {alterPresentableRules: [], addResourceRules: [], addObjectRules: []});

        const tasks = [];
        if (!isEmpty(alterPresentableRules)) {
            tasks.push(this.importPresentableEntityHandler.importPresentableEntityDataFromRules(this.nodeId, alterPresentableRules));
        }
        if (!isEmpty(addResourceRules)) {
            tasks.push(this.importResourceEntityHandler.importResourceEntityDataFromRules(addResourceRules));
        }
        if (!isEmpty(addObjectRules)) {
            tasks.push(this.importObjectEntityHandler.importObjectEntityDataFromRules(this.ctx.userId, addObjectRules));
        }
        await Promise.all(tasks);
    }

    /**
     * 生成依赖树
     */
    async generateDependencyTree(): Promise<void> {
        const tasks = [];
        for (const testRuleInfo of this.testRuleMatchInfos) {
            if (!testRuleInfo.isValid || !['alter', 'add'].includes(testRuleInfo.ruleInfo.operation)) {
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
                default:
                    generateDependencyTreeTask = this.importPresentableEntityHandler.getPresentableDependencyTree(testRuleInfo.presentableInfo.presentableId, testRuleInfo.presentableInfo.version);
                    break;
            }
            tasks.push(generateDependencyTreeTask.then(dependencyTree => testRuleInfo.entityDependencyTree = dependencyTree));
        }
        await Promise.all(tasks);
    }

    /**
     * 选项规则处理
     */
    async ruleOptionsHandle(): Promise<void> {
        const tasks = [];
        for (const testRuleInfo of this.testRuleMatchInfos) {
            this.optionSetTagsHandler.handle(testRuleInfo);
            this.optionSetOnlineStatusHandler.handle(testRuleInfo);
            tasks.push(this.optionReplaceHandler.handle(testRuleInfo));
        }
        await Promise.all(tasks);
    }
}