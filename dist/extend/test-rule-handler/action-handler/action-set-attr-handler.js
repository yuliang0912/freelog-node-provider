"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActionSetAttrHandler = void 0;
const midway_1 = require("midway");
const lodash_1 = require("lodash");
const injection_1 = require("injection");
let ActionSetAttrHandler = class ActionSetAttrHandler {
    /**
     * 替换自定义属性操作
     * @param ctx
     * @param testRuleInfo
     * @param action
     */
    async handle(ctx, testRuleInfo, action) {
        if (!(0, lodash_1.isObject)(action?.content)) {
            return false;
        }
        const propertyInfo = testRuleInfo.propertyMap.get(action.content.key);
        if (propertyInfo && (propertyInfo.authority & 2) !== 2) {
            testRuleInfo.matchErrors.push(ctx.gettext('reflect_rule_pre_excute_error_value_access_limited', action.content.key));
            return false;
        }
        testRuleInfo.propertyMap.set(action.content.key, {
            key: action.content.key,
            value: action.content.value,
            isRuleAdd: propertyInfo ? propertyInfo.isRuleAdd : true,
            authority: 6,
            remark: action.content.description
        });
        testRuleInfo.attrInfo = { source: testRuleInfo.id };
        return true;
        // if (readonlyPropertyMap.has(content.key)) {
        //     //         testRuleInfo.matchErrors.push(this.ctx.gettext('reflect_rule_pre_excute_error_value_access_limited', content.key));
        //     //         continue;
        //     //     }
        //     //     editablePropertyMap.set(content.key, {
        //     //         key: content.key,
        //     //         value: content.value,
        //     //         isRuleAdd: !editablePropertyKeys.has(content.key),
        //     //         authority: 6,
        //     //         remark: content.description
        //     //     });
        //
        //     if (isObject(testRuleInfo.readonlyPropertyMap) && Reflect.has(testRuleInfo.readonlyPropertyMap, deleteAttrKey)) {
        //         testRuleInfo.matchErrors.push(this.ctx.gettext('reflect_rule_pre_excute_error_value_access_limited', deleteAttrKey));
        //         return false;
        //     }
        //     if (isObject(testRuleInfo.editablePropertyMap)) {
        //         Reflect.deleteProperty(testRuleInfo.editablePropertyMap, deleteAttrKey);
        //     }
        //
        //     return true;
        // const readonlyPropertyMap = new Map<string, TestResourcePropertyInfo>();
        // const editablePropertyMap = new Map<string, TestResourcePropertyInfo>();
        // // 以下4个for循环需要严格遵守顺序.属性的优先级分别为1.系统属性 2:资源定义的不可编辑的属性 3:测试规则规定的属性 4:展品重写的属性 5:资源自定义的可编辑属性.
        // for (const [key, value] of Object.entries(testRuleInfo.rootResourceReplacer?.systemProperty ?? testRuleInfo.testResourceOriginInfo.systemProperty ?? {})) {
        //     readonlyPropertyMap.set(key, {key, value, authority: 1, remark: ''});
        // }
        // for (const {key, defaultValue, remark, type} of testRuleInfo.rootResourceReplacer?.customPropertyDescriptors ?? testRuleInfo.testResourceOriginInfo.customPropertyDescriptors ?? []) {
        //     if (readonlyPropertyMap.has(key)) {
        //         continue;
        //     }
        //     if (type === 'readonlyText') {
        //         readonlyPropertyMap.set(key, {key, value: defaultValue, authority: 1, remark});
        //     } else {
        //         editablePropertyMap.set(key, {key, value: defaultValue, authority: 2, remark});
        //     }
        // }
        // for (const {key, value, remark} of testRuleInfo?.presentableRewriteProperty ?? []) {
        //     if (readonlyPropertyMap.has(key)) {
        //         continue;
        //     }
        //     editablePropertyMap.set(key, {key, authority: 6, value, remark});
        // }
        // const editablePropertyKeys = new Set([...editablePropertyMap.keys()]);
        //
        // let hasExec = false;
        // for (const addAttrAction of ruleInfo.actions.filter(x => x.operation === ActionOperationEnum.AddAttr)) {
        //     hasExec = true;
        //     const content = addAttrAction.content as ContentAddAttr;
        //     if (readonlyPropertyMap.has(content.key)) {
        //         testRuleInfo.matchErrors.push(this.ctx.gettext('reflect_rule_pre_excute_error_value_access_limited', content.key));
        //         continue;
        //     }
        //     editablePropertyMap.set(content.key, {
        //         key: content.key,
        //         value: content.value,
        //         isRuleAdd: !editablePropertyKeys.has(content.key),
        //         authority: 6,
        //         remark: content.description
        //     });
        // }
        // for (const deleteAttrAction of ruleInfo.actions.filter(x => x.operation === ActionOperationEnum.DeleteAttr)) {
        //     hasExec = true;
        //     const content = deleteAttrAction.content as ContentDeleteAttr;
        //     const isReadonlyProperty = readonlyPropertyMap.has(content.key);
        //     if (isReadonlyProperty) {
        //         testRuleInfo.matchErrors.push(this.ctx.gettext('reflect_rule_pre_excute_error_attribute_access_limited', content.key));
        //     } else if (!editablePropertyMap.has(content.key)) {
        //         testRuleInfo.matchErrors.push(this.ctx.gettext('reflect_rule_pre_excute_error_attribute_not_exist', content.key));
        //     } else {
        //         editablePropertyMap.delete(content.key);
        //     }
        // }
        return true;
        // testRuleInfo.attrInfo = {
        //     attrs: [...readonlyPropertyMap.values(), ...editablePropertyMap.values()],
        //     source: hasExec ? testRuleInfo.id : null
        // };
        //
        // if (hasExec) {
        //     testRuleInfo.efficientInfos.push(this.setAttrOptionEfficientCountInfo);
        // }
    }
};
ActionSetAttrHandler = __decorate([
    (0, midway_1.provide)(),
    (0, midway_1.scope)(injection_1.ScopeEnum.Singleton)
], ActionSetAttrHandler);
exports.ActionSetAttrHandler = ActionSetAttrHandler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWN0aW9uLXNldC1hdHRyLWhhbmRsZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9zcmMvZXh0ZW5kL3Rlc3QtcnVsZS1oYW5kbGVyL2FjdGlvbi1oYW5kbGVyL2FjdGlvbi1zZXQtYXR0ci1oYW5kbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7OztBQUFBLG1DQUFzQztBQUt0QyxtQ0FBZ0M7QUFDaEMseUNBQW9DO0FBSXBDLElBQWEsb0JBQW9CLEdBQWpDLE1BQWEsb0JBQW9CO0lBRTdCOzs7OztPQUtHO0lBQ0gsS0FBSyxDQUFDLE1BQU0sQ0FBQyxHQUFtQixFQUFFLFlBQStCLEVBQUUsTUFBOEI7UUFFN0YsSUFBSSxDQUFDLElBQUEsaUJBQVEsRUFBQyxNQUFNLEVBQUUsT0FBTyxDQUFDLEVBQUU7WUFDNUIsT0FBTyxLQUFLLENBQUM7U0FDaEI7UUFFRCxNQUFNLFlBQVksR0FBRyxZQUFZLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ3RFLElBQUksWUFBWSxJQUFJLENBQUMsWUFBWSxDQUFDLFNBQVMsR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQUU7WUFDcEQsWUFBWSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxvREFBb0QsRUFBRSxNQUFNLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDckgsT0FBTyxLQUFLLENBQUM7U0FDaEI7UUFFRCxZQUFZLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRTtZQUM3QyxHQUFHLEVBQUUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxHQUFHO1lBQ3ZCLEtBQUssRUFBRSxNQUFNLENBQUMsT0FBTyxDQUFDLEtBQUs7WUFDM0IsU0FBUyxFQUFFLFlBQVksQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsSUFBSTtZQUN2RCxTQUFTLEVBQUUsQ0FBQztZQUNaLE1BQU0sRUFBRSxNQUFNLENBQUMsT0FBTyxDQUFDLFdBQVc7U0FDckMsQ0FBQyxDQUFDO1FBRUgsWUFBWSxDQUFDLFFBQVEsR0FBRyxFQUFDLE1BQU0sRUFBRSxZQUFZLENBQUMsRUFBRSxFQUFDLENBQUM7UUFDbEQsT0FBTyxJQUFJLENBQUM7UUFFWiw4Q0FBOEM7UUFDOUMscUlBQXFJO1FBQ3JJLDJCQUEyQjtRQUMzQixlQUFlO1FBQ2Ysb0RBQW9EO1FBQ3BELG1DQUFtQztRQUNuQyx1Q0FBdUM7UUFDdkMsb0VBQW9FO1FBQ3BFLCtCQUErQjtRQUMvQiw2Q0FBNkM7UUFDN0MsaUJBQWlCO1FBQ2pCLEVBQUU7UUFDRix3SEFBd0g7UUFDeEgsZ0lBQWdJO1FBQ2hJLHdCQUF3QjtRQUN4QixRQUFRO1FBQ1Isd0RBQXdEO1FBQ3hELG1GQUFtRjtRQUNuRixRQUFRO1FBQ1IsRUFBRTtRQUNGLG1CQUFtQjtRQUVuQiwyRUFBMkU7UUFDM0UsMkVBQTJFO1FBQzNFLDJGQUEyRjtRQUMzRiw4SkFBOEo7UUFDOUosNEVBQTRFO1FBQzVFLElBQUk7UUFDSix5TEFBeUw7UUFDekwsMENBQTBDO1FBQzFDLG9CQUFvQjtRQUNwQixRQUFRO1FBQ1IscUNBQXFDO1FBQ3JDLDBGQUEwRjtRQUMxRixlQUFlO1FBQ2YsMEZBQTBGO1FBQzFGLFFBQVE7UUFDUixJQUFJO1FBQ0osdUZBQXVGO1FBQ3ZGLDBDQUEwQztRQUMxQyxvQkFBb0I7UUFDcEIsUUFBUTtRQUNSLHdFQUF3RTtRQUN4RSxJQUFJO1FBQ0oseUVBQXlFO1FBQ3pFLEVBQUU7UUFDRix1QkFBdUI7UUFDdkIsMkdBQTJHO1FBQzNHLHNCQUFzQjtRQUN0QiwrREFBK0Q7UUFDL0Qsa0RBQWtEO1FBQ2xELDhIQUE4SDtRQUM5SCxvQkFBb0I7UUFDcEIsUUFBUTtRQUNSLDZDQUE2QztRQUM3Qyw0QkFBNEI7UUFDNUIsZ0NBQWdDO1FBQ2hDLDZEQUE2RDtRQUM3RCx3QkFBd0I7UUFDeEIsc0NBQXNDO1FBQ3RDLFVBQVU7UUFDVixJQUFJO1FBQ0osaUhBQWlIO1FBQ2pILHNCQUFzQjtRQUN0QixxRUFBcUU7UUFDckUsdUVBQXVFO1FBQ3ZFLGdDQUFnQztRQUNoQyxrSUFBa0k7UUFDbEksMERBQTBEO1FBQzFELDZIQUE2SDtRQUM3SCxlQUFlO1FBQ2YsbURBQW1EO1FBQ25ELFFBQVE7UUFDUixJQUFJO1FBRUosT0FBTyxJQUFJLENBQUM7UUFFWiw0QkFBNEI7UUFDNUIsaUZBQWlGO1FBQ2pGLCtDQUErQztRQUMvQyxLQUFLO1FBQ0wsRUFBRTtRQUNGLGlCQUFpQjtRQUNqQiw4RUFBOEU7UUFDOUUsSUFBSTtJQUNSLENBQUM7Q0FDSixDQUFBO0FBckhZLG9CQUFvQjtJQUZoQyxJQUFBLGdCQUFPLEdBQUU7SUFDVCxJQUFBLGNBQUssRUFBQyxxQkFBUyxDQUFDLFNBQVMsQ0FBQztHQUNkLG9CQUFvQixDQXFIaEM7QUFySFksb0RBQW9CIn0=