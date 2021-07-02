import {inject, provide} from 'midway';
import {FreelogContext, IMongodbOperation, ResourceTypeEnum} from 'egg-freelog-base';
import {TestRuleMatchInfo, TestRuleEfficientInfo, TestResourceInfo} from '../../test-node-interface';

@provide()
export class ActivateThemeHandler {

    @inject()
    ctx: FreelogContext;
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
            activeThemeRuleInfo.matchErrors.push(this.ctx.gettext(`reflect_rule_pre_excute_error_exhibit_not_existed`, activeThemeRuleInfo.ruleInfo.themeName));
            return;
        } else if (themeResourceInfo.resourceType !== ResourceTypeEnum.THEME) {
            activeThemeRuleInfo.matchErrors.push(this.ctx.gettext(`reflect_rule_pre_excute_error_exhibit_not_theme`, activeThemeRuleInfo.ruleInfo.themeName));
            return;
        }

        activeThemeRuleInfo.efficientInfos.push(this.activeThemeEfficientCountInfo);
        return themeResourceInfo;
    }
}
