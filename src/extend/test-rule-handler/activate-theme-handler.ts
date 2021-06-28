import {inject, provide} from 'midway';
import {IMongodbOperation, ResourceTypeEnum} from 'egg-freelog-base';
import {TestRuleMatchInfo, TestRuleEfficientInfo, TestResourceInfo} from '../../test-node-interface';

@provide()
export class ActivateThemeHandler {

    @inject()
    nodeTestResourceProvider: IMongodbOperation<TestResourceInfo>;

    private activeThemeEfficientCountInfo: TestRuleEfficientInfo = {type: 'activateTheme', count: 1};

    /**
     * 激活主题操作(此规则需要后置单独处理)
     * @param nodeId
     * @param activeThemeRuleInfo
     */
    async handle(nodeId: number, activeThemeRuleInfo: TestRuleMatchInfo): Promise<TestResourceInfo> {

        const themeResourceInfo = await this.nodeTestResourceProvider.findOne({
            nodeId,
            testResourceName: new RegExp(`^${activeThemeRuleInfo.ruleInfo.themeName}$`, 'i')
        });
        if (activeThemeRuleInfo?.isValid === false) {
            return themeResourceInfo;
        }
        if (!themeResourceInfo) {
            activeThemeRuleInfo.isValid = false;
            activeThemeRuleInfo.matchErrors.push(`展品${activeThemeRuleInfo.ruleInfo.themeName}不是一个有效的主题资源`);
            return;
        } else if (themeResourceInfo.resourceType !== ResourceTypeEnum.THEME) {
            activeThemeRuleInfo.isValid = false;
            activeThemeRuleInfo.matchErrors.push(`展品${activeThemeRuleInfo.ruleInfo.themeName}资源类型不是主题(${ResourceTypeEnum.THEME})`);
            return;
        }

        activeThemeRuleInfo.efficientInfos.push(this.activeThemeEfficientCountInfo);
        return themeResourceInfo;
    }
}
