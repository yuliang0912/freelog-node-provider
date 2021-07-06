import {first} from 'lodash';
import {BasePolicyInfo} from '../interface';
import {provide, scope} from 'midway';
import {ScopeEnum} from 'injection';

@provide()
@scope(ScopeEnum.Singleton)
export class PolicyHelper {

    /**
     * 判定测试是否是免费的
     * 1.只有一个状态
     * 2.初始状态即授权状态
     * @param policyInfo
     */
    isFreePolicy(policyInfo: BasePolicyInfo): boolean {

        const stateDescriptionInfos = Object.values(policyInfo.fsmDescriptionInfo);
        if (stateDescriptionInfos.length !== 1) {
            return false;
        }

        const stateDescriptionInfo = first(stateDescriptionInfos);

        return stateDescriptionInfo.isAuth;
    }
}
