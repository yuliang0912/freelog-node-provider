import {
    IOperationHandler, TestNodeOperationEnum, TestResourceOriginType, TestRuleEfficientInfo, TestRuleMatchInfo
} from '../../../test-node-interface';
import {inject, provide} from 'midway';
import {FreelogContext, IMongodbOperation, ResourceTypeEnum} from 'egg-freelog-base';
import {PresentableInfo} from '../../../interface';

@provide()
export class OperationActivateThemeHandler implements IOperationHandler {

    @inject()
    ctx: FreelogContext;
    @inject()
    presentableProvider: IMongodbOperation<PresentableInfo>;

    private activeThemeEfficientCountInfo: TestRuleEfficientInfo = {
        type: TestNodeOperationEnum.ActivateTheme,
        count: 1
    };

    /**
     * 激活主题操作
     * @param testRuleList
     * @param nodeId
     */
    async handle(testRuleList: TestRuleMatchInfo[], nodeId: number): Promise<boolean> {

        const activeThemeRuleInfo = testRuleList.find(x => x.isValid && x.ruleInfo.operation === TestNodeOperationEnum.ActivateTheme);
        if (!activeThemeRuleInfo) {
            return true;
        }

        const targetRuleMatchInfo = testRuleList.find(x => [TestNodeOperationEnum.Add, TestNodeOperationEnum.Alter].includes(x.ruleInfo.operation) && x.ruleInfo.exhibitName === activeThemeRuleInfo.ruleInfo.exhibitName);
        if (targetRuleMatchInfo) {
            // 规则没问题 但是也没生效. 因为目标测试展品自身出现了问题
            if (!targetRuleMatchInfo.isValid) {
                return true;
            }
            const targetResourceType = targetRuleMatchInfo.rootResourceReplacer ? targetRuleMatchInfo.rootResourceReplacer.resourceType : targetRuleMatchInfo.testResourceOriginInfo.resourceType;
            if (targetResourceType === ResourceTypeEnum.THEME) {
                activeThemeRuleInfo.efficientInfos.push(this.activeThemeEfficientCountInfo);
                activeThemeRuleInfo.ruleInfo.candidate = {
                    name: targetRuleMatchInfo.testResourceOriginInfo.id,
                    type: targetRuleMatchInfo.testResourceOriginInfo.type
                };
                // 主题资源忽略是否上线,只看是否激活
                targetRuleMatchInfo.themeInfo = {
                    isActivatedTheme: 1, ruleId: activeThemeRuleInfo.id
                };
                targetRuleMatchInfo.efficientInfos.push(this.activeThemeEfficientCountInfo);
                return true;
            }
            activeThemeRuleInfo.matchErrors.push(this.ctx.gettext(`reflect_rule_pre_excute_error_exhibit_not_theme`, activeThemeRuleInfo.ruleInfo.exhibitName));
            return false;
        }

        const presentableInfo = await this.presentableProvider.findOne({
            nodeId, presentableName: new RegExp(`^${activeThemeRuleInfo.ruleInfo.exhibitName.trim()}$`, 'i')
        });
        if (!presentableInfo) {
            activeThemeRuleInfo.matchErrors.push(this.ctx.gettext(`reflect_rule_pre_excute_error_exhibit_not_existed`, activeThemeRuleInfo.ruleInfo.exhibitName));
            return false;
        } else if (presentableInfo.resourceInfo.resourceType !== ResourceTypeEnum.THEME) {
            activeThemeRuleInfo.matchErrors.push(this.ctx.gettext(`reflect_rule_pre_excute_error_exhibit_not_theme`, activeThemeRuleInfo.ruleInfo.exhibitName));
            return false;
        }
        activeThemeRuleInfo.ruleInfo.candidate = {
            name: presentableInfo.resourceInfo.resourceId,
            type: TestResourceOriginType.Resource
        };
        activeThemeRuleInfo.efficientInfos.push(this.activeThemeEfficientCountInfo);
        return true;
    }
}
