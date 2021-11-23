"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubjectAuthResult = exports.BreachResponsibilityTypeEnum = void 0;
/**
 * 授权码规则:
 * 以2开头的代表通过授权,例如200,201,202
 * 以3开头的代表标的物的合同方面存在问题或未通过授权
 * 以4开头的代表标的物本身存在问题,例如为找到标的物、标的物状态不对等错误
 * 以5开头的代表甲方或乙方存在问题,例如节点被冻结、未登陆(乙方用户认证失败)非法请求等错误
 * 以9开头代表API内部异常,例如内部API调用失败、代码异常、参数不全等错误
 */
const egg_freelog_base_1 = require("egg-freelog-base");
/**
 * 授权出错时的责任方
 */
var BreachResponsibilityTypeEnum;
(function (BreachResponsibilityTypeEnum) {
    /**
     * 无违约方
     */
    BreachResponsibilityTypeEnum[BreachResponsibilityTypeEnum["Default"] = 0] = "Default";
    /**
     * 资源方
     */
    BreachResponsibilityTypeEnum[BreachResponsibilityTypeEnum["Resource"] = 1] = "Resource";
    /**
     * 节点
     */
    BreachResponsibilityTypeEnum[BreachResponsibilityTypeEnum["Node"] = 2] = "Node";
    /**
     * C端消费者
     */
    BreachResponsibilityTypeEnum[BreachResponsibilityTypeEnum["ClientUser"] = 4] = "ClientUser";
    /**
     * 未知的
     */
    BreachResponsibilityTypeEnum[BreachResponsibilityTypeEnum["Unknown"] = 128] = "Unknown";
})(BreachResponsibilityTypeEnum = exports.BreachResponsibilityTypeEnum || (exports.BreachResponsibilityTypeEnum = {}));
class SubjectAuthResult {
    data = null;
    errorMsg = '';
    authCode = egg_freelog_base_1.SubjectAuthCodeEnum.Default;
    referee = egg_freelog_base_1.SubjectTypeEnum.Presentable;
    breachResponsibilityType = BreachResponsibilityTypeEnum.Default;
    constructor(authCode) {
        if (authCode) {
            this.authCode = authCode;
        }
    }
    setErrorMsg(errorMsg) {
        this.errorMsg = errorMsg;
        return this;
    }
    setData(data) {
        this.data = data;
        return this;
    }
    setReferee(subjectType) {
        this.referee = subjectType;
        return this;
    }
    // 设置违约责任类型(例如用户的责任,或者节点的责任,资源提供方的责任等等信息)
    setBreachResponsibilityType(breachResponsibilityType) {
        this.breachResponsibilityType = breachResponsibilityType;
        return this;
    }
    setAuthCode(authCode) {
        this.authCode = authCode;
        return this;
    }
    get isAuth() {
        return this.authCode >= 200 && this.authCode < 300;
    }
    toJSON() {
        return {
            referee: this.referee,
            breachResponsibilityType: this.breachResponsibilityType,
            authCode: this.authCode,
            isAuth: this.isAuth,
            data: this.data,
            errorMsg: this.errorMsg
        };
    }
}
exports.SubjectAuthResult = SubjectAuthResult;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0aC1pbnRlcmZhY2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvYXV0aC1pbnRlcmZhY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUE7Ozs7Ozs7R0FPRztBQUNILHVEQUEwRjtBQVcxRjs7R0FFRztBQUNILElBQVksNEJBMEJYO0FBMUJELFdBQVksNEJBQTRCO0lBRXBDOztPQUVHO0lBQ0gscUZBQVcsQ0FBQTtJQUVYOztPQUVHO0lBQ0gsdUZBQVksQ0FBQTtJQUVaOztPQUVHO0lBQ0gsK0VBQVEsQ0FBQTtJQUVSOztPQUVHO0lBQ0gsMkZBQWMsQ0FBQTtJQUVkOztPQUVHO0lBQ0gsdUZBQWEsQ0FBQTtBQUNqQixDQUFDLEVBMUJXLDRCQUE0QixHQUE1QixvQ0FBNEIsS0FBNUIsb0NBQTRCLFFBMEJ2QztBQUVELE1BQWEsaUJBQWlCO0lBRTFCLElBQUksR0FBRyxJQUFJLENBQUM7SUFDWixRQUFRLEdBQUcsRUFBRSxDQUFDO0lBQ2QsUUFBUSxHQUFHLHNDQUFtQixDQUFDLE9BQU8sQ0FBQztJQUN2QyxPQUFPLEdBQUcsa0NBQWUsQ0FBQyxXQUFXLENBQUM7SUFDdEMsd0JBQXdCLEdBQUcsNEJBQTRCLENBQUMsT0FBTyxDQUFDO0lBRWhFLFlBQVksUUFBOEI7UUFDdEMsSUFBSSxRQUFRLEVBQUU7WUFDVixJQUFJLENBQUMsUUFBUSxHQUFHLFFBQVEsQ0FBQztTQUM1QjtJQUNMLENBQUM7SUFFRCxXQUFXLENBQUMsUUFBZ0I7UUFDeEIsSUFBSSxDQUFDLFFBQVEsR0FBRyxRQUFRLENBQUM7UUFDekIsT0FBTyxJQUFJLENBQUM7SUFDaEIsQ0FBQztJQUVELE9BQU8sQ0FBQyxJQUFTO1FBQ2IsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUM7UUFDakIsT0FBTyxJQUFJLENBQUM7SUFDaEIsQ0FBQztJQUVELFVBQVUsQ0FBQyxXQUE0QjtRQUNuQyxJQUFJLENBQUMsT0FBTyxHQUFHLFdBQVcsQ0FBQztRQUMzQixPQUFPLElBQUksQ0FBQztJQUNoQixDQUFDO0lBRUQseUNBQXlDO0lBQ3pDLDJCQUEyQixDQUFDLHdCQUFzRDtRQUM5RSxJQUFJLENBQUMsd0JBQXdCLEdBQUcsd0JBQXdCLENBQUM7UUFDekQsT0FBTyxJQUFJLENBQUM7SUFDaEIsQ0FBQztJQUVELFdBQVcsQ0FBQyxRQUE2QjtRQUNyQyxJQUFJLENBQUMsUUFBUSxHQUFHLFFBQVEsQ0FBQztRQUN6QixPQUFPLElBQUksQ0FBQztJQUNoQixDQUFDO0lBRUQsSUFBSSxNQUFNO1FBQ04sT0FBTyxJQUFJLENBQUMsUUFBUSxJQUFJLEdBQUcsSUFBSSxJQUFJLENBQUMsUUFBUSxHQUFHLEdBQUcsQ0FBQztJQUN2RCxDQUFDO0lBRUQsTUFBTTtRQUNGLE9BQU87WUFDSCxPQUFPLEVBQUUsSUFBSSxDQUFDLE9BQU87WUFDckIsd0JBQXdCLEVBQUUsSUFBSSxDQUFDLHdCQUF3QjtZQUN2RCxRQUFRLEVBQUUsSUFBSSxDQUFDLFFBQVE7WUFDdkIsTUFBTSxFQUFFLElBQUksQ0FBQyxNQUFNO1lBQ25CLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSTtZQUNmLFFBQVEsRUFBRSxJQUFJLENBQUMsUUFBUTtTQUMxQixDQUFDO0lBQ04sQ0FBQztDQUNKO0FBdERELDhDQXNEQyJ9