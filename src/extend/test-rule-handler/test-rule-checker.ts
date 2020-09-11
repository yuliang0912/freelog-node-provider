import {isEmpty, isString} from 'lodash';
import {provide, inject} from 'midway';
import {IPresentableService} from "../../interface";
import {TestNodeOperationEnum, TestResourceOriginType, TestRuleMatchInfo} from "../../test-node-interface";

@provide()
export class TestRuleChecker {

    @inject()
    presentableService: IPresentableService;

    /**
     * 批量检测导入规则中的presentableName是否已存在.以及导入的发行是否已经签约到正式节点中
     * @private
     */
    async checkImportPresentableNameAndResourceNameIsExist(nodeId: number, testRules: TestRuleMatchInfo[]): Promise<TestRuleMatchInfo[]> {

        const condition = {nodeId, $or: []};
        const allAddPresentableNames = testRules.filter(x => x.ruleInfo.operation === TestNodeOperationEnum.Add).map(x => new RegExp(`^${x.ruleInfo.presentableName}$`, 'i'));
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
            const existingPresentableNameRule = addOperationRules.find(x => this._isEqualStr(x.ruleInfo.presentableName, presentableName));
            if (existingPresentableNameRule) {
                existingPresentableNameRule.isValid = false;
                existingPresentableNameRule.matchErrors.push(`节点的已存在名称为${existingPresentableNameRule.ruleInfo.presentableName}的展品,规则无法生效`);
            }
            const existingResourceNameRule = addOperationRules.find(x => x.ruleInfo.candidate?.type === TestResourceOriginType.Resource && this._isEqualStr(x.ruleInfo.candidate?.name, resourceInfo.resourceName));
            if (existingResourceNameRule) {
                existingResourceNameRule.isValid = false;
                existingResourceNameRule.matchErrors.push(`节点中已存在引用资源名称为${existingResourceNameRule.ruleInfo.candidate.name}的展品,规则无法生效`);
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