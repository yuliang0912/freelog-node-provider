import {isEmpty} from 'lodash';
import {inject, provide} from 'midway';
import {
    BaseTestRuleInfo,
    TestNodeOperationEnum,
    TestResourceInfo,
    TestResourceOriginType,
    TestRuleMatchInfo
} from '../../test-node-interface';
import {PresentableCommonChecker} from '../presentable-common-checker';
import {compile} from '@freelog/nmr_translator';
import {IOutsideApiService} from '../../interface';

@provide()
export class TestRuleHandler {

    nodeId: number;
    testRuleMatchInfos: TestRuleMatchInfo[] = [];
    activateThemeRule: BaseTestRuleInfo;

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
    presentableCommonChecker: PresentableCommonChecker;
    @inject()
    optionSetTagsHandler;
    @inject()
    optionReplaceHandler;
    @inject()
    optionSetOnlineStatusHandler;
    @inject()
    optionSetAttrHandler;
    @inject()
    optionSetTitleHandler;
    @inject()
    optionSetCoverHandler;
    @inject()
    activateThemeHandler;
    @inject()
    testNodeGenerator;
    @inject()
    outsideApiService: IOutsideApiService;

    async main(nodeId: number, testRules: BaseTestRuleInfo[]): Promise<TestRuleMatchInfo[]> {

        this.nodeId = nodeId;
        // 初始化,转换数据格式.并且校验新增的展品名称是否与现有的展品名称冲突,新增的资源是否与现有展品对应的资源冲突.
        await this.initialTestRules(testRules).presentableNameAndResourceNameExistingCheck();

        await this.importEntityData();
        await this.generateDependencyTree();
        await this.ruleOptionsHandle();

        return this.testRuleMatchInfos;
    }

    /**
     * 匹配激活主题规则
     * @param nodeId
     * @param activeThemeRuleInfo
     */
    matchThemeRule(nodeId: number, activeThemeRuleInfo: TestRuleMatchInfo): Promise<TestResourceInfo> {
        if (!activeThemeRuleInfo) {
            return null;
        }
        return this.activateThemeHandler.handle(nodeId, activeThemeRuleInfo);
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
            }
            if (generateDependencyTreeTask !== null) {
                tasks.push(generateDependencyTreeTask.then(dependencyTree => testRuleInfo.entityDependencyTree = dependencyTree));
            }
        }
        await Promise.all(tasks);
    }

    /**
     * 选项规则处理
     */
    async ruleOptionsHandle(): Promise<void> {

        const tasks = this.testRuleMatchInfos.map(testRuleInfo => this.optionReplaceHandler.handle(testRuleInfo));

        await Promise.all(tasks);

        const rootResourceReplacerRules = this.testRuleMatchInfos.filter(x => x.isValid && x.rootResourceReplacer?.type === TestResourceOriginType.Resource);
        const resourceVersionIds = rootResourceReplacerRules.map(x => this.presentableCommonChecker.generateResourceVersionId(x.rootResourceReplacer.id, x.rootResourceReplacer.version));
        const resourceProperties = await this.outsideApiService.getResourceVersionList(resourceVersionIds, {
            projection: 'resourceId,systemProperty,customPropertyDescriptors'
        });

        for (const ruleInfo of rootResourceReplacerRules) {
            const resourceProperty = resourceProperties.find(x => x.resourceId === ruleInfo.rootResourceReplacer.id);
            ruleInfo.rootResourceReplacer.systemProperty = resourceProperty.systemProperty;
            ruleInfo.rootResourceReplacer.customPropertyDescriptors = resourceProperty.customPropertyDescriptors;
        }

        for (const testRuleInfo of this.testRuleMatchInfos) {
            this.optionSetTagsHandler.handle(testRuleInfo);
            this.optionSetTitleHandler.handle(testRuleInfo);
            this.optionSetCoverHandler.handle(testRuleInfo);
            this.optionSetAttrHandler.handle(testRuleInfo);
            this.optionSetOnlineStatusHandler.handle(testRuleInfo);
        }
    }
}
