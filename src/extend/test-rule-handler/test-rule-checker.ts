import {isEmpty, isString} from 'lodash';
import {provide, inject} from 'midway';
import {IPresentableService} from '../../interface';
import {
    TestNodeOperationEnum,
    TestResourceOriginType,
    TestResourcePropertyInfo,
    TestRuleMatchInfo
} from '../../test-node-interface';
import {FreelogContext} from 'egg-freelog-base';

@provide()
export class TestRuleChecker {

    @inject()
    ctx: FreelogContext;
    @inject()
    presentableService: IPresentableService;

    /**
     * 设置实体的系统属性和自定义属性
     * @param matchRule
     * @param systemProperty
     * @param customPropertyDescriptors
     * @param presentableRewriteProperty
     */
    fillEntityPropertyMap(matchRule: TestRuleMatchInfo, systemProperty: object, customPropertyDescriptors: any[], presentableRewriteProperty?: any[]) {
        matchRule.propertyMap = new Map<string, TestResourcePropertyInfo>();
        for (const [key, value] of Object.entries(systemProperty)) {
            matchRule.propertyMap.set(key, {
                key, value: value as string,
                remark: '', authority: 1
            });
        }
        for (const {key, defaultValue, remark, type} of customPropertyDescriptors) {
            matchRule.propertyMap.set(key, {
                key, value: defaultValue, remark,
                authority: type === 'readonlyText' ? 1 : 2
            });
        }
        for (const {key, value, remark} of presentableRewriteProperty ?? []) {
            const property = matchRule.propertyMap.get(key);
            if (property && [1, 2].includes(property.authority)) {
                continue;
            }
            matchRule.propertyMap.set(key, {key, authority: 6, value, remark});
        }
    }

    /**
     * 批量检测导入规则中的presentableName是否已存在.以及导入的发行是否已经签约到正式节点中
     * @private
     */
    async checkImportPresentableNameAndResourceNameIsExist(nodeId: number, testRules: TestRuleMatchInfo[]): Promise<TestRuleMatchInfo[]> {

        const condition = {nodeId, $or: []};
        const allAddPresentableNames = testRules.filter(x => x.ruleInfo.operation === TestNodeOperationEnum.Add).map(x => new RegExp(`^${x.ruleInfo.exhibitName}$`, 'i'));
        const allAddReleaseNames = testRules.filter(x => x.ruleInfo.operation === TestNodeOperationEnum.Add && x.ruleInfo.candidate?.type === TestResourceOriginType.Resource).map(x => new RegExp(`^${x.ruleInfo.candidate.name}$`, 'i'));

        if (!isEmpty(allAddPresentableNames)) {
            condition.$or.push({presentableName: {$in: allAddPresentableNames}});
        }
        if (!isEmpty(allAddReleaseNames)) {
            condition.$or.push({'resourceInfo.resourceName': {$in: allAddReleaseNames}});
        }
        if (isEmpty(condition.$or)) {
            return testRules;
        }

        const addOperationRules = testRules.filter(x => x.ruleInfo.operation === TestNodeOperationEnum.Add);
        const presentables = await this.presentableService.find(condition, 'presentableName resourceInfo');

        for (const {presentableName, resourceInfo} of presentables) {
            const existingPresentableNameRule = addOperationRules.find(x => this._isEqualStr(x.ruleInfo.exhibitName, presentableName));
            if (existingPresentableNameRule) {
                existingPresentableNameRule.matchErrors.push(this.ctx.gettext('reflect_rule_pre_excute_error_exhibit_name_existed', existingPresentableNameRule.ruleInfo.exhibitName));
            }
            const existingResourceNameRule = addOperationRules.find(x => x.ruleInfo.candidate?.type === TestResourceOriginType.Resource && this._isEqualStr(x.ruleInfo.candidate?.name, resourceInfo.resourceName));
            if (existingResourceNameRule) {
                const msg = this.ctx.gettext(existingResourceNameRule.ruleInfo.candidate.type === 'resource' ? 'reflect_rule_pre_excute_error_test_resource_existed' : 'reflect_rule_pre_excute_error_test_object_existed', existingResourceNameRule.ruleInfo.candidate.name);
                existingResourceNameRule.matchErrors.push(msg);
            }
        }

        return testRules;
    }

    _isEqualStr(x: string, y: string, ignoreLowerAndUpCase: boolean = true) {
        if (!isString(x) || !isString(y)) {
            return false;
        }
        return ignoreLowerAndUpCase ? x.toLowerCase() === y.toLowerCase() : x === y;
    }
}
