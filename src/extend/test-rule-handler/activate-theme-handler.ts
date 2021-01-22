import {inject, provide} from "midway";
import {
    TestRuleMatchInfo,
    TestRuleEfficientInfo,
    TestNodeOperationEnum, TestResourceOriginType,
} from "../../test-node-interface";
import {isString} from 'lodash'
import {ResourceTypeEnum} from "egg-freelog-base";
import {IPresentableService} from "../../interface";
import {TestNodeGenerator} from "../test-node-generator";


@provide()
export class ActivateThemeHandler {

    @inject()
    testNodeGenerator: TestNodeGenerator;
    @inject()
    presentableService: IPresentableService;

    private activeThemeEfficientCountInfo: TestRuleEfficientInfo = {type: 'activateTheme', count: 1};

    /**
     * 激活主题操作
     * @param testRuleInfo
     * @param nodeId
     * @param testRuleMatchInfos
     */
    async handle(testRuleInfo: TestRuleMatchInfo, nodeId: number, testRuleMatchInfos: TestRuleMatchInfo[]) {

        const {ruleInfo} = testRuleInfo;
        if (!testRuleInfo.isValid || !isString(ruleInfo.exhibitName) || ruleInfo.operation !== TestNodeOperationEnum.ActivateTheme) {
            return;
        }

        const themeTestResourceInfo = testRuleMatchInfos.find(x => x.ruleInfo.exhibitName.toLowerCase() === ruleInfo.exhibitName.toLowerCase());
        if (themeTestResourceInfo && (!themeTestResourceInfo.isValid || themeTestResourceInfo.testResourceOriginInfo.resourceType !== ResourceTypeEnum.THEME)) {
            testRuleInfo.isValid = false;
            testRuleInfo.matchErrors.push(`展品${testRuleInfo.ruleInfo.exhibitName}不是一个有效的主题资源`);
            return;
        } else if (themeTestResourceInfo) {
            testRuleInfo.themeInfo = {
                testResourceId: this.testNodeGenerator.generateTestResourceId(nodeId, themeTestResourceInfo.testResourceOriginInfo),
                source: testRuleInfo.id
            };
            testRuleInfo.efficientInfos.push(this.activeThemeEfficientCountInfo);
            return;
        }

        const presentableInfo = await this.presentableService.findOne({
            nodeId, presentableName: new RegExp(`^${testRuleInfo.ruleInfo.exhibitName}$`, 'i')
        }, 'resourceInfo');

        if (!presentableInfo || presentableInfo.resourceInfo.resourceType !== ResourceTypeEnum.THEME) {
            testRuleInfo.isValid = false;
            testRuleInfo.matchErrors.push(`展品${testRuleInfo.ruleInfo.exhibitName}不是一个有效的主题资源`);
            return;
        }

        testRuleInfo.themeInfo = {
            testResourceId: this.testNodeGenerator.generateTestResourceId(nodeId, {
                id: presentableInfo.resourceInfo.resourceId,
                type: TestResourceOriginType.Resource
            } as any), source: testRuleInfo.id
        };
        testRuleInfo.efficientInfos.push(this.activeThemeEfficientCountInfo);
    }
}
