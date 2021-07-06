import { BasePolicyInfo } from '../interface';
export declare class PolicyHelper {
    /**
     * 判定测试是否是免费的
     * 1.只有一个状态
     * 2.初始状态即授权状态
     * @param policyInfo
     */
    isFreePolicy(policyInfo: BasePolicyInfo): boolean;
}
