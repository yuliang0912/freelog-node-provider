"use strict";
module.exports = {
    "params-format-validate-failed": "参数%s格式校验失败",
    "params-validate-failed": "参数%s校验失败",
    "params-required-validate-failed": "缺少必选参数",
    "params-comb-validate-failed": "组合参数%s校验失败",
    "params-relevance-validate-failed": "参数%s之间关联性校验失败",
    "user-authentication-failed": "用户认证失败,请登录",
    "user-authorization-failed": "授权失败,当前用户没有操作权限",
    "resource-entity-not-found": "未找到指定资源",
    "resource-invalid": "未找到有效资源",
    "node-entity-not-found": "未找到节点",
    "node-invalid": "未找到有效节点",
    "presentable-entity-not-found": "未找到节点资源",
    "presentable-invalid": "未找到有效节点资源",
    "contract-entity-not-found": "未找到合同",
    "contract-invalid": "未找到有效合同",
    "user-entity-not-found": "未找到用户信息",
    "user-invalid": "未找到有效用户信息",
    "user-node-count-limit-error": "用户可创建的节点数量超出限制",
    "node-name-has-already-existed": "节点名已经存在",
    "node-domain-has-already-existed": "节点域名已经存在",
    "custom-store-key-has-already-existed": "当前key已经存在,不能重复创建",
    "presentable-name-has-already-existed": "展品%s已经存在,不能重复创建",
    "presentable-release-repetition-create-error": "当前发行已经创建成节点资源,无法重复创建",
    "presentable-policy-offline-validate-error": "已上线的节点资源最少需要一个有效的授权策略",
    "presentable-online-policy-validate-error": "最少需要一个有效的授权策略才允许上线",
    "presentable-update-resolve-release-invalid-error": "解决的发行中存在无效的数据",
    "presentable-resolve-release-integrity-validate-failed": "presentable未全部解决所有上抛的发行",
    "release-policy-identity-authorization-failed": "待签约的发行策略未启用或身份对象校验不通过",
    "presentable-policy-create-duplicate-error": "presentable策略不能重复创建",
    "presentable-online-auth-validate-error": "授权链路未通过,不能上线",
    "node-test-rule-compile-failed": "测试节点的测试规则编译失败",
    "node-test-resolve-release-invalid-error": "解决的发行中存在无效的数据",
    "be-sign-subject-offline": "待签约的资源已下线",
    // 测试节点错误
    "reflect_rule_pre_excute_error_object_not_existed": "不存在名称为%s的对象",
    "reflect_rule_pre_excute_error_resource_not_existed": "不存在名称为%s的资源",
    "reflect_rule_pre_excute_error_exhibit_not_existed": "节点中不存在名称为%s的展品",
    "reflect_rule_pre_excute_error_access_limited": "当前账户没有该测试资源的操作权限：%s",
    "reflect_rule_pre_excute_error_no_resource_type": "对象%s导入失败，请先设置资源类型",
    "reflect_rule_pre_excute_error_test_resource_existed": "测试资源重复：%s",
    "reflect_rule_pre_excute_error_test_object_existed": "测试对象重复：%s",
    "reflect_rule_pre_excute_error_exhibit_name_existed": "展品名称已存在：%s",
    "reflect_rule_pre_excute_error_circular_rely": "不支持循环依赖：%s",
    "reflect_rule_pre_excute_error_duplicate_rely": "不允许重复依赖：%s",
    "reflect_rule_pre_excute_error_exceed_rely_limit": "依赖的嵌套层级超过限制",
    "reflect_rule_pre_excute_error_attribute_not_exist": "不存在键名称为%s的属性",
    "reflect_rule_pre_excute_error_attribute_access_limited": "属性删除指令只对展品属性生效：%s",
    "reflect_rule_pre_excute_error_value_access_limited": "属性%s的值不可修改",
    "reflect_rule_pre_excute_error_value_not_match": "选项%s的值不匹配",
    "reflect_rule_pre_excute_error_exhibit_not_theme": "展品%s不是主题资源，无法激活",
    "reflect_rule_pre_excute_error_version_invalid": "资源%s版本范围%s设置无效，版本不存在",
    "reflect_rule_pre_excute_error_show_hide_unavailable_for_theme": "上线/下线指令对主题展品不生效: %s",
    "auth_chain_200_msg": "授权通过",
    "auth_chain_201_msg": "授权通过",
    "auth_chain_202_msg": "授权通过",
    "auth_chain_203_msg": "授权通过",
    "auth_chain_301_msg": "合同未获得授权",
    "auth_chain_302_msg": "策略授权未通过",
    "auth_chain_303_msg": "标的物未签约,请签约后再试",
    "auth_chain_304_msg": "标的物合约已终止,请重签",
    "auth_chain_305_msg": "标的物合约无效",
    "auth_chain_306_msg": "标的物合约异常",
    "auth_chain_307_msg": "标的物未完成签约,可能因为数据异常导致",
    "auth_chain_401_msg": "标的物不存在",
    "auth_chain_402_msg": "未获得授权",
    "auth_chain_403_msg": "标的物状态异常,无法继续使用",
    "auth_chain_501_msg": "签约的前置条款校验不通过,无法签约",
    "auth_chain_502_msg": "未认证的用户,请登录",
    "auth_chain_503_msg": "用户没有访问权限",
    "auth_chain_504_msg": "甲方主体异常",
    "auth_chain_505_msg": "乙方主体异常",
    "auth_chain_900_msg": "授权接口异常",
    "auth_chain_901_msg": "授权请求参数错误",
    "auth_chain_902_msg": "授权数据校验失败错误",
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiemgtQ04uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvY29uZmlnL2xvY2FsZS96aC1DTi5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsTUFBTSxDQUFDLE9BQU8sR0FBRztJQUNiLCtCQUErQixFQUFFLFlBQVk7SUFDN0Msd0JBQXdCLEVBQUUsVUFBVTtJQUNwQyxpQ0FBaUMsRUFBRSxRQUFRO0lBQzNDLDZCQUE2QixFQUFFLFlBQVk7SUFDM0Msa0NBQWtDLEVBQUUsZUFBZTtJQUNuRCw0QkFBNEIsRUFBRSxZQUFZO0lBQzFDLDJCQUEyQixFQUFFLGlCQUFpQjtJQUM5QywyQkFBMkIsRUFBRSxTQUFTO0lBQ3RDLGtCQUFrQixFQUFFLFNBQVM7SUFDN0IsdUJBQXVCLEVBQUUsT0FBTztJQUNoQyxjQUFjLEVBQUUsU0FBUztJQUN6Qiw4QkFBOEIsRUFBRSxTQUFTO0lBQ3pDLHFCQUFxQixFQUFFLFdBQVc7SUFDbEMsMkJBQTJCLEVBQUUsT0FBTztJQUNwQyxrQkFBa0IsRUFBRSxTQUFTO0lBQzdCLHVCQUF1QixFQUFFLFNBQVM7SUFDbEMsY0FBYyxFQUFFLFdBQVc7SUFDM0IsNkJBQTZCLEVBQUUsZ0JBQWdCO0lBQy9DLCtCQUErQixFQUFFLFNBQVM7SUFDMUMsaUNBQWlDLEVBQUUsVUFBVTtJQUM3QyxzQ0FBc0MsRUFBRSxrQkFBa0I7SUFDMUQsc0NBQXNDLEVBQUUsaUJBQWlCO0lBQ3pELDZDQUE2QyxFQUFFLHNCQUFzQjtJQUNyRSwyQ0FBMkMsRUFBRSx1QkFBdUI7SUFDcEUsMENBQTBDLEVBQUUsb0JBQW9CO0lBQ2hFLGtEQUFrRCxFQUFFLGVBQWU7SUFDbkUsdURBQXVELEVBQUUseUJBQXlCO0lBQ2xGLDhDQUE4QyxFQUFFLHVCQUF1QjtJQUN2RSwyQ0FBMkMsRUFBRSxxQkFBcUI7SUFDbEUsd0NBQXdDLEVBQUUsY0FBYztJQUN4RCwrQkFBK0IsRUFBRSxlQUFlO0lBQ2hELHlDQUF5QyxFQUFFLGVBQWU7SUFDMUQseUJBQXlCLEVBQUUsV0FBVztJQUN0QyxTQUFTO0lBQ1Qsa0RBQWtELEVBQUUsYUFBYTtJQUNqRSxvREFBb0QsRUFBRSxhQUFhO0lBQ25FLG1EQUFtRCxFQUFFLGdCQUFnQjtJQUNyRSw4Q0FBOEMsRUFBRSxxQkFBcUI7SUFDckUsZ0RBQWdELEVBQUUsbUJBQW1CO0lBQ3JFLHFEQUFxRCxFQUFFLFdBQVc7SUFDbEUsbURBQW1ELEVBQUUsV0FBVztJQUNoRSxvREFBb0QsRUFBRSxZQUFZO0lBQ2xFLDZDQUE2QyxFQUFFLFlBQVk7SUFDM0QsOENBQThDLEVBQUUsWUFBWTtJQUM1RCxpREFBaUQsRUFBRSxhQUFhO0lBQ2hFLG1EQUFtRCxFQUFFLGNBQWM7SUFDbkUsd0RBQXdELEVBQUUsbUJBQW1CO0lBQzdFLG9EQUFvRCxFQUFFLFlBQVk7SUFDbEUsK0NBQStDLEVBQUUsV0FBVztJQUM1RCxpREFBaUQsRUFBRSxpQkFBaUI7SUFDcEUsK0NBQStDLEVBQUUsc0JBQXNCO0lBQ3ZFLCtEQUErRCxFQUFFLHFCQUFxQjtJQUV0RixvQkFBb0IsRUFBRSxNQUFNO0lBQzVCLG9CQUFvQixFQUFFLE1BQU07SUFDNUIsb0JBQW9CLEVBQUUsTUFBTTtJQUM1QixvQkFBb0IsRUFBRSxNQUFNO0lBQzVCLG9CQUFvQixFQUFFLFNBQVM7SUFDL0Isb0JBQW9CLEVBQUUsU0FBUztJQUMvQixvQkFBb0IsRUFBRSxlQUFlO0lBQ3JDLG9CQUFvQixFQUFFLGNBQWM7SUFDcEMsb0JBQW9CLEVBQUUsU0FBUztJQUMvQixvQkFBb0IsRUFBRSxTQUFTO0lBQy9CLG9CQUFvQixFQUFFLHFCQUFxQjtJQUMzQyxvQkFBb0IsRUFBRSxRQUFRO0lBQzlCLG9CQUFvQixFQUFFLE9BQU87SUFDN0Isb0JBQW9CLEVBQUUsZ0JBQWdCO0lBQ3RDLG9CQUFvQixFQUFFLG1CQUFtQjtJQUN6QyxvQkFBb0IsRUFBRSxZQUFZO0lBQ2xDLG9CQUFvQixFQUFFLFVBQVU7SUFDaEMsb0JBQW9CLEVBQUUsUUFBUTtJQUM5QixvQkFBb0IsRUFBRSxRQUFRO0lBQzlCLG9CQUFvQixFQUFFLFFBQVE7SUFDOUIsb0JBQW9CLEVBQUUsVUFBVTtJQUNoQyxvQkFBb0IsRUFBRSxZQUFZO0NBQ3JDLENBQUEifQ==